package com.belezza.api.entity;

/**
 * Tipos de transacao no sistema de fidelidade.
 */
public enum TipoTransacaoFidelidade {
    VISITA,      // Incremento por visita/agendamento concluido
    RESGATE,     // Resgate de recompensa
    BONUS,       // Bonus manual ou promocional
    AJUSTE,      // Ajuste manual pelo admin
    EXPIRACAO    // Expiracao de pontos/creditos
}
