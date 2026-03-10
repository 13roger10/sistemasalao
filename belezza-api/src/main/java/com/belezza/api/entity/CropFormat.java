package com.belezza.api.entity;

/**
 * Enum representing different social media crop formats.
 */
public enum CropFormat {
    INSTAGRAM_SQUARE("1:1", "Instagram Feed", 1080, 1080),
    INSTAGRAM_PORTRAIT("4:5", "Instagram Portrait", 1080, 1350),
    INSTAGRAM_STORY("9:16", "Instagram Story/Reels", 1080, 1920),
    FACEBOOK_COVER("16:9", "Facebook Cover", 1920, 1080),
    FACEBOOK_POST("1:1", "Facebook Post", 1200, 1200),
    LINKEDIN_POST("1.91:1", "LinkedIn Post", 1200, 628),
    TWITTER_POST("16:9", "Twitter/X Post", 1200, 675);

    private final String ratio;
    private final String description;
    private final int width;
    private final int height;

    CropFormat(String ratio, String description, int width, int height) {
        this.ratio = ratio;
        this.description = description;
        this.width = width;
        this.height = height;
    }

    public String getRatio() {
        return ratio;
    }

    public String getDescription() {
        return description;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public double getAspectRatio() {
        return (double) width / height;
    }
}
