package com.belezza.api.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Métricas de faturamento.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FaturamentoDTO {

    // Faturamento do período atual
    private BigDecimal valorTotal;
    private String valorTotalFormatado;

    // Comparativo com período anterior
    private BigDecimal valorPeriodoAnterior;
    private BigDecimal percentualVariacao;
    private boolean crescimento;

    // Faturamento por forma de pagamento
    private List<FaturamentoPorFormaPagamentoDTO> porFormaPagamento;

    // Ticket médio
    private BigDecimal ticketMedio;
    private String ticketMedioFormatado;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaturamentoPorFormaPagamentoDTO {
        private String formaPagamento;
        private BigDecimal valor;
        private String valorFormatado;
        private int quantidade;
        private BigDecimal percentual;
    }
}
