package com.belezza.api.integration.impl;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.WhatsAppMessage;
import com.belezza.api.entity.WhatsAppMessageStatus;
import com.belezza.api.integration.WhatsAppService;
import com.belezza.api.repository.WhatsAppMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Implementation of WhatsApp Business API integration using Meta Cloud API.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppServiceImpl implements WhatsAppService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final WhatsAppMessageRepository messageRepository;

    @Value("${belezza.whatsapp.phone-number-id:}")
    private String phoneNumberId;

    @Value("${belezza.whatsapp.access-token:}")
    private String accessToken;

    @Value("${belezza.whatsapp.api-version:v18.0}")
    private String apiVersion;

    @Value("${belezza.whatsapp.api-url:https://graph.facebook.com}")
    private String apiUrl;

    @Override
    public String enviarMensagem(String telefone, String templateName, Map<String, String> params) {
        try {
            String url = String.format("%s/%s/%s/messages", apiUrl, apiVersion, phoneNumberId);

            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", normalizarTelefone(telefone));
            payload.put("type", "template");

            // Build template object
            Map<String, Object> template = new HashMap<>();
            template.put("name", templateName);
            template.put("language", Map.of("code", "pt_BR"));

            // Build components with parameters
            if (params != null && !params.isEmpty()) {
                List<Map<String, Object>> components = List.of(
                    Map.of(
                        "type", "body",
                        "parameters", params.entrySet().stream()
                            .map(entry -> Map.of("type", "text", "text", entry.getValue()))
                            .toList()
                    )
                );
                template.put("components", components);
            }

            payload.put("template", template);

            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            log.info("Enviando mensagem WhatsApp para {} usando template {}", telefone, templateName);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, String>> messages = (List<Map<String, String>>) body.get("messages");
                if (messages != null && !messages.isEmpty()) {
                    String messageId = messages.get(0).get("id");
                    log.info("Mensagem enviada com sucesso. ID: {}", messageId);
                    return messageId;
                }
            }

            log.warn("Resposta inesperada da API WhatsApp: {}", response.getBody());
            return null;

        } catch (RestClientException e) {
            log.error("Erro ao enviar mensagem WhatsApp: {}", e.getMessage(), e);
            throw new RuntimeException("Falha ao enviar mensagem WhatsApp", e);
        }
    }

    @Override
    public String enviarMensagemDireta(String telefone, String mensagem) {
        String messageId = null;
        boolean success = false;
        String errorMsg = null;

        try {
            String url = String.format("%s/%s/%s/messages", apiUrl, apiVersion, phoneNumberId);

            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", normalizarTelefone(telefone));
            payload.put("type", "text");
            payload.put("text", Map.of("body", mensagem));

            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            log.info("Enviando mensagem direta WhatsApp para {}", telefone);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, String>> messages = (List<Map<String, String>>) body.get("messages");
                if (messages != null && !messages.isEmpty()) {
                    messageId = messages.get(0).get("id");
                    success = true;
                    log.info("Mensagem direta enviada com sucesso. ID: {}", messageId);
                }
            }

            if (!success) {
                log.warn("Resposta inesperada da API WhatsApp: {}", response.getBody());
            }

        } catch (RestClientException e) {
            errorMsg = e.getMessage();
            log.error("Erro ao enviar mensagem direta WhatsApp: {}", e.getMessage(), e);
        } finally {
            // Salvar log da mensagem no banco de dados
            saveMessageLogSimple(messageId, telefone, "text", null, mensagem, success, errorMsg);
        }

        if (!success && errorMsg != null) {
            throw new RuntimeException("Falha ao enviar mensagem direta WhatsApp: " + errorMsg);
        }

        return messageId;
    }

    @Override
    public String enviarImagem(String telefone, String imageUrl, String caption) {
        try {
            String url = String.format("%s/%s/%s/messages", apiUrl, apiVersion, phoneNumberId);

            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("to", normalizarTelefone(telefone));
            payload.put("type", "image");

            Map<String, String> image = new HashMap<>();
            image.put("link", imageUrl);
            if (caption != null && !caption.isEmpty()) {
                image.put("caption", caption);
            }
            payload.put("image", image);

            HttpHeaders headers = createHeaders();
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            log.info("Enviando imagem WhatsApp para {}", telefone);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, String>> messages = (List<Map<String, String>>) body.get("messages");
                if (messages != null && !messages.isEmpty()) {
                    String messageId = messages.get(0).get("id");
                    log.info("Imagem enviada com sucesso. ID: {}", messageId);
                    return messageId;
                }
            }

            log.warn("Resposta inesperada da API WhatsApp: {}", response.getBody());
            return null;

        } catch (RestClientException e) {
            log.error("Erro ao enviar imagem WhatsApp: {}", e.getMessage(), e);
            throw new RuntimeException("Falha ao enviar imagem WhatsApp", e);
        }
    }

    @Override
    public String enviarConfirmacaoAgendamento(
        String telefone,
        String nomeCliente,
        String data,
        String hora,
        String servico,
        String profissional,
        String endereco,
        String linkConfirmacao
    ) {
        // Gerar link de cancelamento a partir do link de confirmação
        String linkCancelamento = linkConfirmacao.replace("/confirmar-agendamento/", "/cancelar-agendamento/");

        String mensagem = String.format(
            """
            Olá %s! 👋

            Seu agendamento foi confirmado:
            📅 %s às %s
            💇 %s com %s
            📍 %s

            ✅ Confirmar presença: %s
            ❌ Cancelar agendamento: %s

            Aguardamos você!
            """,
            nomeCliente, data, hora, servico, profissional, endereco, linkConfirmacao, linkCancelamento
        );

        return enviarMensagemDireta(telefone, mensagem);
    }

    @Override
    public String enviarLembrete24h(
        String telefone,
        String nomeCliente,
        String data,
        String hora,
        String servico,
        String linkConfirmacao
    ) {
        // Gerar link de cancelamento a partir do link de confirmação
        String linkCancelamento = linkConfirmacao.replace("/confirmar-agendamento/", "/cancelar-agendamento/");

        String mensagem = String.format(
            """
            Olá %s! 🔔

            Lembrete: Você tem um agendamento amanhã!
            📅 %s às %s
            💇 %s

            ✅ Confirme sua presença: %s
            ❌ Precisa cancelar? %s

            Até breve!
            """,
            nomeCliente, data, hora, servico, linkConfirmacao, linkCancelamento
        );

        return enviarMensagemDireta(telefone, mensagem);
    }

    @Override
    public String enviarLembrete2h(
        String telefone,
        String nomeCliente,
        String hora,
        String servico,
        String endereco
    ) {
        String mensagem = String.format(
            """
            Olá %s! ⏰

            Seu horário está chegando!
            ⏰ Daqui a 2 horas: %s
            💇 %s
            📍 %s

            Aguardamos você!
            """,
            nomeCliente, hora, servico, endereco
        );

        return enviarMensagemDireta(telefone, mensagem);
    }

    @Override
    public String enviarPosAtendimento(
        String telefone,
        String nomeCliente,
        String linkAvaliacao
    ) {
        String mensagem = String.format(
            """
            Olá %s! 😊

            Obrigado pela visita!

            Que tal avaliar nosso atendimento?
            ⭐ %s

            Sua opinião é muito importante para nós!
            """,
            nomeCliente, linkAvaliacao
        );

        return enviarMensagemDireta(telefone, mensagem);
    }

    @Override
    public String enviarCancelamento(
        String telefone,
        String nomeCliente,
        String data,
        String hora,
        String servico,
        String motivoCancelamento,
        String linkReagendar
    ) {
        String motivo = motivoCancelamento != null && !motivoCancelamento.isEmpty()
            ? motivoCancelamento
            : "Não informado";

        String mensagem = String.format(
            """
            Olá %s! 😔

            Seu agendamento foi cancelado:
            📅 %s às %s
            💇 %s

            Motivo: %s

            Que tal reagendar?
            📅 %s

            Esperamos vê-lo(a) em breve!
            """,
            nomeCliente, data, hora, servico, motivo, linkReagendar
        );

        return enviarMensagemDireta(telefone, mensagem);
    }

    /**
     * Normalize phone number to international format.
     * Removes spaces, dashes, parentheses, and ensures it starts with +
     */
    private String normalizarTelefone(String telefone) {
        if (telefone == null) {
            return null;
        }

        // Remove all non-numeric characters except +
        String normalized = telefone.replaceAll("[^+\\d]", "");

        // Ensure it starts with +
        if (!normalized.startsWith("+")) {
            normalized = "+" + normalized;
        }

        return normalized;
    }

    /**
     * Create HTTP headers with authorization.
     */
    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        return headers;
    }

    /**
     * Save message log to database.
     */
    private void saveMessageLog(
        String messageId,
        String telefone,
        String tipo,
        String templateName,
        String conteudo,
        Agendamento agendamento,
        Salon salon
    ) {
        try {
            WhatsAppMessage message = WhatsAppMessage.builder()
                .messageId(messageId)
                .telefone(normalizarTelefone(telefone))
                .tipo(tipo)
                .templateName(templateName)
                .conteudo(conteudo)
                .status(messageId != null ? WhatsAppMessageStatus.SENT : WhatsAppMessageStatus.FAILED)
                .agendamento(agendamento)
                .salon(salon)
                .tentativas(1)
                .build();

            messageRepository.save(message);
            log.debug("Mensagem WhatsApp registrada no banco: {}", messageId);
        } catch (Exception e) {
            log.error("Erro ao salvar log de mensagem WhatsApp: {}", e.getMessage(), e);
        }
    }

    /**
     * Save message log to database (simplified version without Agendamento/Salon).
     */
    private void saveMessageLogSimple(
        String messageId,
        String telefone,
        String tipo,
        String templateName,
        String conteudo,
        boolean success,
        String errorMessage
    ) {
        try {
            WhatsAppMessage message = WhatsAppMessage.builder()
                .messageId(messageId)
                .telefone(normalizarTelefone(telefone))
                .tipo(tipo)
                .templateName(templateName)
                .conteudo(conteudo != null && conteudo.length() > 4000 ? conteudo.substring(0, 4000) : conteudo)
                .status(success ? WhatsAppMessageStatus.SENT : WhatsAppMessageStatus.FAILED)
                .errorMessage(errorMessage)
                .tentativas(1)
                .build();

            messageRepository.save(message);
            log.debug("Mensagem WhatsApp registrada no banco: {} - Status: {}", messageId, success ? "SENT" : "FAILED");
        } catch (Exception e) {
            log.error("Erro ao salvar log de mensagem WhatsApp: {}", e.getMessage(), e);
        }
    }
}
