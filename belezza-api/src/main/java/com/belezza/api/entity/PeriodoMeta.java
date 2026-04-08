package com.belezza.api.entity;

/**
 * Período de uma meta.
 */
public enum PeriodoMeta {
    DIARIO("Diário"),
    SEMANAL("Semanal"),
    MENSAL("Mensal"),
    TRIMESTRAL("Trimestral"),
    ANUAL("Anual");

    private final String descricao;

    PeriodoMeta(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
