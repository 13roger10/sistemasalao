package com.belezza.api.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Serviço mais vendido.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServicoPopularDTO {

    private int posicao;
    private Long servicoId;
    private String nome;
    private String categoria;

    // Quantidade de vezes realizado
    private int quantidade;

    // Faturamento gerado
    private BigDecimal faturamento;
    private String faturamentoFormatado;

    // Percentual do total de atendimentos
    private BigDecimal percentualTotal;

    // Preço do serviço
    private BigDecimal preco;
    private String precoFormatado;
}
