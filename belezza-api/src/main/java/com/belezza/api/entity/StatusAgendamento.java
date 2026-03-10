package com.belezza.api.entity;

/**
 * Status of an appointment in the scheduling flow.
 */
public enum StatusAgendamento {

    PENDENTE("Pendente"),
    CONFIRMADO("Confirmado"),
    EM_ANDAMENTO("Em Andamento"),
    CONCLUIDO("Concluído"),
    CANCELADO("Cancelado"),
    NO_SHOW("Não Compareceu");

    private final String description;

    StatusAgendamento(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
