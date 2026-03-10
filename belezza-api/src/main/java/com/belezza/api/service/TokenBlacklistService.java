package com.belezza.api.service;

/**
 * Service interface for JWT token blacklist management using Redis.
 */
public interface TokenBlacklistService {

    /**
     * Adds a token to the blacklist.
     *
     * @param token JWT token to blacklist
     * @param expirationSeconds Time in seconds until token would naturally expire
     */
    void blacklistToken(String token, long expirationSeconds);

    /**
     * Checks if a token is blacklisted.
     *
     * @param token JWT token to check
     * @return true if token is blacklisted, false otherwise
     */
    boolean isTokenBlacklisted(String token);

    /**
     * Removes a token from the blacklist (if needed for testing).
     *
     * @param token JWT token to remove
     */
    void removeFromBlacklist(String token);
}
