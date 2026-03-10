package com.belezza.api.integration;

import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.TipoServico;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for AI-powered caption generation using OpenAI API.
 * Generates engaging social media captions tailored to beauty salons.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CaptionAIService {

    @Value("${belezza.ai.openai.api-key:}")
    private String apiKey;

    @Value("${belezza.ai.openai.model:gpt-3.5-turbo}")
    private String model;

    @Value("${belezza.ai.openai.api-url:https://api.openai.com/v1}")
    private String apiUrl;

    private final ObjectMapper objectMapper;

    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    /**
     * Generate a caption for a social media post.
     *
     * @param request the caption generation request
     * @return the generated caption response
     */
    public CaptionResponse generate(CaptionRequest request) {
        validateApiKey();

        log.info("Generating caption for platform: {}, service: {}, tone: {}",
            request.plataforma(), request.tipoServico(), request.tom());

        String prompt = buildPrompt(request);

        try {
            WebClient webClient = WebClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(
                Map.of("role", "system", "content", getSystemPrompt()),
                Map.of("role", "user", "content", prompt)
            ));
            requestBody.put("temperature", 0.7);
            requestBody.put("max_tokens", 500);

            String responseJson = webClient.post()
                .uri("/chat/completions")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(TIMEOUT)
                .block();

            JsonNode responseNode = objectMapper.readTree(responseJson);
            String content = responseNode
                .get("choices")
                .get(0)
                .get("message")
                .get("content")
                .asText();

            return parseResponse(content);

        } catch (Exception e) {
            log.error("Error generating caption: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate caption: " + e.getMessage(), e);
        }
    }

    /**
     * Generate multiple caption variations.
     *
     * @param request the caption generation request
     * @param count   number of variations to generate
     * @return list of caption responses
     */
    public List<CaptionResponse> generateVariations(CaptionRequest request, int count) {
        List<CaptionResponse> variations = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            try {
                CaptionResponse response = generate(request);
                variations.add(response);
                Thread.sleep(500); // Rate limiting
            } catch (Exception e) {
                log.error("Error generating variation {}: {}", i + 1, e.getMessage());
            }
        }

        return variations;
    }

    private String getSystemPrompt() {
        return """
            Você é um especialista em marketing digital para salões de beleza.
            Sua tarefa é criar legendas envolventes e profissionais para posts em redes sociais.

            Diretrizes:
            - Use linguagem atrativa e persuasiva
            - Inclua emojis relevantes (mas não exagere)
            - Foque nos benefícios para o cliente
            - Crie um senso de urgência ou exclusividade quando apropriado
            - Mantenha o tom de voz consistente com a marca
            - As hashtags devem ser relevantes e populares no nicho de beleza
            - O CTA (call-to-action) deve ser claro e direto

            Retorne a resposta no seguinte formato JSON:
            {
              "legenda": "texto da legenda",
              "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
              "callToAction": "texto do CTA",
              "engajamentoEstimado": 85
            }
            """;
    }

    private String buildPrompt(CaptionRequest request) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("Crie uma legenda para um post sobre: ");
        prompt.append(request.imageDescription());
        prompt.append("\n\n");

        if (request.tipoServico() != null) {
            prompt.append("Tipo de serviço: ").append(getTipoServicoDescription(request.tipoServico())).append("\n");
        }

        if (request.estiloSalao() != null && !request.estiloSalao().isEmpty()) {
            prompt.append("Estilo do salão: ").append(request.estiloSalao()).append("\n");
        }

        prompt.append("Plataforma: ").append(getPlataformaDescription(request.plataforma())).append("\n");
        prompt.append("Tom de voz: ").append(request.tom()).append("\n");
        prompt.append("Idioma: ").append(request.idioma()).append("\n");

        return prompt.toString();
    }

    private String getTipoServicoDescription(TipoServico tipo) {
        return switch (tipo) {
            case CABELO -> "Tratamentos e cortes de cabelo";
            case UNHA -> "Manicure e pedicure";
            case MAQUIAGEM -> "Maquiagem profissional";
            case ESTETICA -> "Estética facial e corporal";
            case DEPILACAO -> "Depilação";
            case BARBA -> "Barbearia e cuidados masculinos";
            case SOBRANCELHA -> "Design de sobrancelhas";
            case MASSAGEM -> "Massagem terapêutica e relaxante";
            case OUTRO -> "Serviços de beleza diversos";
        };
    }

    private String getPlataformaDescription(PlataformaSocial plataforma) {
        return switch (plataforma) {
            case INSTAGRAM -> "Instagram (Feed ou Story)";
            case FACEBOOK -> "Facebook";
            case WHATSAPP_STATUS -> "WhatsApp Status";
        };
    }

    private CaptionResponse parseResponse(String content) {
        try {
            // Try to extract JSON from the response
            int jsonStart = content.indexOf("{");
            int jsonEnd = content.lastIndexOf("}") + 1;

            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                String jsonContent = content.substring(jsonStart, jsonEnd);
                JsonNode node = objectMapper.readTree(jsonContent);

                List<String> hashtags = new ArrayList<>();
                JsonNode hashtagsNode = node.get("hashtags");
                if (hashtagsNode != null && hashtagsNode.isArray()) {
                    hashtagsNode.forEach(tag -> hashtags.add(tag.asText()));
                }

                return new CaptionResponse(
                    node.get("legenda").asText(),
                    hashtags,
                    node.get("callToAction").asText(),
                    node.has("engajamentoEstimado") ? node.get("engajamentoEstimado").asInt() : 75
                );
            }

            // Fallback: use the content as caption
            log.warn("Could not parse JSON from AI response, using raw content");
            return new CaptionResponse(
                content,
                List.of("beleza", "salaosp", "transformacao"),
                "Agende seu horário! 📲",
                70
            );

        } catch (Exception e) {
            log.error("Error parsing AI response: {}", e.getMessage());
            throw new RuntimeException("Failed to parse AI response", e);
        }
    }

    private void validateApiKey() {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalStateException("OpenAI API key not configured. Check application.yml");
        }
    }

    // DTOs
    public record CaptionRequest(
        String imageDescription,
        TipoServico tipoServico,
        String estiloSalao,
        PlataformaSocial plataforma,
        String tom, // profissional, casual, divertido
        String idioma
    ) {
        public CaptionRequest {
            if (imageDescription == null || imageDescription.isEmpty()) {
                throw new IllegalArgumentException("Image description is required");
            }
            if (plataforma == null) {
                throw new IllegalArgumentException("Platform is required");
            }
            if (tom == null || tom.isEmpty()) {
                tom = "profissional";
            }
            if (idioma == null || idioma.isEmpty()) {
                idioma = "português";
            }
        }
    }

    public record CaptionResponse(
        String legenda,
        List<String> hashtags,
        String callToAction,
        int engajamentoEstimado
    ) {}
}
