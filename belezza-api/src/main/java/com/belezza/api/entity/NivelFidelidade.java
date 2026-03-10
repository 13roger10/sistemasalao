package com.belezza.api.entity;

/**
 * Niveis de fidelidade do cliente.
 */
public enum NivelFidelidade {
    BRONZE(0),
    PRATA(50),
    OURO(100);

    private final int pontosMinimos;

    NivelFidelidade(int pontosMinimos) {
        this.pontosMinimos = pontosMinimos;
    }

    public int getPontosMinimos() {
        return pontosMinimos;
    }

    public static NivelFidelidade calcularNivel(int pontos) {
        if (pontos >= OURO.pontosMinimos) return OURO;
        if (pontos >= PRATA.pontosMinimos) return PRATA;
        return BRONZE;
    }
}
