package com.belezza.api.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Ranking de profissionais por faturamento.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RankingProfissionalDTO {

    private int posicao;
    private Long profissionalId;
    private String nome;
    private String fotoUrl;

    // Faturamento gerado
    private BigDecimal faturamento;
    private String faturamentoFormatado;

    // Quantidade de atendimentos
    private int atendimentos;

    // Ticket médio
    private BigDecimal ticketMedio;
    private String ticketMedioFormatado;

    // Avaliação média
    private BigDecimal avaliacaoMedia;

    // Comissão acumulada
    private BigDecimal comissaoTotal;
    private String comissaoTotalFormatada;
}
