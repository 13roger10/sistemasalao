package com.belezza.api.entity;

/**
 * Unidade de medida para produtos.
 */
public enum UnidadeMedida {
    UNIDADE("un", "Unidade"),
    MILILITRO("ml", "Mililitro"),
    LITRO("l", "Litro"),
    GRAMA("g", "Grama"),
    KILOGRAMA("kg", "Kilograma"),
    PACOTE("pct", "Pacote"),
    CAIXA("cx", "Caixa");

    private final String sigla;
    private final String descricao;

    UnidadeMedida(String sigla, String descricao) {
        this.sigla = sigla;
        this.descricao = descricao;
    }

    public String getSigla() {
        return sigla;
    }

    public String getDescricao() {
        return descricao;
    }
}
