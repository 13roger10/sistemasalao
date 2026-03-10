package com.belezza.api.entity;

/**
 * Payment methods accepted by salons.
 */
public enum FormaPagamento {

    DINHEIRO("Dinheiro"),
    CARTAO_CREDITO("Cartão de Crédito"),
    CARTAO_DEBITO("Cartão de Débito"),
    PIX("PIX"),
    VALE("Vale");

    private final String description;

    FormaPagamento(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
