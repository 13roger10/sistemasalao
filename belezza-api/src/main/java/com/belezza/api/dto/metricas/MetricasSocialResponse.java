package com.belezza.api.dto.metricas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for social media engagement metrics.
 * Contains statistics about posts, engagement, and best performing content.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricasSocialResponse {

    /**
     * Period identifier (e.g., "2024-01")
     */
    private String periodo;

    /**
     * Total number of posts published in the period
     */
    private int postsPublicados;

    /**
     * Total number of likes across all posts
     */
    private int totalCurtidas;

    /**
     * Total number of comments across all posts
     */
    private int totalComentarios;

    /**
     * Total number of shares across all posts
     */
    private int totalCompartilhamentos;

    /**
     * Total reach (unique users who saw the content)
     */
    private int alcanceTotal;

    /**
     * Average engagement rate (%)
     * Formula: (likes + comments + shares) / reach * 100
     */
    private double engajamentoMedio;

    /**
     * Best time to post (hour in HH:mm format)
     */
    private String melhorHorario;

    /**
     * Best day of the week to post
     */
    private String melhorDia;

    /**
     * Engagement by platform
     */
    private List<MetricaPorPlataforma> porPlataforma;

    /**
     * Top performing posts
     */
    private List<TopPost> topPosts;

    /**
     * Engagement evolution over time
     */
    private List<EngajamentoDiario> evolucaoDiaria;

    /**
     * Distribution of posts by hour of day
     */
    private Map<Integer, Integer> distribuicaoPorHora;

    /**
     * Distribution of posts by day of week (0=Sunday, 6=Saturday)
     */
    private Map<Integer, Integer> distribuicaoPorDia;

    /**
     * Metrics for a specific platform
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricaPorPlataforma {
        private String plataforma;
        private int postsPublicados;
        private int totalCurtidas;
        private int totalComentarios;
        private int totalCompartilhamentos;
        private int alcanceTotal;
        private double engajamentoMedio;
    }

    /**
     * Top performing post
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopPost {
        private Long postId;
        private String imagemUrl;
        private String legenda;
        private int curtidas;
        private int comentarios;
        private int compartilhamentos;
        private int alcance;
        private double engajamentoRate;
        private String publicadoEm;
    }

    /**
     * Daily engagement metrics
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EngajamentoDiario {
        private String data;
        private int posts;
        private int curtidas;
        private int comentarios;
        private int compartilhamentos;
        private int alcance;
        private double engajamentoRate;
    }
}
