package com.belezza.api.entity;

/**
 * Tipo de cabelo do cliente.
 */
public enum TipoCabelo {
    LISO("Liso", "1"),
    ONDULADO("Ondulado", "2"),
    CACHEADO("Cacheado", "3"),
    CRESPO("Crespo", "4");

    private final String descricao;
    private final String categoria;

    TipoCabelo(String descricao, String categoria) {
        this.descricao = descricao;
        this.categoria = categoria;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getCategoria() {
        return categoria;
    }
}
