package com.belezza.api.dto.imagem;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Response DTO for generated image versions (different aspect ratios).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageVersionsResponse {

    private Long imageId;

    /**
     * Map of aspect ratio to URL.
     * Keys: "square_1_1", "portrait_4_5", "story_9_16", "landscape_16_9"
     */
    private Map<String, ImageVersionInfo> versions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageVersionInfo {
        private String url;
        private int width;
        private int height;
        private String aspectRatio;
        private String platform;
    }
}
