package com.belezza.api.config;

import com.belezza.api.security.ApiKeyAuthFilter;
import com.belezza.api.security.JwtAuthenticationFilter;
import com.belezza.api.security.RateLimitFilter;
import lombok.RequiredArgsConstructor;
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
     * Public endpoints that don't require authentication.
     */
    private static final String[] PUBLIC_ENDPOINTS = {
        "/api/auth/**",
        "/api/public/**",
        "/api/v1/**",      // Public API v1 — authenticated by ApiKeyAuthFilter via X-API-Key
        "/ws/**",          // WebSocket handshake (auth happens inside STOMP CONNECT)
        "/api/usuarios/roles",
        "/api/agendamentos/**",
        "/api/profissionais/**",
        "/api/servicos/**",
        "/api/clientes/**",
        "/api/salon/**",
        "/actuator/health",
        "/actuator/health/**",
        "/actuator/info"
    };

    /**
     * Swagger/OpenAPI endpoints.
     */
    private static final String[] SWAGGER_ENDPOINTS = {
        "/swagger-ui/**",
        "/swagger-ui.html",
        "/v3/api-docs/**",
        "/api-docs/**",
        "/swagger-resources/**",
        "/webjars/**",
        "/h2-console/**"
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
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                .requestMatchers(SWAGGER_ENDPOINTS).permitAll()

                // Allow OPTIONS requests (CORS preflight)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Admin-only endpoints
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Profissional or Admin endpoints
                .requestMatchers("/api/profissional/**").hasAnyRole("ADMIN", "PROFISSIONAL")

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )

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
