package com.belezza.api.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Utility class for image processing operations.
 * Handles thumbnail generation and cropping for different social media formats.
 */
@Component
@Slf4j
public class ImageProcessor {

    private static final int THUMBNAIL_SIZE = 300;
    private static final String DEFAULT_FORMAT = "jpg";

    /**
     * Generate a thumbnail from the original image.
     * Resizes to 300x300 maintaining aspect ratio with center crop.
     *
     * @param file the original image file
     * @return byte array of the thumbnail
     */
    public byte[] generateThumbnail(MultipartFile file) throws IOException {
        BufferedImage originalImage = ImageIO.read(file.getInputStream());
        BufferedImage thumbnail = createSquareCrop(originalImage, THUMBNAIL_SIZE);
        return toByteArray(thumbnail, getFormat(file.getContentType()));
    }

    /**
     * Generate a thumbnail from raw bytes.
     *
     * @param imageData the original image data
     * @param contentType the image content type
     * @return byte array of the thumbnail
     */
    public byte[] generateThumbnail(byte[] imageData, String contentType) throws IOException {
        BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageData));
        BufferedImage thumbnail = createSquareCrop(originalImage, THUMBNAIL_SIZE);
        return toByteArray(thumbnail, getFormat(contentType));
    }

    /**
     * Crop an image to a specific aspect ratio.
     *
     * @param imageData the original image data
     * @param contentType the image content type
     * @param aspectRatio the aspect ratio as "width:height"
     * @return byte array of the cropped image
     */
    public byte[] cropToRatio(byte[] imageData, String contentType, AspectRatio aspectRatio) throws IOException {
        BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageData));
        BufferedImage cropped = cropToAspectRatio(originalImage, aspectRatio);
        return toByteArray(cropped, getFormat(contentType));
    }

    /**
     * Crop a MultipartFile to a specific aspect ratio.
     *
     * @param file the original image file
     * @param aspectRatio the aspect ratio
     * @return byte array of the cropped image
     */
    public byte[] cropToRatio(MultipartFile file, AspectRatio aspectRatio) throws IOException {
        BufferedImage originalImage = ImageIO.read(file.getInputStream());
        BufferedImage cropped = cropToAspectRatio(originalImage, aspectRatio);
        return toByteArray(cropped, getFormat(file.getContentType()));
    }

    /**
     * Crop image from URL bytes to aspect ratio.
     */
    public byte[] cropFromUrl(InputStream inputStream, AspectRatio aspectRatio) throws IOException {
        BufferedImage originalImage = ImageIO.read(inputStream);
        BufferedImage cropped = cropToAspectRatio(originalImage, aspectRatio);
        return toByteArray(cropped, DEFAULT_FORMAT);
    }

    /**
     * Get image dimensions.
     */
    public ImageDimensions getDimensions(byte[] imageData) throws IOException {
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageData));
        return new ImageDimensions(image.getWidth(), image.getHeight());
    }

    /**
     * Creates a square center crop of the image.
     */
    private BufferedImage createSquareCrop(BufferedImage original, int size) {
        int width = original.getWidth();
        int height = original.getHeight();
        int cropSize = Math.min(width, height);

        // Calculate crop position (center)
        int x = (width - cropSize) / 2;
        int y = (height - cropSize) / 2;

        // Crop to square
        BufferedImage cropped = original.getSubimage(x, y, cropSize, cropSize);

        // Resize to target size
        return resize(cropped, size, size);
    }

    /**
     * Crops image to specified aspect ratio (center crop).
     */
    private BufferedImage cropToAspectRatio(BufferedImage original, AspectRatio ratio) {
        int originalWidth = original.getWidth();
        int originalHeight = original.getHeight();

        double targetRatio = ratio.getRatioValue();
        double originalRatio = (double) originalWidth / originalHeight;

        int cropWidth, cropHeight;

        if (originalRatio > targetRatio) {
            // Image is wider than target, crop width
            cropHeight = originalHeight;
            cropWidth = (int) (originalHeight * targetRatio);
        } else {
            // Image is taller than target, crop height
            cropWidth = originalWidth;
            cropHeight = (int) (originalWidth / targetRatio);
        }

        // Center crop
        int x = (originalWidth - cropWidth) / 2;
        int y = (originalHeight - cropHeight) / 2;

        return original.getSubimage(x, y, cropWidth, cropHeight);
    }

    /**
     * Resize an image to the specified dimensions.
     */
    private BufferedImage resize(BufferedImage original, int width, int height) {
        BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = resized.createGraphics();

        // Set rendering hints for quality
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        g2d.drawImage(original, 0, 0, width, height, null);
        g2d.dispose();

        return resized;
    }

    /**
     * Convert BufferedImage to byte array.
     */
    private byte[] toByteArray(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, format, baos);
        return baos.toByteArray();
    }

    /**
     * Get image format from content type.
     */
    private String getFormat(String contentType) {
        if (contentType == null) {
            return DEFAULT_FORMAT;
        }
        return switch (contentType.toLowerCase()) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            default -> "jpg";
        };
    }

    /**
     * Aspect ratios for different social media platforms.
     */
    public enum AspectRatio {
        SQUARE_1_1(1, 1, "Instagram Feed"),
        PORTRAIT_4_5(4, 5, "Instagram Portrait"),
        STORY_9_16(9, 16, "Stories/Reels"),
        LANDSCAPE_16_9(16, 9, "Facebook Cover"),
        LANDSCAPE_1_91_1(1.91, 1, "Facebook Link Preview");

        private final double widthRatio;
        private final double heightRatio;
        private final String description;

        AspectRatio(double widthRatio, double heightRatio, String description) {
            this.widthRatio = widthRatio;
            this.heightRatio = heightRatio;
            this.description = description;
        }

        public double getRatioValue() {
            return widthRatio / heightRatio;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * Record for image dimensions.
     */
    public record ImageDimensions(int width, int height) {}
}
