package com.belezza.api.entity;

/**
 * Motivo de uma movimentação de estoque.
 */
public enum MotivoMovimentacao {
    COMPRA("Compra de fornecedor"),
    USO_SERVICO("Uso em serviço"),
    AJUSTE_MANUAL("Ajuste manual"),
    PERDA("Perda/Quebra"),
    DEVOLUCAO("Devolução"),
    TRANSFERENCIA("Transferência"),
    VENDA("Venda direta"),
    INVENTARIO("Contagem de inventário");

    private final String descricao;

    MotivoMovimentacao(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
