package com.belezza.api.dto.metricas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for scheduling metrics.
 * Contains aggregated statistics about appointments in a given period.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricasAgendamentoResponse {

    /**
     * Period identifier (e.g., "2024-01" for monthly, "2024-W01" for weekly)
     */
    private String periodo;

    /**
     * Total number of appointments in the period
     */
    private int total;

    /**
     * Number of completed appointments
     */
    private int concluidos;

    /**
     * Number of canceled appointments
     */
    private int cancelados;

    /**
     * Number of no-show appointments
     */
    private int noShows;

    /**
     * Completion rate percentage (0-100)
     */
    private double taxaConclusao;

    /**
     * Metrics broken down by professional
     */
    private List<MetricaPorProfissional> porProfissional;

    /**
     * Metrics broken down by service type
     */
    private List<MetricaPorServico> porServico;

    /**
     * Daily breakdown of appointments
     */
    private List<MetricaDiaria> evolucaoDiaria;

    /**
     * Metrics for a specific professional
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricaPorProfissional {
        private Long profissionalId;
        private String profissionalNome;
        private int totalAgendamentos;
        private int concluidos;
        private int cancelados;
        private int noShows;
        private double taxaConclusao;
    }

    /**
     * Metrics for a specific service
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricaPorServico {
        private Long servicoId;
        private String servicoNome;
        private int totalAgendamentos;
        private int concluidos;
        private double ticketMedio;
    }

    /**
     * Daily metrics
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricaDiaria {
        private String data; // ISO date format
        private int total;
        private int concluidos;
        private int cancelados;
    }
}
