package com.belezza.api.service;

import com.belezza.api.dto.imagem.*;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.integration.ImageAIService;
import com.belezza.api.integration.S3Service;
import com.belezza.api.repository.ImagemRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.util.ImageProcessor;
import com.belezza.api.util.ImageProcessor.AspectRatio;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing images in the Social Studio module.
 * Handles upload, AI processing, versioning, and storage management.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class ImageService {

    private final ImagemRepository imagemRepository;
    private final SalonRepository salonRepository;
    private final UsuarioRepository usuarioRepository;
    private final S3Service s3Service;
    private final ImageAIService imageAIService;
    private final ImageProcessor imageProcessor;

    private static final List<String> ALLOWED_TYPES = Arrays.asList(
        "image/jpeg", "image/jpg", "image/png", "image/webp"
    );
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    /**
     * Upload a new image.
     */
    public ImagemUploadResponse upload(Long salonId, Long usuarioId, MultipartFile file, String descricao) {
        // Validate file
        validateFile(file);

        // Get salon and usuario
        Salon salon = salonRepository.findById(salonId)
            .orElseThrow(() -> new ResourceNotFoundException("Salon not found"));

        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check storage limits
        checkStorageLimits(salon);

        try {
            // Upload original to S3
            String s3Key = s3Service.uploadFile(file, "originals/");
            String urlOriginal = s3Service.getPublicUrl(s3Key);

            // Generate and upload real thumbnail (300x300 center crop)
            byte[] thumbnailData = imageProcessor.generateThumbnail(file);
            String thumbnailKey = s3Service.uploadBytes(thumbnailData, "image/jpeg", "thumbnails/");
            String thumbnailUrl = s3Service.getPublicUrl(thumbnailKey);

            // Get image dimensions
            BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
            int largura = bufferedImage.getWidth();
            int altura = bufferedImage.getHeight();

            // Create entity
            Imagem imagem = Imagem.builder()
                .salon(salon)
                .criador(usuario)
                .urlOriginal(urlOriginal)
                .urlAtual(urlOriginal)
                .thumbnailUrl(thumbnailUrl)
                .nomeArquivo(file.getOriginalFilename())
                .tamanhoBytes(file.getSize())
                .tipoMime(file.getContentType())
                .largura(largura)
                .altura(altura)
                .descricao(descricao)
                .totalVersoes(1)
                .ativo(true)
                .build();

            imagem = imagemRepository.save(imagem);

            log.info("Image uploaded successfully: {}", imagem.getId());

            return mapToUploadResponse(imagem);

        } catch (IOException e) {
            log.error("Error uploading image: {}", e.getMessage(), e);
            throw new BusinessException("Failed to upload image: " + e.getMessage());
        }
    }

    /**
     * Get image by ID.
     */
    @Transactional(readOnly = true)
    public ImagemResponse getById(Long salonId, Long imagemId) {
        Salon salon = salonRepository.findById(salonId)
            .orElseThrow(() -> new ResourceNotFoundException("Salon not found"));

        Imagem imagem = imagemRepository.findByIdAndSalon(imagemId, salon)
            .orElseThrow(() -> new ResourceNotFoundException("Image not found"));

        return mapToResponse(imagem);
    }

    /**
     * List images by salon.
     */
    @Transactional(readOnly = true)
    public Page<ImagemResponse> listBySalon(Long salonId, Pageable pageable) {
        Salon salon = salonRepository.findById(salonId)
            .orElseThrow(() -> new ResourceNotFoundException("Salon not found"));

        Page<Imagem> imagens = imagemRepository.findBySalonAndAtivoTrue(salon, pageable);
        return imagens.map(this::mapToResponse);
    }

    /**
     * Enhance image quality using AI.
     */
    public ImagemResponse enhance(Long salonId, Long imagemId) {
        Imagem imagem = getImagemBySalonAndId(salonId, imagemId);

        try {
            // Process with AI
            String enhancedUrl = imageAIService.enhance(imagem.getUrlAtual());

            // Create version
            ImagemVersao versao = createVersion(imagem, enhancedUrl, "enhance", null);

            // Update current URL
            imagem.setUrlAtual(enhancedUrl);
            imagemRepository.save(imagem);

            log.info("Image enhanced successfully: {}", imagemId);

            return mapToResponse(imagem);

        } catch (Exception e) {
            log.error("Error enhancing image: {}", e.getMessage(), e);
            throw new BusinessException("Failed to enhance image: " + e.getMessage());
        }
    }

    /**
     * Remove background from image.
     */
    public ImagemResponse removeBackground(Long salonId, Long imagemId) {
        Imagem imagem = getImagemBySalonAndId(salonId, imagemId);

        try {
            String noBgUrl = imageAIService.removeBackground(imagem.getUrlAtual());

            ImagemVersao versao = createVersion(imagem, noBgUrl, "remove-background", null);

            imagem.setUrlAtual(noBgUrl);
            imagemRepository.save(imagem);

            log.info("Background removed successfully: {}", imagemId);

            return mapToResponse(imagem);

        } catch (Exception e) {
            log.error("Error removing background: {}", e.getMessage(), e);
            throw new BusinessException("Failed to remove background: " + e.getMessage());
        }
    }

    /**
     * Blur background of image.
     */
    public ImagemResponse blurBackground(Long salonId, Long imagemId, int intensity) {
        Imagem imagem = getImagemBySalonAndId(salonId, imagemId);

        try {
            String blurredUrl = imageAIService.blurBackground(imagem.getUrlAtual(), intensity);

            String params = "{\"intensity\": " + intensity + "}";
            ImagemVersao versao = createVersion(imagem, blurredUrl, "blur-background", params);

            imagem.setUrlAtual(blurredUrl);
            imagemRepository.save(imagem);

            log.info("Background blurred successfully: {}", imagemId);

            return mapToResponse(imagem);

        } catch (Exception e) {
            log.error("Error blurring background: {}", e.getMessage(), e);
            throw new BusinessException("Failed to blur background: " + e.getMessage());
        }
    }

    /**
     * Apply style to image.
     */
    public ImagemResponse applyStyle(Long salonId, Long imagemId, StyleType style) {
        Imagem imagem = getImagemBySalonAndId(salonId, imagemId);

        try {
            String styledUrl = imageAIService.applyStyle(imagem.getUrlAtual(), style);

            String params = "{\"style\": \"" + style.name() + "\"}";
            ImagemVersao versao = createVersion(imagem, styledUrl, "apply-style", params);

            imagem.setUrlAtual(styledUrl);
            imagemRepository.save(imagem);

            log.info("Style applied successfully: {}", imagemId);

            return mapToResponse(imagem);

        } catch (Exception e) {
            log.error("Error applying style: {}", e.getMessage(), e);
            throw new BusinessException("Failed to apply style: " + e.getMessage());
        }
    }

    /**
     * Upscale image resolution.
     */
    public ImagemResponse upscale(Long salonId, Long imagemId, int factor) {
        Imagem imagem = getImagemBySalonAndId(salonId, imagemId);

        try {
            String upscaledUrl = imageAIService.upscale(imagem.getUrlAtual(), factor);

            String params = "{\"factor\": " + factor + "}";
            ImagemVersao versao = createVersion(imagem, upscaledUrl, "upscale", params);

            imagem.setUrlAtual(upscaledUrl);
            imagem.setLargura(imagem.getLargura() * factor);
            imagem.setAltura(imagem.getAltura() * factor);
            imagemRepository.save(imagem);

            log.info("Image upscaled successfully: {}", imagemId);

            return mapToResponse(imagem);

        } catch (Exception e) {
            log.error("Error upscaling image: {}", e.getMessage(), e);
            throw new BusinessException("Failed to upscale image: " + e.getMessage());
        }
    }

    /**
     * Get all versions of an image.
     */
    @Transactional(readOnly = true)
    public List<ImagemVersaoResponse> getVersions(Long salonId, Long imagemId) {
        Imagem imagem = getImagemBySalonAndId(salonId, imagemId);

        return imagem.getVersoes().stream()
            .map(this::mapToVersaoResponse)
            .collect(Collectors.toList());
    }

    /**
     * Restore a specific version.
     */
    public ImagemResponse restoreVersion(Long salonId, Long imagemId, Long versaoId) {
        Imagem imagem = getImagemBySalonAndId(salonId, imagemId);

        ImagemVersao versao = imagem.getVersoes().stream()
            .filter(v -> v.getId().equals(versaoId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Version not found"));

        imagem.setUrlAtual(versao.getUrl());
        imagem.setLargura(versao.getLargura());
        imagem.setAltura(versao.getAltura());
        imagemRepository.save(imagem);

        log.info("Version restored successfully: {} to version {}", imagemId, versaoId);

        return mapToResponse(imagem);
    }

    /**
     * Delete image (soft delete).
     */
    public void delete(Long salonId, Long imagemId) {
        Imagem imagem = getImagemBySalonAndId(salonId, imagemId);

        imagem.setAtivo(false);
        imagemRepository.save(imagem);

        log.info("Image deleted (soft): {}", imagemId);
    }

    /**
     * Generate cropped versions for different social media platforms.
     * Creates versions for: Instagram Feed (1:1), Instagram Portrait (4:5),
     * Stories/Reels (9:16), and Facebook Cover (16:9).
     */
    public ImageVersionsResponse generateVersions(Long salonId, Long imagemId) {
        Imagem imagem = getImagemBySalonAndId(salonId, imagemId);

        try {
            // Download current image from URL
            byte[] imageData = downloadImage(imagem.getUrlAtual());
            String contentType = imagem.getTipoMime();

            Map<String, ImageVersionsResponse.ImageVersionInfo> versions = new LinkedHashMap<>();

            // Generate each aspect ratio version
            for (AspectRatio ratio : AspectRatio.values()) {
                try {
                    byte[] croppedData = imageProcessor.cropToRatio(imageData, contentType, ratio);
                    ImageProcessor.ImageDimensions dimensions = imageProcessor.getDimensions(croppedData);

                    // Upload to S3
                    String key = s3Service.uploadBytes(croppedData, "image/jpeg", "edited/");
                    String url = s3Service.getPublicUrl(key);

                    // Create version info
                    ImageVersionsResponse.ImageVersionInfo versionInfo = ImageVersionsResponse.ImageVersionInfo.builder()
                        .url(url)
                        .width(dimensions.width())
                        .height(dimensions.height())
                        .aspectRatio(ratio.name().toLowerCase())
                        .platform(ratio.getDescription())
                        .build();

                    versions.put(ratio.name().toLowerCase(), versionInfo);

                    // Save as image version
                    String params = "{\"aspectRatio\": \"" + ratio.name() + "\", \"platform\": \"" + ratio.getDescription() + "\"}";
                    ImagemVersao versao = ImagemVersao.builder()
                        .url(url)
                        .operacao("crop")
                        .parametros(params)
                        .tamanhoBytes((long) croppedData.length)
                        .largura(dimensions.width())
                        .altura(dimensions.height())
                        .numeroVersao(imagem.getTotalVersoes() + 1)
                        .build();
                    imagem.addVersao(versao);

                    log.debug("Generated {} version for image {}", ratio.name(), imagemId);

                } catch (Exception e) {
                    log.warn("Failed to generate {} version: {}", ratio.name(), e.getMessage());
                }
            }

            imagemRepository.save(imagem);

            log.info("Generated {} versions for image {}", versions.size(), imagemId);

            return ImageVersionsResponse.builder()
                .imageId(imagemId)
                .versions(versions)
                .build();

        } catch (Exception e) {
            log.error("Error generating versions: {}", e.getMessage(), e);
            throw new BusinessException("Failed to generate image versions: " + e.getMessage());
        }
    }

    /**
     * Download image from URL.
     */
    private byte[] downloadImage(String imageUrl) throws IOException {
        try (var inputStream = URI.create(imageUrl).toURL().openStream()) {
            return inputStream.readAllBytes();
        }
    }

    // Helper methods

    private Imagem getImagemBySalonAndId(Long salonId, Long imagemId) {
        Salon salon = salonRepository.findById(salonId)
            .orElseThrow(() -> new ResourceNotFoundException("Salon not found"));

        return imagemRepository.findByIdAndSalon(imagemId, salon)
            .orElseThrow(() -> new ResourceNotFoundException("Image not found"));
    }

    private ImagemVersao createVersion(Imagem imagem, String url, String operacao, String parametros) {
        ImagemVersao versao = ImagemVersao.builder()
            .url(url)
            .operacao(operacao)
            .parametros(parametros)
            .tamanhoBytes(imagem.getTamanhoBytes()) // Approximate
            .largura(imagem.getLargura())
            .altura(imagem.getAltura())
            .numeroVersao(imagem.getTotalVersoes() + 1)
            .build();

        imagem.addVersao(versao);
        return versao;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File is required");
        }

        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new BusinessException("Invalid file type. Allowed: JPEG, PNG, WebP");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("File size exceeds maximum of 10MB");
        }
    }

    private void checkStorageLimits(Salon salon) {
        long currentStorage = imagemRepository.calculateTotalStorageBytes(salon);
        long maxStorage = getMaxStorageForPlan(salon.getAdmin().getPlano());

        if (currentStorage >= maxStorage) {
            throw new BusinessException("Storage limit exceeded for plan: " + salon.getAdmin().getPlano());
        }
    }

    private long getMaxStorageForPlan(Plano plano) {
        return switch (plano) {
            case FREE -> 500L * 1024 * 1024; // 500 MB
            case PRO -> 5L * 1024 * 1024 * 1024; // 5 GB
            case PREMIUM -> 50L * 1024 * 1024 * 1024; // 50 GB
        };
    }

    // Mapping methods

    private ImagemUploadResponse mapToUploadResponse(Imagem imagem) {
        return ImagemUploadResponse.builder()
            .id(imagem.getId())
            .urlOriginal(imagem.getUrlOriginal())
            .urlAtual(imagem.getUrlAtual())
            .thumbnailUrl(imagem.getThumbnailUrl())
            .nomeArquivo(imagem.getNomeArquivo())
            .tamanhoBytes(imagem.getTamanhoBytes())
            .tipoMime(imagem.getTipoMime())
            .largura(imagem.getLargura())
            .altura(imagem.getAltura())
            .criadoEm(imagem.getCriadoEm())
            .build();
    }

    private ImagemResponse mapToResponse(Imagem imagem) {
        return ImagemResponse.builder()
            .id(imagem.getId())
            .salonId(imagem.getSalon().getId())
            .criadorId(imagem.getCriador().getId())
            .criadorNome(imagem.getCriador().getNome())
            .urlOriginal(imagem.getUrlOriginal())
            .urlAtual(imagem.getUrlAtual())
            .thumbnailUrl(imagem.getThumbnailUrl())
            .nomeArquivo(imagem.getNomeArquivo())
            .tamanhoBytes(imagem.getTamanhoBytes())
            .tipoMime(imagem.getTipoMime())
            .largura(imagem.getLargura())
            .altura(imagem.getAltura())
            .descricao(imagem.getDescricao())
            .totalVersoes(imagem.getTotalVersoes())
            .versoes(imagem.getVersoes().stream()
                .map(this::mapToVersaoResponse)
                .collect(Collectors.toList()))
            .criadoEm(imagem.getCriadoEm())
            .atualizadoEm(imagem.getAtualizadoEm())
            .build();
    }

    private ImagemVersaoResponse mapToVersaoResponse(ImagemVersao versao) {
        return ImagemVersaoResponse.builder()
            .id(versao.getId())
            .url(versao.getUrl())
            .operacao(versao.getOperacao())
            .parametros(versao.getParametros())
            .tamanhoBytes(versao.getTamanhoBytes())
            .largura(versao.getLargura())
            .altura(versao.getAltura())
            .numeroVersao(versao.getNumeroVersao())
            .criadoEm(versao.getCriadoEm())
            .build();
    }
}
