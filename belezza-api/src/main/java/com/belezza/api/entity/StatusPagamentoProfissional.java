package com.belezza.api.entity;

/**
 * Professional payment status.
 */
public enum StatusPagamentoProfissional {

    PENDENTE("Pendente"),
    PROCESSANDO("Processando"),
    PAGO("Pago"),
    CANCELADO("Cancelado");

    private final String description;

    StatusPagamentoProfissional(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
