package com.belezza.api.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SEC-A02: comportamento do verificador de assinatura de webhook, com atenção ao
 * fail-open em dev versus fail-closed em produção quando o segredo não está definido.
 */
@DisplayName("WebhookSignatureVerifier")
class WebhookSignatureVerifierTest {

    private WebhookSignatureVerifier comSegredo(String profile, String segredo) {
        MockEnvironment env = new MockEnvironment();
        if (profile != null) {
            env.setActiveProfiles(profile);
        }
        WebhookSignatureVerifier v = new WebhookSignatureVerifier(env);
        ReflectionTestUtils.setField(v, "appSecret", segredo);
        return v;
    }

    private static String assinar(String segredo, String corpo) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return "sha256=" + HexFormat.of().formatHex(mac.doFinal(corpo.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    @DisplayName("sem segredo em dev: aceita (fail-open de conveniência)")
    void semSegredoDevAceita() {
        assertThat(comSegredo("dev", "").isValid("{}", null)).isTrue();
    }

    @Test
    @DisplayName("sem segredo em produção: rejeita (fail-closed)")
    void semSegredoProdRejeita() {
        assertThat(comSegredo("prod", "").isValid("{}", null)).isFalse();
        assertThat(comSegredo("staging", "").isValid("{}", null)).isFalse();
    }

    @Test
    @DisplayName("com segredo: aceita só a assinatura HMAC correta")
    void comSegredoValidaHmac() {
        WebhookSignatureVerifier v = comSegredo("prod", "segredo-super-secreto");
        String corpo = "{\"event\":\"x\"}";

        assertThat(v.isValid(corpo, assinar("segredo-super-secreto", corpo))).isTrue();
        assertThat(v.isValid(corpo, assinar("outro-segredo", corpo))).isFalse();
        assertThat(v.isValid(corpo, null)).isFalse();
        assertThat(v.isValid(corpo, "md5=abc")).isFalse();
    }
}
