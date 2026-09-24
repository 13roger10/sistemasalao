package com.belezza.api.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * SEC-017: verifica a assinatura HMAC (X-Hub-Signature-256) dos webhooks da Meta
 * (WhatsApp Cloud API e Graph API), garantindo que o payload veio realmente da Meta
 * e não foi forjado por um terceiro.
 *
 * <p>A assinatura é o HMAC-SHA256 do corpo BRUTO usando o App Secret da Meta como
 * chave, no formato {@code sha256=<hex>}. A comparação é feita em tempo constante.
 *
 * <p>Quando o App Secret não está configurado (ambiente de desenvolvimento), a
 * verificação é ignorada com um aviso — em produção o segredo deve estar definido.
 */
@Component
@Slf4j
public class WebhookSignatureVerifier {

    @Value("${belezza.meta.app-secret:}")
    private String appSecret;

    public boolean isValid(String rawBody, String signatureHeader) {
        if (appSecret == null || appSecret.isBlank()) {
            log.warn("Webhook: META_APP_SECRET não configurado — assinatura NÃO verificada (ok apenas em dev).");
            return true;
        }
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            log.warn("Webhook rejeitado: cabeçalho X-Hub-Signature-256 ausente ou malformado.");
            return false;
        }
        String expected = "sha256=" + hmacSha256Hex(appSecret, rawBody == null ? "" : rawBody);
        boolean ok = MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signatureHeader.getBytes(StandardCharsets.UTF_8));
        if (!ok) {
            log.warn("Webhook rejeitado: assinatura HMAC inválida.");
        }
        return ok;
    }

    private String hmacSha256Hex(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao calcular HMAC do webhook", e);
        }
    }
}
