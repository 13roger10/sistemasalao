package com.belezza.api.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Métricas de agendamentos.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentosDTO {

    // Total de agendamentos no período
    private int total;

    // Por status
    private int confirmados;
    private int concluidos;
    private int cancelados;
    private int noShow;
    private int pendentes;

    // Comparativo com período anterior
    private int totalPeriodoAnterior;
    private BigDecimal percentualVariacao;
    private boolean crescimento;

    // Taxa de comparecimento
    private BigDecimal taxaComparecimento;

    // Taxa de cancelamento
    private BigDecimal taxaCancelamento;

    // Mapa de agendamentos por hora (para gráfico de horários mais movimentados)
    private Map<Integer, Integer> porHora;
}
