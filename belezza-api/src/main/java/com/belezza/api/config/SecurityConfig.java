package com.belezza.api.config;

import com.belezza.api.security.ApiKeyAuthFilter;
import com.belezza.api.security.JwtAuthenticationFilter;
import com.belezza.api.security.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Spring Security configuration for the Belezza API.
 *
 * Configures:
 * - Stateless session management (JWT-based)
 * - CORS settings
 * - CSRF disabled (API uses JWT)
 * - Public and protected endpoint patterns
 * - JWT authentication filter
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ApiKeyAuthFilter apiKeyAuthFilter;
    private final RateLimitFilter rateLimitFilter;
    private final UserDetailsService userDetailsService;
    private final CorsConfigurationSource corsConfigurationSource;

    /**
     * SEC-010: o console H2 só deve ser acessível quando explicitamente habilitado
     * (perfil local/dev). Em produção fica desligado, então o permitAll de /h2-console
     * abaixo só é registrado quando o console está ligado.
     */
    @Value("${spring.h2.console.enabled:false}")
    private boolean h2ConsoleEnabled;

    /**
     * Public endpoints that don't require authentication.
     */
    private static final String[] PUBLIC_ENDPOINTS = {
        "/api/auth/**",
        "/api/public/**",  // Token-based confirm/cancel links, public v1 booking surface
        "/api/v1/**",      // Public API v1 — authenticated by ApiKeyAuthFilter via X-API-Key
        "/api/webhooks/**", // SEC-017: chamados pela Meta sem JWT — GET valida verify-token,
                            // POST valida assinatura HMAC (X-Hub-Signature-256) no controller
        "/ws/**",          // WebSocket handshake (auth happens inside STOMP CONNECT)
        "/api/usuarios/roles",
        // SEC-003: /api/agendamentos/** NÃO é mais público. Ele expunha
        // GET /api/agendamentos/{id} sem autenticação (IDOR — qualquer pessoa lia o
        // agendamento de qualquer cliente/salão iterando o ID). Agora todo o recurso
        // exige autenticação; apenas a consulta de disponibilidade (sem PII) permanece
        // pública, declarada abaixo via requestMatchers(GET, .../disponibilidade).
        // O confirmar/cancelar público continua por token secreto em /api/public/**.
        "/api/servicos/**",     // Service menu — no PII, admin writes are still @AdminOnly
        "/actuator/health",
        "/actuator/health/**",
        "/actuator/info"
    };
    // /api/clientes/**, /api/profissionais/**, and /api/salon/** (client rosters, staff PII,
    // financial data) were removed from this list: they require authentication and, within
    // each controller, a role + tenant (salon) check — see BUG #002/#004/#005 in the audit.

    /**
     * Swagger/OpenAPI endpoints.
     */
    private static final String[] SWAGGER_ENDPOINTS = {
        "/swagger-ui/**",
        "/swagger-ui.html",
        "/v3/api-docs/**",
        "/api-docs/**",
        "/swagger-resources/**",
        "/webjars/**"
        // SEC-010: /h2-console/** removido daqui. Só é liberado (via requestMatchers no
        // securityFilterChain) quando spring.h2.console.enabled=true — nunca em produção.
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF (not needed for stateless JWT API)
            .csrf(AbstractHttpConfigurer::disable)

            // Disable HTTP Basic authentication (using JWT instead)
            .httpBasic(AbstractHttpConfigurer::disable)

            // Disable form login
            .formLogin(AbstractHttpConfigurer::disable)

            // Configure CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource))

            // Set session management to stateless
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Configure authorization rules
            .authorizeHttpRequests(auth -> {
                // Public endpoints
                auth.requestMatchers(PUBLIC_ENDPOINTS).permitAll();
                auth.requestMatchers(SWAGGER_ENDPOINTS).permitAll();

                // Allow OPTIONS requests (CORS preflight)
                auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();

                // SEC-003: única rota pública de agendamentos — consulta de horários
                // disponíveis (sem dados pessoais), usada pelo calendário de reserva.
                auth.requestMatchers(HttpMethod.GET, "/api/agendamentos/disponibilidade").permitAll();

                // SEC-010: console H2 só é público quando explicitamente habilitado
                // (perfil local/dev); em produção nunca é registrado.
                if (h2ConsoleEnabled) {
                    auth.requestMatchers("/h2-console/**").permitAll();
                }

                // Admin-only endpoints
                auth.requestMatchers("/api/admin/**").hasRole("ADMIN");

                // Profissional or Admin endpoints
                auth.requestMatchers("/api/profissional/**").hasAnyRole("ADMIN", "PROFISSIONAL");

                // Receptionist or Admin endpoints
                auth.requestMatchers("/api/recepcao/**").hasAnyRole("ADMIN", "RECEPCIONISTA");

                // All other endpoints require authentication
                auth.anyRequest().authenticated();
            })

            // Allow frames for H2 console
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))

            // Set authentication provider
            .authenticationProvider(authenticationProvider())

            // Add Rate Limit filter first
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)

            // Add API Key filter (handles /api/v1/** requests)
            .addFilterBefore(apiKeyAuthFilter, UsernamePasswordAuthenticationFilter.class)

            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
