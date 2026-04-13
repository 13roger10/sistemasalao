package com.belezza.api.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption service for protecting sensitive data at rest.
 *
 * Used to encrypt OAuth tokens (access_token, refresh_token) stored in the database.
 *
 * Format of encrypted value:
 *   ENC:<base64url(IV)>.<base64url(ciphertext + auth-tag)>
 *
 * The "ENC:" prefix allows backward-compatible detection of already-encrypted values.
 * Plain values (no prefix) pass through decrypt() unchanged — safe for migration.
 */
@Service
@Slf4j
public class AesEncryptionService {

    private static final String ALGORITHM       = "AES/GCM/NoPadding";
    private static final int    GCM_IV_LENGTH   = 12;   // 96-bit IV — GCM standard
    private static final int    GCM_TAG_BITS    = 128;  // 128-bit auth tag
    private static final String ENC_PREFIX      = "ENC:";

    private final SecretKey secretKey;

    public AesEncryptionService(
            @Value("${belezza.encryption.aes-key:belezza-dev-aes-key-32-chars!!}") String rawKey) {
        this.secretKey = deriveKey(rawKey);
        log.info("AesEncryptionService initialized.");
    }

    /**
     * Encrypts a plain-text value.
     * Returns the value unchanged if it is null or blank.
     *
     * @param plainText the raw value to encrypt (e.g., OAuth access token)
     * @return "ENC:<base64url(IV)>.<base64url(ciphertext)>"
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) {
            return plainText;
        }
        if (plainText.startsWith(ENC_PREFIX)) {
            return plainText; // already encrypted — idempotent
        }

        try {
            byte[] iv = generateIv();

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));

            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
            return ENC_PREFIX + enc.encodeToString(iv) + "." + enc.encodeToString(cipherText);

        } catch (Exception e) {
            log.error("AES encryption failed", e);
            throw new IllegalStateException("Falha ao criptografar o token.", e);
        }
    }

    /**
     * Decrypts a value previously encrypted by {@link #encrypt(String)}.
     *
     * If the value does not start with "ENC:", it is returned as-is.
     * This allows backward-compatible usage during data migration.
     *
     * @param encryptedValue the encrypted string or a plain legacy value
     * @return the original plain-text value
     */
    public String decrypt(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isBlank()) {
            return encryptedValue;
        }
        if (!encryptedValue.startsWith(ENC_PREFIX)) {
            return encryptedValue; // legacy plain value — return as-is
        }

        try {
            String payload = encryptedValue.substring(ENC_PREFIX.length());
            String[] parts = payload.split("\\.", 2);
            if (parts.length != 2) {
                throw new IllegalArgumentException("Formato de token criptografado inválido.");
            }

            Base64.Decoder dec = Base64.getUrlDecoder();
            byte[] iv         = dec.decode(parts[0]);
            byte[] cipherText = dec.decode(parts[1]);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));

            byte[] plainBytes = cipher.doFinal(cipherText);
            return new String(plainBytes, StandardCharsets.UTF_8);

        } catch (Exception e) {
            log.error("AES decryption failed", e);
            throw new IllegalStateException("Falha ao descriptografar o token.", e);
        }
    }

    /**
     * Returns true if the value has the ENC: prefix (was encrypted by this service).
     */
    public boolean isEncrypted(String value) {
        return value != null && value.startsWith(ENC_PREFIX);
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    /**
     * Derives a 256-bit AES key from the raw key string using SHA-256.
     * This ensures a fixed 32-byte key regardless of the input length.
     */
    private SecretKey deriveKey(String rawKey) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha.digest(rawKey.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao derivar a chave AES.", e);
        }
    }

    private byte[] generateIv() {
        byte[] iv = new byte[GCM_IV_LENGTH];
        new SecureRandom().nextBytes(iv);
        return iv;
    }
}
