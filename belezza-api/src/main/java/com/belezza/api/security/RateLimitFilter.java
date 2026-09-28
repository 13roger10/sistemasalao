package com.belezza.api.security;

import com.belezza.api.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter using Bucket4j.
 * Limits requests per IP address to prevent abuse.
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    @Value("${belezza.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    @Value("${belezza.rate-limit.requests-per-minute:60}")
    private int requestsPerMinute;

    // SEC-015: limite bem mais restritivo para endpoints de autenticação (força bruta).
    @Value("${belezza.rate-limit.auth-requests-per-minute:10}")
    private int authRequestsPerMinute;

    // SEC-015: por padrão o IP vem do socket (não falsificável). Só quando a app está
    // atrás de um proxy reverso confiável (nginx/ingress) deve-se confiar no
    // X-Forwarded-For — e, nesse caso, usamos o ÚLTIMO salto (adicionado pelo proxy),
    // não o primeiro (que o cliente pode forjar).
    @Value("${belezza.rate-limit.trust-forward-header:false}")
    private boolean trustForwardHeader;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        if (request.getMethod().equalsIgnoreCase("OPTIONS")) {
            filterChain.doFilter(request, response);
            return;
}
        if (!rateLimitEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        boolean auth = isAuthEndpoint(request.getServletPath());
        int limit = auth ? authRequestsPerMinute : requestsPerMinute;
        // Bucket separado por escopo: endpoints de auth têm balde próprio (mais restrito),
        // então tráfego normal não "gasta" o limite de login e vice-versa.
        String key = (auth ? "auth:" : "gen:") + clientIp;

        Bucket bucket = buckets.computeIfAbsent(key, k -> createBucket(limit));

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for key: {} (auth={})", key, auth);
            sendRateLimitResponse(response, request.getRequestURI());
        }
    }

    @SuppressWarnings("deprecation")
    private Bucket createBucket(int limitPerMinute) {
        Bandwidth limit = Bandwidth.classic(
                limitPerMinute,
                Refill.greedy(limitPerMinute, Duration.ofMinutes(1))
        );
        return Bucket.builder().addLimit(limit).build();
    }

    /**
     * SEC-015: endpoints sensíveis a força bruta/abuso que recebem o limite restrito.
     */
    private boolean isAuthEndpoint(String path) {
        if (path == null) return false;
        return path.equals("/api/auth/login")
                || path.equals("/api/auth/register")
                || path.equals("/api/auth/forgot-password")
                || path.equals("/api/auth/reset-password");
    }

    /**
     * SEC-015: resolve o IP do cliente sem confiar cegamente em cabeçalhos forjáveis.
     * Por padrão usa o IP do socket (request.getRemoteAddr), que o cliente não controla.
     * Quando a app roda atrás de um proxy confiável (trust-forward-header=true), usa o
     * ÚLTIMO valor do X-Forwarded-For — o salto adicionado pelo próprio proxy — evitando
     * o bypass em que o cliente injeta um X-Forwarded-For arbitrário por requisição.
     */
    private String getClientIp(HttpServletRequest request) {
        if (trustForwardHeader) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                String[] hops = xForwardedFor.split(",");
                String last = hops[hops.length - 1].trim();
                if (!last.isEmpty()) {
                    return last;
                }
            }
            String xRealIp = request.getHeader("X-Real-IP");
            if (xRealIp != null && !xRealIp.isBlank()) {
                return xRealIp.trim();
            }
        }
        return request.getRemoteAddr();
    }

    private void sendRateLimitResponse(HttpServletResponse response, String path) throws IOException {
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .error(HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase())
                .errorCode("RATE_LIMIT_EXCEEDED")
                .message("Limite de requisições excedido. Tente novamente em alguns segundos.")
                .path(path)
                .build();

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", "60");
        objectMapper.findAndRegisterModules();
        objectMapper.writeValue(response.getWriter(), error);
    }

    @Override
    @SuppressWarnings("null")
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        // Skip rate limiting for health checks and actuator endpoints
        return path.startsWith("/actuator/") ||
               path.startsWith("/api/public/health") ||
               path.startsWith("/api/public/ping");
    }
}
