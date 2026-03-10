package com.belezza.api.entity;

/**
 * Enum representing different AI style transformations for images.
 */
public enum StyleType {
    PROFESSIONAL("Professional", "Clean and polished look for business content"),
    ARTISTIC("Artistic", "Creative and stylized appearance"),
    VINTAGE("Vintage", "Retro and nostalgic aesthetic"),
    MODERN("Modern", "Contemporary and minimalist style"),
    GLAMOUR("Glamour", "High-fashion and sophisticated look"),
    NATURAL("Natural", "Soft and organic appearance"),
    DRAMATIC("Dramatic", "Bold contrast and intense colors"),
    SOFT("Soft", "Gentle and dreamy aesthetic");

    private final String displayName;
    private final String description;

    StyleType(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }
}
