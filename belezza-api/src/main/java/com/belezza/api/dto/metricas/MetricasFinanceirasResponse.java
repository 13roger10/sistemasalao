package com.belezza.api.dto.metricas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response DTO for financial metrics.
 * Contains revenue, payment method distribution, and financial evolution.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricasFinanceirasResponse {

    /**
     * Period identifier (e.g., "2024-01")
     */
    private String periodo;

    /**
     * Total gross revenue (sum of all completed appointments)
     */
    private BigDecimal totalBruto;

    /**
     * Total net revenue (after deductions, if any)
     */
    private BigDecimal totalLiquido;

    /**
     * Average ticket (total revenue / number of completed appointments)
     */
    private BigDecimal ticketMedio;

    /**
     * Number of completed appointments that generated revenue
     */
    private int totalAtendimentos;

    /**
     * Revenue broken down by payment method
     */
    private List<MetricaPorFormaPagamento> porFormaPagamento;

    /**
     * Revenue broken down by service type
     */
    private List<MetricaPorServico> porServico;

    /**
     * Revenue broken down by professional
     */
    private List<MetricaPorProfissional> porProfissional;

    /**
     * Monthly evolution of revenue
     */
    private List<EvolucaoMensal> evolucaoMensal;

    /**
     * Revenue for a specific payment method
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricaPorFormaPagamento {
        private String formaPagamento;
        private BigDecimal total;
        private int quantidade;
        private double percentual;
    }

    /**
     * Revenue for a specific service
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricaPorServico {
        private Long servicoId;
        private String servicoNome;
        private BigDecimal total;
        private int quantidade;
        private BigDecimal ticketMedio;
    }

    /**
     * Revenue for a specific professional
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricaPorProfissional {
        private Long profissionalId;
        private String profissionalNome;
        private BigDecimal total;
        private int quantidade;
        private BigDecimal ticketMedio;
    }

    /**
     * Monthly revenue evolution
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EvolucaoMensal {
        private String mes; // YYYY-MM format
        private BigDecimal totalBruto;
        private int quantidade;
        private BigDecimal ticketMedio;
        private double crescimentoPercentual; // % change from previous month
    }
}
