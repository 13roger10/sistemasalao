package com.belezza.api.entity;

/**
 * Commission calculation type.
 */
public enum TipoComissao {

    PORCENTAGEM("Porcentagem"),
    FIXO("Valor Fixo");

    private final String description;

    TipoComissao(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
