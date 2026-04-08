package com.belezza.api.entity;

/**
 * Subtom de pele para análise de coloração.
 */
public enum SubtomPele {
    QUENTE("Quente", "Tons dourados, amarelados"),
    FRIO("Frio", "Tons rosados, azulados"),
    NEUTRO("Neutro", "Mistura de quente e frio"),
    OLIVA("Oliva", "Tons esverdeados");

    private final String descricao;
    private final String caracteristicas;

    SubtomPele(String descricao, String caracteristicas) {
        this.descricao = descricao;
        this.caracteristicas = caracteristicas;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getCaracteristicas() {
        return caracteristicas;
    }
}
