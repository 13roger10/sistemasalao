package com.belezza.api.entity;

/**
 * Tipo de recorrência de uma tarefa do salão.
 */
public enum RecorrenciaTarefa {
    NENHUMA("Sem recorrência"),
    DIARIA("Diária"),
    SEMANAL("Semanal"),
    QUINZENAL("Quinzenal"),
    MENSAL("Mensal");

    private final String descricao;

    RecorrenciaTarefa(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
