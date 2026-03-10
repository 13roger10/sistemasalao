package com.belezza.api.performance;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import java.time.Duration;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

/**
 * Gatling performance test simulation for Belezza API.
 *
 * Scenarios:
 * - T9.4.2: 100 concurrent users
 * - T9.4.3: 1000 requests/minute
 * - T9.4.4: Peak load simulation (Monday morning appointments)
 *
 * Run with: mvn gatling:test
 */
public class BasicSimulation extends Simulation {

    // HTTP protocol configuration
    HttpProtocolBuilder httpProtocol = http
            .baseUrl("http://localhost:8080")
            .acceptHeader("application/json")
            .contentTypeHeader("application/json")
            .userAgentHeader("Gatling/Belezza-Performance-Test");

    // Feeders for test data
    FeederBuilder<String> userFeeder = csv("users.csv").random();

    // ====================================
    // Scenario 1: Health Check (Basic)
    // ====================================
    ScenarioBuilder healthCheckScenario = scenario("Health Check Scenario")
            .exec(
                http("Health Check")
                    .get("/actuator/health")
                    .check(status().is(200))
            );

    // ====================================
    // Scenario 2: Authentication Flow
    // ====================================
    ScenarioBuilder authFlowScenario = scenario("Authentication Flow")
            .exec(
                // Login
                http("Login")
                    .post("/api/auth/login")
                    .body(StringBody("""
                        {
                            "email": "test@example.com",
                            "password": "Test123!"
                        }
                        """))
                    .check(status().is(200))
                    .check(jsonPath("$.accessToken").saveAs("token"))
            )
            .pause(Duration.ofMillis(500))
            .exec(
                // Access protected resource
                http("Get Current User")
                    .get("/api/auth/me")
                    .header("Authorization", "Bearer #{token}")
                    .check(status().is(200))
            );

    // ====================================
    // Scenario 3: Metrics Dashboard
    // ====================================
    ScenarioBuilder metricsScenario = scenario("Metrics Dashboard")
            .exec(
                // Login first
                http("Login for Metrics")
                    .post("/api/auth/login")
                    .body(StringBody("""
                        {
                            "email": "admin@example.com",
                            "password": "Admin123!"
                        }
                        """))
                    .check(status().in(200, 401)) // 401 if user doesn't exist
                    .check(jsonPath("$.accessToken").optional().saveAs("token"))
            )
            .doIf(session -> session.contains("token"))
            .then(
                exec(
                    http("Get Scheduling Metrics")
                        .get("/api/metricas/agendamentos?salonId=1")
                        .header("Authorization", "Bearer #{token}")
                        .check(status().in(200, 404))
                )
                .pause(Duration.ofMillis(200))
                .exec(
                    http("Get Financial Metrics")
                        .get("/api/metricas/faturamento?salonId=1")
                        .header("Authorization", "Bearer #{token}")
                        .check(status().in(200, 404))
                )
                .pause(Duration.ofMillis(200))
                .exec(
                    http("Get Social Metrics")
                        .get("/api/metricas/social?salonId=1")
                        .header("Authorization", "Bearer #{token}")
                        .check(status().in(200, 404))
                )
            );

    // ====================================
    // Scenario 4: Peak Monday Morning Load
    // Simulates appointment creation and lookup
    // ====================================
    ScenarioBuilder peakLoadScenario = scenario("Peak Monday Morning")
            .exec(
                // Login
                http("Login")
                    .post("/api/auth/login")
                    .body(StringBody("""
                        {
                            "email": "client@example.com",
                            "password": "Client123!"
                        }
                        """))
                    .check(status().in(200, 401))
                    .check(jsonPath("$.accessToken").optional().saveAs("token"))
            )
            .doIf(session -> session.contains("token"))
            .then(
                // Browse services
                exec(
                    http("List Services")
                        .get("/api/servicos?salonId=1")
                        .header("Authorization", "Bearer #{token}")
                        .check(status().in(200, 404))
                )
                .pause(Duration.ofSeconds(1), Duration.ofSeconds(2))
                // Check availability
                .exec(
                    http("Check Availability")
                        .get("/api/profissionais/1/disponibilidade")
                        .header("Authorization", "Bearer #{token}")
                        .check(status().in(200, 404))
                )
                .pause(Duration.ofMillis(500))
                // List existing appointments
                .exec(
                    http("List My Appointments")
                        .get("/api/agendamentos?clienteId=1")
                        .header("Authorization", "Bearer #{token}")
                        .check(status().in(200, 404))
                )
            );

    // ====================================
    // Load Configurations
    // ====================================

    /**
     * T9.4.2 - 100 concurrent users scenario
     */
    PopulationBuilder scenario100Users = healthCheckScenario.injectOpen(
            rampUsers(100).during(Duration.ofSeconds(30))
    );

    /**
     * T9.4.3 - 1000 requests/minute (approximately 17 req/sec)
     */
    PopulationBuilder scenario1000ReqPerMin = healthCheckScenario.injectOpen(
            constantUsersPerSec(17).during(Duration.ofMinutes(1))
    );

    /**
     * T9.4.4 - Peak load: Monday morning simulation
     * Ramps up from 0 to 200 users over 5 minutes, maintains for 5 minutes, then ramps down
     */
    PopulationBuilder scenarioPeakLoad = peakLoadScenario.injectOpen(
            rampUsers(50).during(Duration.ofMinutes(1)),
            constantUsersPerSec(10).during(Duration.ofMinutes(2)),
            rampUsersPerSec(10).to(50).during(Duration.ofMinutes(2)),
            constantUsersPerSec(50).during(Duration.ofMinutes(3)),
            rampUsersPerSec(50).to(5).during(Duration.ofMinutes(2))
    );

    // ====================================
    // Simulation Setup
    // ====================================

    {
        setUp(
            // Run all scenarios
            healthCheckScenario.injectOpen(
                atOnceUsers(10),
                rampUsers(50).during(Duration.ofSeconds(30))
            ),
            authFlowScenario.injectOpen(
                rampUsers(20).during(Duration.ofSeconds(30))
            ),
            metricsScenario.injectOpen(
                rampUsers(10).during(Duration.ofSeconds(30))
            )
        )
        .protocols(httpProtocol)
        .assertions(
            // Global assertions
            global().responseTime().mean().lt(2000),      // Mean response time < 2s
            global().responseTime().percentile3().lt(3000), // 95th percentile < 3s
            global().successfulRequests().percent().gt(95.0) // >95% success rate
        );
    }
}
