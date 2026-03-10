package com.belezza.api.entity;

/**
 * Status of a social media post in the publishing flow.
 */
public enum StatusPost {

    RASCUNHO("Rascunho"),
    AGENDADO("Agendado"),
    PUBLICANDO("Publicando"),
    PUBLICADO("Publicado"),
    FALHOU("Falhou");

    private final String description;

    StatusPost(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
