package com.belezza.api.entity;

/**
 * Tipo de meta do salão.
 */
public enum TipoMeta {
    FATURAMENTO("Faturamento", "R$"),
    ATENDIMENTOS("Atendimentos", "un"),
    NOVOS_CLIENTES("Novos Clientes", "un"),
    TICKET_MEDIO("Ticket Médio", "R$"),
    SERVICOS_TIPO("Serviços por Tipo", "un");

    private final String descricao;
    private final String unidade;

    TipoMeta(String descricao, String unidade) {
        this.descricao = descricao;
        this.unidade = unidade;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getUnidade() {
        return unidade;
    }
}
