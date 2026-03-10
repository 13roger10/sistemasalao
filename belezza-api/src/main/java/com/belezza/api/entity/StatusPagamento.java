package com.belezza.api.entity;

/**
 * Payment processing status.
 */
public enum StatusPagamento {

    PENDENTE("Pendente"),
    APROVADO("Aprovado"),
    RECUSADO("Recusado"),
    ESTORNADO("Estornado");

    private final String description;

    StatusPagamento(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
