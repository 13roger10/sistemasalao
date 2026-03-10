package com.belezza.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * JWT Authentication Filter that processes every request to extract and validate JWT tokens.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String MDC_REQUEST_ID = "requestId";
    private static final String MDC_USER_ID = "userId";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final com.belezza.api.service.TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        // Set up MDC for request tracing
        String requestId = getOrGenerateRequestId(request);
        MDC.put(MDC_REQUEST_ID, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            final String jwt = extractJwtFromRequest(request);

            if (jwt == null) {
                filterChain.doFilter(request, response);
                return;
            }

            // Don't process if already authenticated
            if (SecurityContextHolder.getContext().getAuthentication() != null) {
                filterChain.doFilter(request, response);
                return;
            }

            // Validate and process token
            if (jwtService.validateToken(jwt) && !jwtService.isRefreshToken(jwt)) {
                // Check if token is blacklisted
                if (tokenBlacklistService.isTokenBlacklisted(jwt)) {
                    log.debug("Token is blacklisted");
                    filterChain.doFilter(request, response);
                    return;
                }

                String username = jwtService.extractUsername(jwt);

                if (username != null) {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    if (jwtService.isTokenValid(jwt, userDetails)) {
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);

                        // Add user ID to MDC for logging
                        Long userId = jwtService.extractUserId(jwt);
                        if (userId != null) {
                            MDC.put(MDC_USER_ID, userId.toString());
                        }

                        log.debug("User {} authenticated successfully", username);
                    }
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }

    /**
     * Extracts JWT token from Authorization header.
     */
    private String extractJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader(AUTHORIZATION_HEADER);

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }

        return null;
    }

    /**
     * Gets request ID from header or generates a new one.
     */
    private String getOrGenerateRequestId(HttpServletRequest request) {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (!StringUtils.hasText(requestId)) {
            requestId = UUID.randomUUID().toString().substring(0, 8);
        }
        return requestId;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        // Skip filtering for public endpoints and static resources
        // Note: /api/auth/me requires authentication, so we don't skip it
        return path.equals("/api/auth/register") ||
               path.equals("/api/auth/login") ||
               path.equals("/api/auth/refresh") ||
               path.equals("/api/auth/forgot-password") ||
               path.equals("/api/auth/reset-password") ||
               path.equals("/api/auth/verify-email") ||
               path.startsWith("/api/public/") ||
               path.startsWith("/actuator/") ||
               path.startsWith("/swagger-ui") ||
               path.startsWith("/api-docs") ||
               path.startsWith("/v3/api-docs");
    }
}
