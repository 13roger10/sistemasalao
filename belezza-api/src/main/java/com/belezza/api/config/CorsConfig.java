package com.belezza.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * CORS Configuration for the Belezza API.
 *
 * Configures Cross-Origin Resource Sharing to allow
 * the frontend application to make requests to the API.
 */
@Configuration
public class CorsConfig {

    @Value("${belezza.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Value("${belezza.cors.allowed-methods:GET,POST,PUT,DELETE,PATCH,OPTIONS}")
    private String allowedMethods;

    @Value("${belezza.cors.allowed-headers:*}")
    private String allowedHeaders;

    @Value("${belezza.cors.exposed-headers:Authorization,X-Request-Id}")
    private String exposedHeaders;

    @Value("${belezza.cors.allow-credentials:true}")
    private boolean allowCredentials;

    @Value("${belezza.cors.max-age:3600}")
    private long maxAge;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Set allowed origins
        configuration.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));

        // Set allowed methods
        configuration.setAllowedMethods(Arrays.asList(allowedMethods.split(",")));

        // Set allowed headers
        if ("*".equals(allowedHeaders)) {
            configuration.setAllowedHeaders(List.of("*"));
        } else {
            configuration.setAllowedHeaders(Arrays.asList(allowedHeaders.split(",")));
        }

        // Set exposed headers
        configuration.setExposedHeaders(Arrays.asList(exposedHeaders.split(",")));

        // Set credentials
        configuration.setAllowCredentials(allowCredentials);

        // Set max age
        configuration.setMaxAge(maxAge);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
