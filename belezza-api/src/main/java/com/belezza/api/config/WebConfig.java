package com.belezza.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC configuration including CORS settings.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

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

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(allowedOrigins.split(","))
            .allowedMethods(allowedMethods.split(","))
            .allowedHeaders(allowedHeaders.split(","))
            .exposedHeaders(exposedHeaders.split(","))
            .allowCredentials(allowCredentials)
            .maxAge(maxAge);
    }
}
