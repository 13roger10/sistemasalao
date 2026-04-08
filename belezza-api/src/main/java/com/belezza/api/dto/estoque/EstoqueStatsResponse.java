package com.belezza.api.dto.estoque;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EstoqueStatsResponse {

    private long totalProdutos;
    private long produtosEstoqueBaixo;
    private long produtosSemEstoque;
    private BigDecimal valorTotalEstoque;
    private long alertasNaoReconhecidos;
    private List<MovimentacaoResponse> movimentacoesRecentes;
    private List<ProdutoResponse> produtosMaisUsados;
}
