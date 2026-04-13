package com.belezza.api.controller;

import com.belezza.api.dto.auth.*;
import com.belezza.api.entity.Usuario;
import com.belezza.api.service.TwoFactorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for Two-Factor Authentication (2FA) management.
 *
 * Flow:
 * 1. POST /setup  — generates QR code for Google Authenticator / Authy
 * 2. POST /enable — user confirms with TOTP code; receives 10 backup codes
 * 3. POST /disable — user disables 2FA confirming with TOTP code
 * 4. POST /backup-codes/regenerate — generates new backup codes
 * 5. GET  /status — returns current 2FA status
 */
@RestController
@RequestMapping("/api/2fa")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Two-Factor Authentication", description = "2FA management using TOTP (Google Authenticator / Authy)")
public class TwoFactorController {

    private final TwoFactorService twoFactorService;

    @PostMapping("/setup")
    @Operation(
        summary = "Initiate 2FA setup",
        description = "Generates a TOTP secret and returns a QR code URI to scan in Google Authenticator or Authy. " +
                      "2FA is NOT enabled yet — call /enable to confirm."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "QR code generated successfully"),
        @ApiResponse(responseCode = "400", description = "2FA already enabled"),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    public ResponseEntity<TwoFactorSetupResponse> setup(
            @AuthenticationPrincipal Usuario usuario) {

        log.info("2FA setup requested by user: {}", usuario.getId());
        String qrCodeUri = twoFactorService.setupTwoFactor(usuario.getId());

        return ResponseEntity.ok(TwoFactorSetupResponse.builder()
                .qrCodeUri(qrCodeUri)
                .message("Escaneie o QR Code no Google Authenticator ou Authy e confirme com o código gerado.")
                .build());
    }

    @PostMapping("/enable")
    @Operation(
        summary = "Enable 2FA",
        description = "Confirms 2FA activation by validating the first TOTP code from the authenticator app. " +
                      "Returns 10 one-time backup codes — store them safely."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "2FA enabled. Backup codes returned."),
        @ApiResponse(responseCode = "400", description = "Invalid TOTP code or 2FA not configured"),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    public ResponseEntity<Map<String, Object>> enable(
            @AuthenticationPrincipal Usuario usuario,
            @Valid @RequestBody TwoFactorCodeRequest request) {

        log.info("2FA enable requested by user: {}", usuario.getId());
        List<String> backupCodes = twoFactorService.enableTwoFactor(usuario.getId(), request.getCode());

        return ResponseEntity.ok(Map.of(
                "message", "2FA ativado com sucesso! Guarde os códigos de backup em local seguro.",
                "backupCodes", backupCodes
        ));
    }

    @PostMapping("/disable")
    @Operation(
        summary = "Disable 2FA",
        description = "Disables 2FA after validating the current TOTP code from the authenticator app."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "2FA disabled successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid TOTP code or 2FA not active"),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    public ResponseEntity<Map<String, String>> disable(
            @AuthenticationPrincipal Usuario usuario,
            @Valid @RequestBody TwoFactorCodeRequest request) {

        log.info("2FA disable requested by user: {}", usuario.getId());
        twoFactorService.disableTwoFactor(usuario.getId(), request.getCode());

        return ResponseEntity.ok(Map.of("message", "2FA desativado com sucesso."));
    }

    @GetMapping("/status")
    @Operation(
        summary = "Get 2FA status",
        description = "Returns whether 2FA is enabled and how many backup codes remain unused."
    )
    @ApiResponse(responseCode = "200", description = "Status retrieved")
    public ResponseEntity<TwoFactorStatusResponse> status(
            @AuthenticationPrincipal Usuario usuario) {

        long remaining = usuario.isTotpEnabled()
                ? twoFactorService.countRemainingBackupCodes(usuario.getId())
                : 0;

        return ResponseEntity.ok(TwoFactorStatusResponse.builder()
                .enabled(usuario.isTotpEnabled())
                .remainingBackupCodes(remaining)
                .build());
    }

    @PostMapping("/backup-codes/regenerate")
    @Operation(
        summary = "Regenerate backup codes",
        description = "Deletes all existing backup codes and generates 10 new ones. " +
                      "Requires TOTP confirmation."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "New backup codes generated"),
        @ApiResponse(responseCode = "400", description = "Invalid code or 2FA not active"),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    public ResponseEntity<Map<String, Object>> regenerateBackupCodes(
            @AuthenticationPrincipal Usuario usuario,
            @Valid @RequestBody TwoFactorCodeRequest request) {

        log.info("Backup codes regeneration requested by user: {}", usuario.getId());
        List<String> newCodes = twoFactorService.regenerateBackupCodes(usuario.getId(), request.getCode());

        return ResponseEntity.ok(Map.of(
                "message", "Novos códigos de backup gerados. Os anteriores foram invalidados.",
                "backupCodes", newCodes
        ));
    }
}
