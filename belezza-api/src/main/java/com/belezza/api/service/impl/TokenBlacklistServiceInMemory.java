package com.belezza.api.service.impl;

import com.belezza.api.service.TokenBlacklistService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SEC-009: implementação em memória do blacklist de tokens, usada quando o Redis
 * está desabilitado (dev/local ou qualquer deploy single-instance sem Redis).
 *
 * <p>Substitui o antigo NoOp, que fazia o logout NÃO invalidar o JWT — o token
 * continuava válido até expirar naturalmente mesmo após o usuário sair. Agora o
 * logout registra o token aqui e o {@code JwtAuthenticationFilter} passa a rejeitá-lo.
 *
 * <p>Limitações conhecidas: o estado é por instância (não compartilhado entre réplicas)
 * e volátil (perdido no restart). Em produção com múltiplas instâncias, use o
 * backend Redis ({@code spring.data.redis.enabled=true}). Ainda assim, para uma
 * única instância isto fecha o buraco de "logout não invalida a sessão".
 */
@Service
@Slf4j
@ConditionalOnProperty(name = "spring.data.redis.enabled", havingValue = "false")
public class TokenBlacklistServiceInMemory implements TokenBlacklistService {

    /** token -> epoch millis em que a entrada pode ser descartada (expiração natural do JWT). */
    private final Map<String, Long> blacklist = new ConcurrentHashMap<>();

    /** Acima deste tamanho, faz uma varredura de expirados ao inserir, para limitar memória. */
    private static final int SWEEP_THRESHOLD = 1000;

    public TokenBlacklistServiceInMemory() {
        log.warn("Redis desabilitado - usando blacklist de token EM MEMÓRIA (por instância, volátil). "
                + "Para produção com múltiplas réplicas, habilite o Redis.");
    }

    @Override
    public void blacklistToken(String token, long expirationSeconds) {
        if (token == null || token.isBlank() || expirationSeconds <= 0) {
            return; // token já expirado/ inválido não precisa ser guardado
        }
        long expiraEm = System.currentTimeMillis() + (expirationSeconds * 1000L);
        blacklist.put(token, expiraEm);
        if (blacklist.size() > SWEEP_THRESHOLD) {
            removeExpirados();
        }
        log.debug("Token adicionado ao blacklist em memória por {}s", expirationSeconds);
    }

    @Override
    public boolean isTokenBlacklisted(String token) {
        if (token == null) return false;
        Long expiraEm = blacklist.get(token);
        if (expiraEm == null) {
            return false;
        }
        if (expiraEm <= System.currentTimeMillis()) {
            blacklist.remove(token); // expirou naturalmente — limpeza preguiçosa
            return false;
        }
        return true;
    }

    @Override
    public void removeFromBlacklist(String token) {
        if (token != null) {
            blacklist.remove(token);
        }
    }

    private void removeExpirados() {
        long agora = System.currentTimeMillis();
        blacklist.entrySet().removeIf(e -> e.getValue() <= agora);
    }
}
