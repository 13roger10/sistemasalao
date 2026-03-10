package com.belezza.api.entity;

/**
 * Types of services offered by beauty salons.
 */
public enum TipoServico {

    CABELO("Cabelo"),
    UNHA("Unha"),
    MAQUIAGEM("Maquiagem"),
    ESTETICA("Estética"),
    DEPILACAO("Depilação"),
    BARBA("Barba"),
    SOBRANCELHA("Sobrancelha"),
    MASSAGEM("Massagem"),
    OUTRO("Outro");

    private final String description;

    TipoServico(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
