package com.belezza.api.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

/**
 * SEC-012: valida na inicialização que os segredos sensíveis não são valores
 * default/públicos, vazios ou fracos quando a aplicação sobe em um perfil de
 * produção (prod/staging).
 *
 * <p>Em dev/local/test os defaults de conveniência continuam válidos (para não
 * atrapalhar o desenvolvimento). Em produção, porém, o boot FALHA de forma
 * explícita — "fail closed" — em vez de subir silenciosamente com um JWT_SECRET
 * público (que permitiria forjar tokens) ou uma chave AES conhecida (que
 * permitiria decriptar tokens OAuth em repouso).
 */
@Component
@Slf4j
public class SecretsValidator {

    // Defaults de desenvolvimento que JAMAIS podem chegar em produção.
    private static final String JWT_DEV_DEFAULT =
            "belezza-dev-secret-key-change-in-production-min-256-bits-required";
    private static final String AES_DEV_DEFAULT = "belezza-dev-aes-key-32-chars!!";

    private static final List<String> PRODUCTION_PROFILES = Arrays.asList("prod", "staging");

    private final Environment environment;
    private final String jwtSecret;
    private final String aesKey;

    public SecretsValidator(
            Environment environment,
            @Value("${belezza.jwt.secret:}") String jwtSecret,
            @Value("${belezza.encryption.aes-key:}") String aesKey) {
        this.environment = environment;
        this.jwtSecret = jwtSecret;
        this.aesKey = aesKey;
    }

    @PostConstruct
    public void validate() {
        boolean production = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(PRODUCTION_PROFILES::contains);

        if (!production) {
            log.info("SecretsValidator: perfil não-produtivo — validação estrita de segredos ignorada.");
            return;
        }

        // JWT: obrigatório, não pode ser o default e precisa ter força de 256 bits (32 bytes).
        requireNotBlank("JWT_SECRET (belezza.jwt.secret)", jwtSecret);
        requireNotDefault("JWT_SECRET (belezza.jwt.secret)", jwtSecret, JWT_DEV_DEFAULT);
        if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            fail("JWT_SECRET deve ter no mínimo 32 bytes (256 bits) em produção.");
        }

        // AES: obrigatório e não pode ser o default público.
        requireNotBlank("AES_SECRET_KEY (belezza.encryption.aes-key)", aesKey);
        requireNotDefault("AES_SECRET_KEY (belezza.encryption.aes-key)", aesKey, AES_DEV_DEFAULT);

        log.info("SecretsValidator: segredos de produção validados com sucesso.");
    }

    private void requireNotBlank(String nome, String valor) {
        if (valor == null || valor.isBlank()) {
            fail(nome + " é obrigatório em produção e não pode estar vazio.");
        }
    }

    private void requireNotDefault(String nome, String valor, String devDefault) {
        if (devDefault.equals(valor)) {
            fail(nome + " está usando o valor DEFAULT de desenvolvimento (público). "
                    + "Defina um segredo forte e único via variável de ambiente e rotacione o antigo.");
        }
    }

    private void fail(String mensagem) {
        throw new IllegalStateException("[SEC-012] Configuração de segredo insegura em produção: " + mensagem);
    }
}
