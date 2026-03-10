package com.belezza.api.entity;

/**
 * Commission status in the lifecycle.
 */
public enum StatusComissao {

    CALCULADA("Calculada"),
    PAGA("Paga"),
    CANCELADA("Cancelada");

    private final String description;

    StatusComissao(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
