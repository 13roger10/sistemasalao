package com.belezza.api.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * TestContainers configuration for integration tests.
 * This configuration provides a PostgreSQL container for testing.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestContainersConfiguration {

    /**
     * Creates a PostgreSQL test container.
     * The @ServiceConnection annotation automatically configures Spring Boot's DataSource
     * to use this container.
     */
    @Bean
    @ServiceConnection
    public PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
                .withDatabaseName("belezza_test")
                .withUsername("belezza_test")
                .withPassword("belezza_test")
                .withReuse(true); // Reuse container across test runs for faster execution
    }
}
