package com.belezza.api.service;

import com.belezza.api.entity.BackupCode;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.BackupCodeRepository;
import com.belezza.api.repository.UsuarioRepository;
import dev.samstevens.totp.code.*;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import static dev.samstevens.totp.util.Utils.getDataUriForImage;

/**
 * Service for Two-Factor Authentication (2FA) using TOTP protocol.
 * Compatible with Google Authenticator and Authy.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TwoFactorService {

    private static final String ISSUER = "Belezza.ai";
    private static final int BACKUP_CODE_COUNT = 10;
    private static final int BACKUP_CODE_LENGTH = 8;

    private final UsuarioRepository usuarioRepository;
    private final BackupCodeRepository backupCodeRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Generates a new TOTP secret and QR code URI for the user.
     * Does NOT enable 2FA yet — user must verify the code first via enableTwoFactor().
     *
     * @return data URI of the QR code image (base64 PNG)
     */
    @Transactional
    public String setupTwoFactor(Long userId) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        if (usuario.isTotpEnabled()) {
            throw new BusinessException("2FA já está ativado. Desative primeiro para reconfigurar.");
        }

        String secret = new DefaultSecretGenerator(32).generate();
        usuario.setTotpSecret(secret);
        usuarioRepository.save(usuario);

        log.info("2FA setup initiated for user: {}", userId);
        return generateQrCodeUri(secret, usuario.getEmail());
    }

    /**
     * Confirms the TOTP code and activates 2FA for the user.
     * Returns the 10 one-time backup codes (shown only once).
     */
    @Transactional
    public List<String> enableTwoFactor(Long userId, String code) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        if (usuario.getTotpSecret() == null) {
            throw new BusinessException("Configure o 2FA primeiro antes de ativar.");
        }
        if (usuario.isTotpEnabled()) {
            throw new BusinessException("2FA já está ativado.");
        }
        if (!isValidTotpCode(usuario.getTotpSecret(), code)) {
            throw new BusinessException("Código inválido. Verifique o app autenticador e tente novamente.");
        }

        usuario.setTotpEnabled(true);
        usuarioRepository.save(usuario);

        List<String> backupCodes = generateAndSaveBackupCodes(usuario);
        log.info("2FA enabled for user: {}", userId);
        return backupCodes;
    }

    /**
     * Disables 2FA for the user after validating the current TOTP code.
     */
    @Transactional
    public void disableTwoFactor(Long userId, String code) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        if (!usuario.isTotpEnabled()) {
            throw new BusinessException("2FA não está ativado.");
        }
        if (!isValidTotpCode(usuario.getTotpSecret(), code)) {
            throw new BusinessException("Código inválido. Verifique o app autenticador.");
        }

        usuario.setTotpEnabled(false);
        usuario.setTotpSecret(null);
        usuarioRepository.save(usuario);

        backupCodeRepository.deleteAllByUsuarioId(userId);
        log.info("2FA disabled for user: {}", userId);
    }

    /**
     * Validates a TOTP code or backup code during login.
     * If a backup code is used, it is marked as consumed.
     *
     * @return true if the code is valid
     */
    @Transactional
    public boolean validateLoginCode(Usuario usuario, String code) {
        if (!usuario.isTotpEnabled() || usuario.getTotpSecret() == null) {
            return false;
        }

        // Try TOTP code first
        if (isValidTotpCode(usuario.getTotpSecret(), code)) {
            return true;
        }

        // Fallback to backup code
        return consumeBackupCode(usuario.getId(), code);
    }

    /**
     * Regenerates 10 new backup codes after validating the current TOTP code.
     * Old codes are deleted.
     */
    @Transactional
    public List<String> regenerateBackupCodes(Long userId, String code) {
        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        if (!usuario.isTotpEnabled()) {
            throw new BusinessException("2FA não está ativado.");
        }
        if (!isValidTotpCode(usuario.getTotpSecret(), code)) {
            throw new BusinessException("Código inválido.");
        }

        backupCodeRepository.deleteAllByUsuarioId(userId);
        List<String> newCodes = generateAndSaveBackupCodes(usuario);
        log.info("Backup codes regenerated for user: {}", userId);
        return newCodes;
    }

    /**
     * Returns how many backup codes are still unused for a user.
     */
    public long countRemainingBackupCodes(Long userId) {
        return backupCodeRepository.countByUsuarioIdAndUsadoFalse(userId);
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private String generateQrCodeUri(String secret, String email) {
        QrData data = new QrData.Builder()
                .label(email)
                .secret(secret)
                .issuer(ISSUER)
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        try {
            QrGenerator generator = new ZxingPngQrGenerator();
            byte[] imageData = generator.generate(data);
            return getDataUriForImage(imageData, generator.getImageMimeType());
        } catch (QrGenerationException e) {
            log.error("Failed to generate QR code for user email: {}", email, e);
            throw new BusinessException("Erro ao gerar QR Code. Tente novamente.");
        }
    }

    private boolean isValidTotpCode(String secret, String code) {
        CodeVerifier verifier = new DefaultCodeVerifier(
                new DefaultCodeGenerator(),
                new SystemTimeProvider()
        );
        return verifier.isValidCode(secret, code);
    }

    private boolean consumeBackupCode(Long userId, String rawCode) {
        return backupCodeRepository.findByUsuarioIdAndUsadoFalse(userId).stream()
                .filter(bc -> passwordEncoder.matches(rawCode, bc.getCode()))
                .findFirst()
                .map(bc -> {
                    bc.setUsado(true);
                    bc.setUsadoEm(LocalDateTime.now());
                    backupCodeRepository.save(bc);
                    log.info("Backup code consumed for user: {}", userId);
                    return true;
                })
                .orElse(false);
    }

    private List<String> generateAndSaveBackupCodes(Usuario usuario) {
        SecureRandom random = new SecureRandom();
        List<String> plainCodes = new ArrayList<>();

        for (int i = 0; i < BACKUP_CODE_COUNT; i++) {
            byte[] bytes = new byte[6];
            random.nextBytes(bytes);
            String plain = Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(bytes)
                    .toUpperCase()
                    .substring(0, BACKUP_CODE_LENGTH);

            plainCodes.add(plain);

            BackupCode backupCode = BackupCode.builder()
                    .usuario(usuario)
                    .code(passwordEncoder.encode(plain))
                    .usado(false)
                    .build();
            backupCodeRepository.save(backupCode);
        }

        return plainCodes;
    }
}
