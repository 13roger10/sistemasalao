package com.belezza.api.performance

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

/**
 * Basic load test simulation for Belezza API.
 *
 * This simulation tests:
 * - Authentication endpoints
 * - Metrics endpoints
 * - Concurrent user scenarios
 *
 * Run with: mvn gatling:test
 */
class BasicSimulation extends Simulation {

  // Configuration
  val baseUrl = System.getProperty("baseUrl", "http://localhost:8080")
  val users = Integer.getInteger("users", 100)
  val duration = Integer.getInteger("duration", 60).seconds

  // HTTP Protocol Configuration
  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/LoadTest")

  // Scenarios

  /**
   * Scenario 1: Login flow
   * Simulates users logging in
   */
  val loginScenario = scenario("Login Flow")
    .exec(http("Login")
      .post("/api/auth/login")
      .body(StringBody("""{"email":"test@example.com","password":"password"}"""))
      .check(status.is(200))
      .check(jsonPath("$.accessToken").saveAs("token"))
    )
    .pause(1)

  /**
   * Scenario 2: Get user profile
   * Requires authentication
   */
  val profileScenario = scenario("Get Profile")
    .exec(http("Login")
      .post("/api/auth/login")
      .body(StringBody("""{"email":"test@example.com","password":"password"}"""))
      .check(status.is(200))
      .check(jsonPath("$.accessToken").saveAs("token"))
    )
    .pause(1)
    .exec(http("Get Profile")
      .get("/api/auth/me")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
    )

  /**
   * Scenario 3: Get metrics
   * Simulates salon owners checking their metrics
   */
  val metricsScenario = scenario("Get Metrics")
    .exec(http("Login")
      .post("/api/auth/login")
      .body(StringBody("""{"email":"admin@example.com","password":"password"}"""))
      .check(status.is(200))
      .check(jsonPath("$.accessToken").saveAs("token"))
    )
    .pause(1)
    .exec(http("Get Scheduling Metrics")
      .get("/api/metricas/agendamentos")
      .queryParam("salonId", "1")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
    )
    .pause(2)
    .exec(http("Get Financial Metrics")
      .get("/api/metricas/faturamento")
      .queryParam("salonId", "1")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
    )
    .pause(2)
    .exec(http("Get Social Metrics")
      .get("/api/metricas/social")
      .queryParam("salonId", "1")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
    )

  /**
   * Scenario 4: Health check
   * Simulates monitoring systems
   */
  val healthCheckScenario = scenario("Health Check")
    .exec(http("Health Check")
      .get("/actuator/health")
      .check(status.is(200))
    )
    .pause(5)

  // Load injection strategies

  /**
   * Setup 1: Gradual ramp-up
   * Slowly increases load to test system under increasing pressure
   */
  val gradualRampUp = setUp(
    loginScenario.inject(
      rampUsers(users / 4) during (duration / 4)
    ),
    profileScenario.inject(
      rampUsers(users / 4) during (duration / 4)
    ),
    metricsScenario.inject(
      rampUsers(users / 4) during (duration / 4)
    ),
    healthCheckScenario.inject(
      constantUsersPerSec(2) during duration
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.max.lt(5000),  // Max response time < 5s
      global.successfulRequests.percent.gt(95)  // 95% success rate
    )

  /**
   * Setup 2: Spike test
   * Sudden burst of users to test system resilience
   */
  val spikeTest = setUp(
    metricsScenario.inject(
      nothingFor(5.seconds),
      atOnceUsers(users)  // All users at once
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.max.lt(10000),  // Allow higher response time for spike
      global.failedRequests.percent.lt(10)  // Allow some failures during spike
    )

  /**
   * Setup 3: Sustained load
   * Constant load over time to test stability
   */
  val sustainedLoad = setUp(
    loginScenario.inject(
      constantUsersPerSec(2) during duration
    ),
    metricsScenario.inject(
      constantUsersPerSec(5) during duration
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.mean.lt(2000),  // Mean response time < 2s
      global.successfulRequests.percent.gt(99)  // 99% success rate
    )

  // Default: Use gradual ramp-up
  gradualRampUp
}
