package com.belezza.api.service.impl;

import com.belezza.api.service.TokenBlacklistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Implementation of TokenBlacklistService using Redis.
 * Only active when Redis is enabled.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "spring.data.redis.enabled", havingValue = "true", matchIfMissing = true)
public class TokenBlacklistServiceImpl implements TokenBlacklistService {

    private static final String BLACKLIST_KEY_PREFIX = "auth:blacklist:";

    private final RedisTemplate<String, String> redisTemplate;

    @Override
    public void blacklistToken(String token, long expirationSeconds) {
        try {
            String key = BLACKLIST_KEY_PREFIX + token;
            redisTemplate.opsForValue().set(key, "revoked", expirationSeconds, TimeUnit.SECONDS);
            log.debug("Token added to blacklist with expiration: {} seconds", expirationSeconds);
        } catch (Exception e) {
            log.error("Failed to blacklist token", e);
            // Don't throw exception - graceful degradation
            // If Redis is down, tokens will still expire naturally
        }
    }

    @Override
    public boolean isTokenBlacklisted(String token) {
        try {
            String key = BLACKLIST_KEY_PREFIX + token;
            Boolean exists = redisTemplate.hasKey(key);
            return Boolean.TRUE.equals(exists);
        } catch (Exception e) {
            log.error("Failed to check token blacklist", e);
            // On error, assume token is not blacklisted (fail-open for availability)
            return false;
        }
    }

    @Override
    public void removeFromBlacklist(String token) {
        try {
            String key = BLACKLIST_KEY_PREFIX + token;
            redisTemplate.delete(key);
            log.debug("Token removed from blacklist");
        } catch (Exception e) {
            log.error("Failed to remove token from blacklist", e);
        }
    }
}
