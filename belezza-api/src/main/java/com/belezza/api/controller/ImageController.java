package com.belezza.api.controller;

import com.belezza.api.dto.imagem.*;
import com.belezza.api.entity.StyleType;
import com.belezza.api.security.annotation.Authenticated;
import com.belezza.api.service.ImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * REST Controller for Image management in Social Studio.
 * Provides endpoints for upload, AI processing, and version management.
 */
@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Images", description = "Image management and AI processing endpoints")
public class ImageController {

    private final ImageService imageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Authenticated
    @Operation(summary = "Upload a new image", description = "Upload an image file to the system. Max size: 10MB. Formats: JPEG, PNG, WebP.")
    public ResponseEntity<ImagemUploadResponse> upload(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image file") @RequestParam("file") MultipartFile file,
        @Parameter(description = "Optional description") @RequestParam(required = false) String descricao,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        log.info("Upload request for salon: {}", salonId);

        Long usuarioId = extractUsuarioId(userDetails);
        ImagemUploadResponse response = imageService.upload(salonId, usuarioId, file, descricao);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Authenticated
    @Operation(summary = "Get image by ID", description = "Retrieve image details including all versions")
    public ResponseEntity<ImagemResponse> getById(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id
    ) {
        log.info("Get image: {} for salon: {}", id, salonId);

        ImagemResponse response = imageService.getById(salonId, id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Authenticated
    @Operation(summary = "List images", description = "List all images for a salon with pagination")
    public ResponseEntity<Page<ImagemResponse>> list(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable
    ) {
        log.info("List images for salon: {}", salonId);

        Page<ImagemResponse> response = imageService.listBySalon(salonId, pageable);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/enhance")
    @Authenticated
    @Operation(summary = "Enhance image", description = "Enhance image quality using AI (face restoration, denoising, etc.)")
    public ResponseEntity<ImagemResponse> enhance(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id
    ) {
        log.info("Enhance image: {} for salon: {}", id, salonId);

        ImagemResponse response = imageService.enhance(salonId, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/remove-background")
    @Authenticated
    @Operation(summary = "Remove background", description = "Remove background from image using AI")
    public ResponseEntity<ImagemResponse> removeBackground(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id
    ) {
        log.info("Remove background for image: {} in salon: {}", id, salonId);

        ImagemResponse response = imageService.removeBackground(salonId, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/blur-background")
    @Authenticated
    @Operation(summary = "Blur background", description = "Blur image background while keeping subject sharp")
    public ResponseEntity<ImagemResponse> blurBackground(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id,
        @Valid @RequestBody ImageProcessRequest request
    ) {
        log.info("Blur background for image: {} in salon: {} with intensity: {}",
            id, salonId, request.getBlurIntensity());

        int intensity = request.getBlurIntensity() != null ? request.getBlurIntensity() : 50;
        ImagemResponse response = imageService.blurBackground(salonId, id, intensity);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/apply-style")
    @Authenticated
    @Operation(summary = "Apply style", description = "Apply an artistic style to the image")
    public ResponseEntity<ImagemResponse> applyStyle(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id,
        @Valid @RequestBody ImageProcessRequest request
    ) {
        log.info("Apply style: {} to image: {} in salon: {}",
            request.getStyle(), id, salonId);

        StyleType style = request.getStyle() != null ? request.getStyle() : StyleType.NATURAL;
        ImagemResponse response = imageService.applyStyle(salonId, id, style);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/upscale")
    @Authenticated
    @Operation(summary = "Upscale image", description = "Increase image resolution using AI (2x or 4x)")
    public ResponseEntity<ImagemResponse> upscale(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id,
        @Valid @RequestBody ImageProcessRequest request
    ) {
        log.info("Upscale image: {} in salon: {} by factor: {}",
            id, salonId, request.getUpscaleFactor());

        int factor = request.getUpscaleFactor() != null ? request.getUpscaleFactor() : 2;
        ImagemResponse response = imageService.upscale(salonId, id, factor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/versions")
    @Authenticated
    @Operation(summary = "Get image versions", description = "Retrieve all edit versions of an image")
    public ResponseEntity<List<ImagemVersaoResponse>> getVersions(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id
    ) {
        log.info("Get versions for image: {} in salon: {}", id, salonId);

        List<ImagemVersaoResponse> versions = imageService.getVersions(salonId, id);
        return ResponseEntity.ok(versions);
    }

    @PostMapping("/{id}/restore/{versionId}")
    @Authenticated
    @Operation(summary = "Restore version", description = "Restore image to a specific version")
    public ResponseEntity<ImagemResponse> restoreVersion(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id,
        @Parameter(description = "Version ID") @PathVariable Long versionId
    ) {
        log.info("Restore image: {} to version: {} in salon: {}", id, versionId, salonId);

        ImagemResponse response = imageService.restoreVersion(salonId, id, versionId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Authenticated
    @Operation(summary = "Delete image", description = "Soft delete an image")
    public ResponseEntity<Void> delete(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id
    ) {
        log.info("Delete image: {} in salon: {}", id, salonId);

        imageService.delete(salonId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/generate-versions")
    @Authenticated
    @Operation(summary = "Generate image versions",
               description = "Generate cropped versions for different social media platforms: " +
                           "1:1 (Instagram Feed), 4:5 (Instagram Portrait), 9:16 (Stories/Reels), 16:9 (Facebook Cover)")
    public ResponseEntity<ImageVersionsResponse> generateVersions(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Image ID") @PathVariable Long id
    ) {
        log.info("Generate versions for image: {} in salon: {}", id, salonId);

        ImageVersionsResponse response = imageService.generateVersions(salonId, id);
        return ResponseEntity.ok(response);
    }

    // Helper method to extract usuario ID from authentication
    private Long extractUsuarioId(UserDetails userDetails) {
        // This would be extracted from your custom UserDetails implementation
        // For now, returning a placeholder
        // TODO: Implement proper user ID extraction
        return 1L;
    }
}
