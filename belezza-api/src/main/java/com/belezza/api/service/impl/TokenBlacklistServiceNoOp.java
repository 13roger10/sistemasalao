package com.belezza.api.service.impl;

import com.belezza.api.service.TokenBlacklistService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * No-operation implementation of TokenBlacklistService.
 * Used when Redis is disabled (e.g., in development).
 * Tokens will rely solely on their expiration time for security.
 */
@Service
@Slf4j
@ConditionalOnProperty(name = "spring.data.redis.enabled", havingValue = "false")
public class TokenBlacklistServiceNoOp implements TokenBlacklistService {

    public TokenBlacklistServiceNoOp() {
        log.warn("Redis is disabled - Token blacklist is not active. Tokens will rely on expiration only.");
    }

    @Override
    public void blacklistToken(String token, long expirationSeconds) {
        log.debug("Token blacklist disabled - token not blacklisted");
    }

    @Override
    public boolean isTokenBlacklisted(String token) {
        return false;
    }

    @Override
    public void removeFromBlacklist(String token) {
        log.debug("Token blacklist disabled - nothing to remove");
    }
}
