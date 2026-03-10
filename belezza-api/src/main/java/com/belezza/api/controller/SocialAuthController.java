package com.belezza.api.controller;

import com.belezza.api.dto.post.AuthUrlResponse;
import com.belezza.api.dto.post.ContaSocialResponse;
import com.belezza.api.entity.ContaSocial;
import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.security.annotation.Authenticated;
import com.belezza.api.service.SocialAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for social media account OAuth and management.
 * Handles Instagram and Facebook account connections.
 */
@RestController
@RequestMapping("/api/social")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Social Auth", description = "Social media OAuth and account management")
public class SocialAuthController {

    private final SocialAccountService socialAccountService;

    // ====================================
    // 7.1 OAuth Flow
    // ====================================

    @GetMapping("/instagram/auth")
    @Authenticated
    @Operation(
        summary = "Get Instagram OAuth URL",
        description = "Generate OAuth authorization URL for Instagram Business Account connection"
    )
    public ResponseEntity<AuthUrlResponse> getInstagramAuthUrl(
        @Parameter(description = "Salon ID") @RequestParam Long salonId
    ) {
        log.info("Generate Instagram auth URL for salon: {}", salonId);

        String authUrl = socialAccountService.generateAuthUrl(salonId, PlataformaSocial.INSTAGRAM);

        AuthUrlResponse response = AuthUrlResponse.builder()
            .plataforma(PlataformaSocial.INSTAGRAM)
            .authUrl(authUrl)
            .message("Redirect user to this URL to authorize Instagram connection")
            .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/facebook/auth")
    @Authenticated
    @Operation(
        summary = "Get Facebook OAuth URL",
        description = "Generate OAuth authorization URL for Facebook Page connection"
    )
    public ResponseEntity<AuthUrlResponse> getFacebookAuthUrl(
        @Parameter(description = "Salon ID") @RequestParam Long salonId
    ) {
        log.info("Generate Facebook auth URL for salon: {}", salonId);

        String authUrl = socialAccountService.generateAuthUrl(salonId, PlataformaSocial.FACEBOOK);

        AuthUrlResponse response = AuthUrlResponse.builder()
            .plataforma(PlataformaSocial.FACEBOOK)
            .authUrl(authUrl)
            .message("Redirect user to this URL to authorize Facebook connection")
            .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/oauth/callback")
    @Operation(
        summary = "OAuth callback",
        description = "Handle OAuth callback from Meta (Instagram/Facebook). " +
                     "This endpoint receives the authorization code and exchanges it for tokens."
    )
    public RedirectView handleOAuthCallback(
        @Parameter(description = "Authorization code") @RequestParam String code,
        @Parameter(description = "State parameter for validation") @RequestParam String state,
        @Parameter(description = "Optional error from OAuth provider") @RequestParam(required = false) String error
    ) {
        log.info("OAuth callback received. State: {}", state);

        if (error != null) {
            log.error("OAuth error: {}", error);
            return new RedirectView("/social-studio?error=" + error);
        }

        try {
            ContaSocial conta = socialAccountService.processOAuthCallback(code, state);

            log.info("OAuth successful for platform: {}", conta.getPlataforma());

            // Redirect to frontend with success
            return new RedirectView("/social-studio?success=true&platform=" + conta.getPlataforma());

        } catch (Exception e) {
            log.error("Error processing OAuth callback: {}", e.getMessage(), e);
            return new RedirectView("/social-studio?error=connection_failed");
        }
    }

    // ====================================
    // 7.2 Account Management
    // ====================================

    @GetMapping("/accounts")
    @Authenticated
    @Operation(
        summary = "List connected accounts",
        description = "Get all social media accounts connected to the salon"
    )
    public ResponseEntity<List<ContaSocialResponse>> listAccounts(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Filter active accounts only") @RequestParam(defaultValue = "true") boolean activeOnly
    ) {
        log.info("List social accounts for salon: {}", salonId);

        List<ContaSocial> contas = socialAccountService.listAccounts(salonId, activeOnly);

        List<ContaSocialResponse> response = contas.stream()
            .map(ContaSocialResponse::fromEntity)
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/accounts/{id}")
    @Authenticated
    @Operation(
        summary = "Get account details",
        description = "Get details of a specific connected account"
    )
    public ResponseEntity<ContaSocialResponse> getAccount(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Account ID") @PathVariable Long id
    ) {
        log.info("Get social account: {} for salon: {}", id, salonId);

        ContaSocial conta = socialAccountService.getAccount(salonId, id);
        ContaSocialResponse response = ContaSocialResponse.fromEntity(conta);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/accounts/{id}")
    @Authenticated
    @Operation(
        summary = "Disconnect account",
        description = "Disconnect a social media account from the salon"
    )
    public ResponseEntity<Void> disconnectAccount(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Account ID") @PathVariable Long id
    ) {
        log.info("Disconnect social account: {} for salon: {}", id, salonId);

        socialAccountService.disconnectAccount(salonId, id);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/accounts/{id}/refresh")
    @Authenticated
    @Operation(
        summary = "Refresh account token",
        description = "Manually refresh the access token for a social media account"
    )
    public ResponseEntity<ContaSocialResponse> refreshToken(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Account ID") @PathVariable Long id
    ) {
        log.info("Refresh token for social account: {} in salon: {}", id, salonId);

        ContaSocial conta = socialAccountService.refreshAccountToken(salonId, id);
        ContaSocialResponse response = ContaSocialResponse.fromEntity(conta);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/accounts/status")
    @Authenticated
    @Operation(
        summary = "Check account status",
        description = "Check which platforms have active accounts connected"
    )
    public ResponseEntity<AccountStatusResponse> checkAccountStatus(
        @Parameter(description = "Salon ID") @RequestParam Long salonId
    ) {
        log.info("Check account status for salon: {}", salonId);

        boolean hasInstagram = socialAccountService.hasActiveAccount(salonId, PlataformaSocial.INSTAGRAM);
        boolean hasFacebook = socialAccountService.hasActiveAccount(salonId, PlataformaSocial.FACEBOOK);

        AccountStatusResponse response = new AccountStatusResponse(hasInstagram, hasFacebook);

        return ResponseEntity.ok(response);
    }

    // ====================================
    // Helper DTOs
    // ====================================

    public record AccountStatusResponse(
        boolean hasInstagram,
        boolean hasFacebook
    ) {}
}
