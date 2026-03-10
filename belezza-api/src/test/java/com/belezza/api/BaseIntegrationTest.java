package com.belezza.api;

import com.belezza.api.config.TestContainersConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;

/**
 * Base class for integration tests using Testcontainers.
 *
 * This class provides:
 * - PostgreSQL container via Testcontainers
 * - JPA configuration
 * - Transaction management (each test runs in a transaction and rolls back)
 * - Test profile activation
 *
 * To use this in a test class, simply extend it:
 * <pre>
 * class MyRepositoryIT extends BaseIntegrationTest {
 *     // Your tests here
 * }
 * </pre>
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestContainersConfiguration.class)
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @Autowired
    protected DataSource dataSource;

    @BeforeEach
    void baseSetUp() {
        // Common setup for all integration tests can go here
    }
}
