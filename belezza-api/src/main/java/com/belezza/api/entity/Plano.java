package com.belezza.api.entity;

/**
 * Subscription plans for the Belezza system.
 */
public enum Plano {

    FREE("Gratuito"),
    PRO("Profissional"),
    PREMIUM("Premium");

    private final String description;

    Plano(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
