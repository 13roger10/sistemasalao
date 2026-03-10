package com.belezza.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main application class for Belezza API.
 *
 * Belezza.ai - Social Studio for Beauty Salons
 * Backend API built with Spring Boot 3.2+
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableAsync
@EnableScheduling
public class BelezzaApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(BelezzaApiApplication.class, args);
    }
}
