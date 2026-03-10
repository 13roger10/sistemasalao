package com.belezza.api.security;

import com.belezza.api.entity.Usuario;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Service for JWT token generation and validation.
 */
@Service
@Slf4j
public class JwtService {

    @Value("${belezza.jwt.secret}")
    private String jwtSecret;

    @Value("${belezza.jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${belezza.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Value("${belezza.jwt.issuer}")
    private String issuer;

    private SecretKey signingKey;

    @PostConstruct
    public void init() {
        try {
            // Try to decode as Base64 first
            byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
            this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            // If not valid Base64, use the secret directly as bytes
            // Ensure minimum 256 bits (32 bytes) for HMAC-SHA256
            byte[] keyBytes = jwtSecret.getBytes();
            if (keyBytes.length < 32) {
                // Pad the key if too short
                byte[] paddedKey = new byte[32];
                System.arraycopy(keyBytes, 0, paddedKey, 0, keyBytes.length);
                this.signingKey = Keys.hmacShaKeyFor(paddedKey);
            } else {
                this.signingKey = Keys.hmacShaKeyFor(keyBytes);
            }
        }
    }

    /**
     * Generates an access token for the given user.
     */
    public String generateAccessToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        if (userDetails instanceof Usuario usuario) {
            claims.put("userId", usuario.getId());
            claims.put("role", usuario.getRole().name());
            claims.put("plano", usuario.getPlano().name());
            claims.put("nome", usuario.getNome());
        }
        return generateToken(claims, userDetails.getUsername(), accessTokenExpiration);
    }

    /**
     * Generates a refresh token for the given user.
     */
    public String generateRefreshToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("tokenType", "refresh");
        if (userDetails instanceof Usuario usuario) {
            claims.put("userId", usuario.getId());
        }
        return generateToken(claims, userDetails.getUsername(), refreshTokenExpiration);
    }

    /**
     * Generates a token with custom claims.
     */
    private String generateToken(Map<String, Object> extraClaims, String subject, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuer(issuer)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Extracts the username (email) from the token.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extracts the user ID from the token.
     */
    public Long extractUserId(String token) {
        return extractClaim(token, claims -> claims.get("userId", Long.class));
    }

    /**
     * Extracts the expiration date from the token.
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extracts a specific claim from the token.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Extracts all claims from the token.
     */
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Validates the token against the user details.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Checks if the token is a refresh token.
     */
    public boolean isRefreshToken(String token) {
        try {
            String tokenType = extractClaim(token, claims -> claims.get("tokenType", String.class));
            return "refresh".equals(tokenType);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Checks if the token is expired.
     */
    public boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }

    /**
     * Validates the token structure and signature.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (MalformedJwtException e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.debug("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.debug("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.debug("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    public long getAccessTokenExpiration() {
        return accessTokenExpiration;
    }

    public long getRefreshTokenExpiration() {
        return refreshTokenExpiration;
    }

    /**
     * Gets the remaining time until token expiration in seconds.
     *
     * @param token JWT token
     * @return Remaining seconds until expiration, or 0 if already expired
     */
    public long getTokenExpirationInSeconds(String token) {
        try {
            Date expiration = extractExpiration(token);
            long now = System.currentTimeMillis();
            long expirationTime = expiration.getTime();
            long remainingMillis = expirationTime - now;
            return Math.max(0, remainingMillis / 1000);
        } catch (Exception e) {
            log.warn("Failed to extract token expiration: {}", e.getMessage());
            return 0;
        }
    }
}
