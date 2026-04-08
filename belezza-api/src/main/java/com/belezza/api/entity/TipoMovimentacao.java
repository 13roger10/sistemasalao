package com.belezza.api.entity;

/**
 * Tipo de movimentação de estoque.
 */
public enum TipoMovimentacao {
    ENTRADA("Entrada"),
    SAIDA("Saída"),
    AJUSTE("Ajuste");

    private final String descricao;

    TipoMovimentacao(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
