package com.belezza.api.entity;

/**
 * Tom de pele para análise de coloração.
 */
public enum TomPele {
    MUITO_CLARO("Muito Claro"),
    CLARO("Claro"),
    MEDIO("Médio"),
    MORENO_CLARO("Moreno Claro"),
    MORENO("Moreno"),
    MORENO_ESCURO("Moreno Escuro"),
    NEGRO("Negro");

    private final String descricao;

    TomPele(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
