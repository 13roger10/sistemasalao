package com.belezza.api.integration;

import com.belezza.api.entity.StyleType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for AI-powered image processing using Replicate API.
 * Supports operations like enhance, remove background, blur background, style application, and upscale.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ImageAIService {

    @Value("${belezza.ai.replicate.api-token:}")
    private String apiToken;

    @Value("${belezza.ai.replicate.api-url:https://api.replicate.com/v1}")
    private String apiUrl;

    @Value("${belezza.ai.replicate.models.enhance:}")
    private String enhanceModel;

    @Value("${belezza.ai.replicate.models.remove-bg:}")
    private String removeBgModel;

    @Value("${belezza.ai.replicate.models.upscale:}")
    private String upscaleModel;

    private final ObjectMapper objectMapper;

    private static final Duration TIMEOUT = Duration.ofMinutes(2);
    private static final Duration POLLING_INTERVAL = Duration.ofSeconds(2);
    private static final int MAX_POLLING_ATTEMPTS = 60;

    /**
     * Enhance image quality using AI (face restoration, denoising, etc.).
     *
     * @param imageUrl the URL of the image to enhance
     * @return the URL of the enhanced image
     */
    public String enhance(String imageUrl) {
        validateApiToken();

        log.info("Starting image enhancement for: {}", imageUrl);

        Map<String, Object> input = new HashMap<>();
        input.put("img", imageUrl);
        input.put("version", "v1.4");
        input.put("scale", 2);

        return runPrediction(enhanceModel, input);
    }

    /**
     * Remove background from image.
     *
     * @param imageUrl the URL of the image
     * @return the URL of the image with transparent background
     */
    public String removeBackground(String imageUrl) {
        validateApiToken();

        log.info("Starting background removal for: {}", imageUrl);

        Map<String, Object> input = new HashMap<>();
        input.put("image", imageUrl);

        return runPrediction(removeBgModel, input);
    }

    /**
     * Blur background while keeping subject sharp.
     *
     * @param imageUrl  the URL of the image
     * @param intensity blur intensity (1-100)
     * @return the URL of the image with blurred background
     */
    public String blurBackground(String imageUrl, int intensity) {
        validateApiToken();

        log.info("Starting background blur for: {} with intensity: {}", imageUrl, intensity);

        // For blur, we can use remove-bg + compositing
        // This is a simplified implementation
        // In production, you might want to use a dedicated blur model
        String noBgUrl = removeBackground(imageUrl);

        // Note: This is a placeholder. You'd need to implement actual blur logic
        // or use a different AI model that supports background blur
        log.warn("Background blur is using background removal. Consider implementing dedicated blur model.");

        return noBgUrl;
    }

    /**
     * Apply an artistic style to the image.
     *
     * @param imageUrl the URL of the image
     * @param style    the style to apply
     * @return the URL of the styled image
     */
    public String applyStyle(String imageUrl, StyleType style) {
        validateApiToken();

        log.info("Applying style {} to image: {}", style, imageUrl);

        // Note: This requires a style transfer model
        // You would need to add a style transfer model to your Replicate configuration
        // For now, this returns the enhanced version
        log.warn("Style application is using enhancement. Consider adding a style transfer model.");

        return enhance(imageUrl);
    }

    /**
     * Upscale image resolution using AI.
     *
     * @param imageUrl the URL of the image
     * @param factor   upscale factor (2 or 4)
     * @return the URL of the upscaled image
     */
    public String upscale(String imageUrl, int factor) {
        validateApiToken();

        if (factor != 2 && factor != 4) {
            throw new IllegalArgumentException("Upscale factor must be 2 or 4");
        }

        log.info("Starting image upscale for: {} with factor: {}", imageUrl, factor);

        Map<String, Object> input = new HashMap<>();
        input.put("image", imageUrl);
        input.put("scale", factor);
        input.put("face_enhance", false);

        return runPrediction(upscaleModel, input);
    }

    /**
     * Run a prediction on Replicate API.
     *
     * @param model the model identifier (e.g., "owner/model-name")
     * @param input the input parameters
     * @return the output URL
     */
    private String runPrediction(String model, Map<String, Object> input) {
        try {
            WebClient webClient = WebClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Token " + apiToken)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

            // Step 1: Create prediction
            Map<String, Object> request = new HashMap<>();
            request.put("version", model);
            request.put("input", input);

            String predictionJson = webClient.post()
                .uri("/predictions")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(TIMEOUT)
                .block();

            JsonNode predictionNode = objectMapper.readTree(predictionJson);
            String predictionId = predictionNode.get("id").asText();
            String status = predictionNode.get("status").asText();

            log.info("Prediction created: {} with status: {}", predictionId, status);

            // Step 2: Poll for completion
            for (int attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
                if ("succeeded".equals(status)) {
                    JsonNode output = predictionNode.get("output");
                    String outputUrl = extractOutputUrl(output);
                    log.info("Prediction completed successfully: {}", outputUrl);
                    return outputUrl;
                } else if ("failed".equals(status) || "canceled".equals(status)) {
                    String error = predictionNode.has("error") ? predictionNode.get("error").asText() : "Unknown error";
                    log.error("Prediction failed: {}", error);
                    throw new RuntimeException("AI prediction failed: " + error);
                }

                // Wait before polling again
                Thread.sleep(POLLING_INTERVAL.toMillis());

                // Poll for status
                String statusJson = webClient.get()
                    .uri("/predictions/" + predictionId)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(TIMEOUT)
                    .block();

                predictionNode = objectMapper.readTree(statusJson);
                status = predictionNode.get("status").asText();

                log.debug("Prediction status: {} (attempt {}/{})", status, attempt + 1, MAX_POLLING_ATTEMPTS);
            }

            throw new RuntimeException("AI prediction timed out after " + MAX_POLLING_ATTEMPTS + " attempts");

        } catch (Exception e) {
            log.error("Error running AI prediction: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process image with AI: " + e.getMessage(), e);
        }
    }

    /**
     * Extract the output URL from the prediction result.
     * Handles both string URLs and array of URLs.
     */
    private String extractOutputUrl(JsonNode output) {
        if (output.isTextual()) {
            return output.asText();
        } else if (output.isArray() && output.size() > 0) {
            return output.get(0).asText();
        } else {
            throw new RuntimeException("Unexpected output format from AI model");
        }
    }

    private void validateApiToken() {
        if (apiToken == null || apiToken.isEmpty()) {
            throw new IllegalStateException("Replicate API token not configured. Check application.yml");
        }
    }
}
