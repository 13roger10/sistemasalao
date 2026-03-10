package com.belezza.api.entity;

/**
 * Social media platforms supported for publishing.
 */
public enum PlataformaSocial {

    INSTAGRAM("Instagram"),
    FACEBOOK("Facebook"),
    WHATSAPP_STATUS("WhatsApp Status");

    private final String description;

    PlataformaSocial(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
