package com.belezza.api.service;

import com.belezza.api.entity.ContaSocial;
import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.Salon;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.integration.MetaGraphAPIService;
import com.belezza.api.repository.ContaSocialRepository;
import com.belezza.api.repository.SalonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing social media accounts connected to salons.
 * Handles OAuth flow, token management, and account connections.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class SocialAccountService {

    private final ContaSocialRepository contaSocialRepository;
    private final SalonRepository salonRepository;
    private final MetaGraphAPIService metaGraphAPIService;

    // ====================================
    // 7.1 OAuth Flow
    // ====================================

    /**
     * Generate OAuth authorization URL.
     */
    public String generateAuthUrl(Long salonId, PlataformaSocial plataforma) {
        Salon salon = getSalonById(salonId);

        // Generate state with salon ID for callback validation
        String state = UUID.randomUUID().toString() + ":" + salonId + ":" + plataforma;

        String authUrl;
        if (plataforma == PlataformaSocial.INSTAGRAM) {
            authUrl = metaGraphAPIService.getInstagramAuthUrl(state);
        } else if (plataforma == PlataformaSocial.FACEBOOK) {
            authUrl = metaGraphAPIService.getFacebookAuthUrl(state);
        } else {
            throw new BusinessException("Unsupported platform: " + plataforma);
        }

        log.info("Generated auth URL for salon {} and platform {}", salonId, plataforma);
        return authUrl;
    }

    /**
     * Process OAuth callback and save account connection.
     */
    public ContaSocial processOAuthCallback(String code, String state) {
        // Validate and parse state
        String[] stateParts = state.split(":");
        if (stateParts.length != 3) {
            throw new BusinessException("Invalid OAuth state");
        }

        Long salonId = Long.parseLong(stateParts[1]);
        PlataformaSocial plataforma = PlataformaSocial.valueOf(stateParts[2]);

        Salon salon = getSalonById(salonId);

        try {
            // Exchange code for token
            MetaGraphAPIService.TokenResponse tokenResponse = metaGraphAPIService.exchangeCodeForToken(code);

            // Get account info
            MetaGraphAPIService.AccountInfo accountInfo = metaGraphAPIService.getAccountInfo(
                tokenResponse.accessToken(),
                plataforma
            );

            // Check if account already exists
            contaSocialRepository.findBySalonIdAndAccountId(salonId, accountInfo.accountId())
                .ifPresent(existing -> {
                    throw new BusinessException("Account already connected");
                });

            // Calculate token expiration
            LocalDateTime tokenExpira = tokenResponse.expiresIn() != null
                ? LocalDateTime.now().plusSeconds(tokenResponse.expiresIn())
                : LocalDateTime.now().plusDays(60); // Default 60 days for long-lived tokens

            // Create and save account
            ContaSocial contaSocial = ContaSocial.builder()
                .salon(salon)
                .plataforma(plataforma)
                .accountId(accountInfo.accountId())
                .accountName(accountInfo.accountName())
                .accountImageUrl(accountInfo.accountImageUrl())
                .accessToken(tokenResponse.accessToken())
                .tokenExpira(tokenExpira)
                .ativa(true)
                .build();

            contaSocial = contaSocialRepository.save(contaSocial);

            log.info("Social account connected successfully: {} - {}", plataforma, accountInfo.accountName());

            return contaSocial;

        } catch (Exception e) {
            log.error("Error processing OAuth callback: {}", e.getMessage(), e);
            throw new BusinessException("Failed to connect account: " + e.getMessage());
        }
    }

    // ====================================
    // 7.2 Account Management
    // ====================================

    /**
     * List all connected accounts for a salon.
     */
    @Transactional(readOnly = true)
    public List<ContaSocial> listAccounts(Long salonId, boolean activeOnly) {
        if (activeOnly) {
            return contaSocialRepository.findBySalonIdAndAtivaTrue(salonId);
        } else {
            return contaSocialRepository.findBySalonId(salonId);
        }
    }

    /**
     * Get a specific connected account.
     */
    @Transactional(readOnly = true)
    public ContaSocial getAccount(Long salonId, Long accountId) {
        return contaSocialRepository.findById(accountId)
            .filter(conta -> conta.getSalon().getId().equals(salonId))
            .orElseThrow(() -> new ResourceNotFoundException("Social account not found"));
    }

    /**
     * Get active account by platform.
     */
    @Transactional(readOnly = true)
    public ContaSocial getAccountByPlatform(Long salonId, PlataformaSocial plataforma) {
        return contaSocialRepository.findBySalonIdAndPlataformaAndAtivaTrue(salonId, plataforma)
            .orElseThrow(() -> new ResourceNotFoundException(
                "No active " + plataforma + " account found for salon"
            ));
    }

    /**
     * Disconnect a social account.
     */
    public void disconnectAccount(Long salonId, Long accountId) {
        ContaSocial contaSocial = getAccount(salonId, accountId);

        contaSocial.setAtiva(false);
        contaSocialRepository.save(contaSocial);

        log.info("Social account disconnected: {} - {}",
            contaSocial.getPlataforma(), contaSocial.getAccountName());
    }

    /**
     * Refresh access token for an account.
     */
    public ContaSocial refreshAccountToken(Long salonId, Long accountId) {
        ContaSocial contaSocial = getAccount(salonId, accountId);

        try {
            MetaGraphAPIService.TokenResponse newToken = metaGraphAPIService.refreshToken(
                contaSocial.getAccessToken()
            );

            contaSocial.setAccessToken(newToken.accessToken());

            if (newToken.expiresIn() != null) {
                contaSocial.setTokenExpira(LocalDateTime.now().plusSeconds(newToken.expiresIn()));
            } else {
                contaSocial.setTokenExpira(LocalDateTime.now().plusDays(60));
            }

            contaSocialRepository.save(contaSocial);

            log.info("Token refreshed successfully for account: {} - {}",
                contaSocial.getPlataforma(), contaSocial.getAccountName());

            return contaSocial;

        } catch (Exception e) {
            log.error("Error refreshing token: {}", e.getMessage(), e);
            throw new BusinessException("Failed to refresh token: " + e.getMessage());
        }
    }

    /**
     * Auto-refresh tokens that are expiring soon (within 7 days).
     * This should be called by a scheduled job.
     */
    public void autoRefreshExpiringTokens() {
        LocalDateTime limit = LocalDateTime.now().plusDays(7);
        List<ContaSocial> expiringAccounts = contaSocialRepository.findWithExpiringTokens(limit);

        log.info("Found {} accounts with expiring tokens", expiringAccounts.size());

        for (ContaSocial conta : expiringAccounts) {
            try {
                refreshAccountToken(conta.getSalon().getId(), conta.getId());
            } catch (Exception e) {
                log.error("Failed to auto-refresh token for account {}: {}",
                    conta.getId(), e.getMessage());
                // Mark as inactive if refresh fails
                conta.setAtiva(false);
                contaSocialRepository.save(conta);
            }
        }
    }

    /**
     * Check if salon has an active account for a platform.
     */
    @Transactional(readOnly = true)
    public boolean hasActiveAccount(Long salonId, PlataformaSocial plataforma) {
        return contaSocialRepository.countActiveBySalonIdAndPlataforma(salonId, plataforma) > 0;
    }

    // ====================================
    // Helper Methods
    // ====================================

    private Salon getSalonById(Long salonId) {
        return salonRepository.findById(salonId)
            .orElseThrow(() -> new ResourceNotFoundException("Salon not found"));
    }
}
