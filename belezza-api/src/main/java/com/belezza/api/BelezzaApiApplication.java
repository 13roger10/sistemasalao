package com.belezza.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

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
        // Horários de agendamento, caixa e antecedência são LocalDateTime no horário de Brasília.
        // Em contêiner o fuso padrão é UTC: "agora" ficava 3 h adiantado e a antecedência mínima
        // de 2 h virava 5 h (e o horário das próximas 3 h era recusado como "passado").
        TimeZone.setDefault(TimeZone.getTimeZone("America/Sao_Paulo"));
        SpringApplication.run(BelezzaApiApplication.class, args);
    }
}
