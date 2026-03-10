package com.belezza.api.dto.comissao;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissaoResumoResponse {

    private Long profissionalId;
    private String profissionalNome;
    private int totalServicos;
    private BigDecimal valorTotalServicos;
    private BigDecimal valorTotalComissoes;
    private int comissoesPendentes;
    private int comissoesPagas;
}
