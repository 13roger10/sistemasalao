package com.belezza.api.security;

import com.belezza.api.entity.ApiKey;
import com.belezza.api.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Authenticates requests to /api/v1/** using the X-API-Key header.
 * On success, sets a Spring Security authentication with ROLE_API_KEY.
 * On failure for /api/v1/** requests, responds 401 immediately.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    static final String API_KEY_HEADER = "X-API-Key";

    private final ApiKeyService apiKeyService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only runs for /api/v1/** paths
        return !request.getServletPath().startsWith("/api/v1/");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // If already authenticated (e.g., JWT path), skip
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String rawKey = request.getHeader(API_KEY_HEADER);
        if (rawKey == null || rawKey.isBlank()) {
            unauthorized(response, "X-API-Key header is required");
            return;
        }

        ApiKey apiKey = apiKeyService.findAndValidate(rawKey).orElse(null);
        if (apiKey == null) {
            unauthorized(response, "Invalid or revoked API key");
            return;
        }

        // Build authority list from scopes
        List<SimpleGrantedAuthority> authorities = apiKey.escoposList().stream()
            .map(s -> new SimpleGrantedAuthority("SCOPE_" + s.toUpperCase()))
            .toList();
        authorities = new java.util.ArrayList<>(authorities);
        ((java.util.ArrayList<SimpleGrantedAuthority>) authorities)
            .add(new SimpleGrantedAuthority("ROLE_API_KEY"));

        // Store the ApiKey as the principal so controllers can retrieve salonId
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            apiKey, null, authorities
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        log.debug("API key authenticated: id={}, salonId={}", apiKey.getId(), apiKey.getSalon().getId());
        filterChain.doFilter(request, response);
    }

    private void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
