package com.belezza.api.controller;

import com.belezza.api.dto.imagem.CaptionGenerateRequest;
import com.belezza.api.dto.imagem.CaptionResponse;
import com.belezza.api.dto.imagem.CaptionVariationsResponse;
import com.belezza.api.integration.CaptionAIService;
import com.belezza.api.security.annotation.Authenticated;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST Controller for AI-powered caption generation.
 * Provides endpoints for generating engaging social media captions.
 */
@RestController
@RequestMapping("/api/captions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Captions", description = "AI-powered caption generation endpoints")
public class CaptionController {

    private final CaptionAIService captionAIService;

    @PostMapping("/generate")
    @Authenticated
    @Operation(
        summary = "Generate caption",
        description = "Generate an AI-powered caption for a social media post. " +
                     "Tailored for beauty salon content with appropriate tone and hashtags."
    )
    public ResponseEntity<CaptionResponse> generate(
        @Valid @RequestBody CaptionGenerateRequest request
    ) {
        log.info("Generate caption request for platform: {}, service: {}",
            request.getPlataforma(), request.getTipoServico());

        CaptionAIService.CaptionRequest aiRequest = new CaptionAIService.CaptionRequest(
            request.getImageDescription(),
            request.getTipoServico(),
            request.getEstiloSalao(),
            request.getPlataforma(),
            request.getTom(),
            request.getIdioma()
        );

        CaptionAIService.CaptionResponse aiResponse = captionAIService.generate(aiRequest);

        CaptionResponse response = CaptionResponse.builder()
            .legenda(aiResponse.legenda())
            .hashtags(aiResponse.hashtags())
            .callToAction(aiResponse.callToAction())
            .engajamentoEstimado(aiResponse.engajamentoEstimado())
            .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate-variations")
    @Authenticated
    @Operation(
        summary = "Generate caption variations",
        description = "Generate multiple caption variations for A/B testing. " +
                     "Useful for finding the most engaging option."
    )
    public ResponseEntity<CaptionVariationsResponse> generateVariations(
        @Valid @RequestBody CaptionGenerateRequest request
    ) {
        log.info("Generate {} caption variations for platform: {}",
            request.getVariations(), request.getPlataforma());

        int count = Math.min(request.getVariations(), 5); // Max 5 variations

        CaptionAIService.CaptionRequest aiRequest = new CaptionAIService.CaptionRequest(
            request.getImageDescription(),
            request.getTipoServico(),
            request.getEstiloSalao(),
            request.getPlataforma(),
            request.getTom(),
            request.getIdioma()
        );

        List<CaptionAIService.CaptionResponse> aiResponses =
            captionAIService.generateVariations(aiRequest, count);

        List<CaptionResponse> variations = aiResponses.stream()
            .map(aiResponse -> CaptionResponse.builder()
                .legenda(aiResponse.legenda())
                .hashtags(aiResponse.hashtags())
                .callToAction(aiResponse.callToAction())
                .engajamentoEstimado(aiResponse.engajamentoEstimado())
                .build())
            .toList();

        CaptionVariationsResponse response = CaptionVariationsResponse.builder()
            .variations(variations)
            .count(variations.size())
            .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/styles")
    @Operation(
        summary = "Get available caption styles",
        description = "Returns the list of available tones/styles for caption generation"
    )
    public ResponseEntity<List<CaptionStyle>> getAvailableStyles() {
        List<CaptionStyle> styles = List.of(
            new CaptionStyle("profissional", "Profissional", "Tom formal e sofisticado"),
            new CaptionStyle("casual", "Casual", "Tom descontraído e amigável"),
            new CaptionStyle("divertido", "Divertido", "Tom alegre com emojis e humor"),
            new CaptionStyle("inspiracional", "Inspiracional", "Frases motivacionais e positivas"),
            new CaptionStyle("informativo", "Informativo", "Foco em benefícios e detalhes"),
            new CaptionStyle("promocional", "Promocional", "Foco em ofertas e chamadas para ação")
        );

        return ResponseEntity.ok(styles);
    }

    /**
     * DTO for caption style options.
     */
    public record CaptionStyle(String code, String name, String description) {}
}
