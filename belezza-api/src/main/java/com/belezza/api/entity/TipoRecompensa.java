package com.belezza.api.entity;

/**
 * Tipos de recompensa do programa de fidelidade.
 */
public enum TipoRecompensa {
    SERVICO_GRATIS,      // Servico gratuito (ex: 10 cortes = 1 gratis)
    DESCONTO_PERCENTUAL, // Desconto em percentual
    DESCONTO_VALOR       // Desconto em valor fixo
}
