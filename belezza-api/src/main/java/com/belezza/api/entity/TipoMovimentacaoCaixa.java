package com.belezza.api.entity;

/**
 * Movimentações manuais de um caixa, além dos pagamentos de atendimentos.
 */
public enum TipoMovimentacaoCaixa {
    /** Retirada de dinheiro da gaveta (ex.: levar ao banco). */
    SANGRIA,
    /** Entrada de dinheiro na gaveta sem venda (ex.: troco inicial extra). */
    SUPRIMENTO,
    /** Despesa paga com dinheiro do caixa ou outra forma. */
    DESPESA,
    /** Receita avulsa, sem atendimento vinculado (botão "Lançamento"). */
    RECEITA,
    /** Devolução ao cliente de um pagamento feito em um caixa já fechado. */
    ESTORNO
}
