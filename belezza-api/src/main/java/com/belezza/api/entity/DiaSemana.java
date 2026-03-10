package com.belezza.api.entity;

/**
 * Days of the week for work schedules.
 */
public enum DiaSemana {

    SEGUNDA("Segunda-feira"),
    TERCA("Terça-feira"),
    QUARTA("Quarta-feira"),
    QUINTA("Quinta-feira"),
    SEXTA("Sexta-feira"),
    SABADO("Sábado"),
    DOMINGO("Domingo");

    private final String description;

    DiaSemana(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
