package com.belezza.api.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Métricas de comissões.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissoesDTO {

    // Total de comissões calculadas no período
    private BigDecimal totalCalculado;
    private String totalCalculadoFormatado;

    // Total de comissões pagas no período
    private BigDecimal totalPago;
    private String totalPagoFormatado;

    // Total de comissões pendentes
    private BigDecimal totalPendente;
    private String totalPendenteFormatado;

    // Quantidade de comissões
    private int quantidadeCalculadas;
    private int quantidadePagas;
    private int quantidadePendentes;
}
