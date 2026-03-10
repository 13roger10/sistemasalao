package com.belezza.api.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Dashboard principal com métricas do salão.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    // Período do dashboard
    private LocalDate dataReferencia;
    private String periodo; // "DIARIO", "SEMANAL", "MENSAL"

    // Faturamento
    private FaturamentoDTO faturamento;

    // Agendamentos
    private AgendamentosDTO agendamentos;

    // Ranking de profissionais
    private List<RankingProfissionalDTO> rankingProfissionais;

    // Serviços mais vendidos
    private List<ServicoPopularDTO> servicosMaisVendidos;

    // Métricas de clientes
    private ClientesDTO clientes;

    // Comissões
    private ComissoesDTO comissoes;
}
