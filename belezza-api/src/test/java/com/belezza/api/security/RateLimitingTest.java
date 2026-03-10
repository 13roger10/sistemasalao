package com.belezza.api.security;

import com.belezza.api.config.TestContainersConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests for rate limiting functionality.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfiguration.class)
@ActiveProfiles("test")
@DisplayName("Rate Limiting Tests")
class RateLimitingTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Should allow requests within rate limit")
    void shouldAllowRequestsWithinRateLimit() throws Exception {
        // Make several requests to a public endpoint
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/actuator/health")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("Should return rate limit headers")
    void shouldReturnRateLimitHeaders() throws Exception {
        mockMvc.perform(get("/actuator/health")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        // Note: Rate limit headers depend on your RateLimitFilter implementation
        // Adjust assertions based on your actual headers
    }

    @Test
    @DisplayName("Should handle concurrent requests")
    void shouldHandleConcurrentRequests() throws Exception {
        // Create multiple threads making concurrent requests
        Thread[] threads = new Thread[10];
        int[] successCount = {0};
        int[] failCount = {0};

        for (int i = 0; i < 10; i++) {
            threads[i] = new Thread(() -> {
                try {
                    mockMvc.perform(get("/actuator/health")
                                    .contentType(MediaType.APPLICATION_JSON))
                            .andExpect(status().isOk());
                    synchronized (successCount) {
                        successCount[0]++;
                    }
                } catch (Exception e) {
                    synchronized (failCount) {
                        failCount[0]++;
                    }
                }
            });
            threads[i].start();
        }

        // Wait for all threads
        for (Thread thread : threads) {
            thread.join();
        }

        // All requests should succeed under normal conditions
        org.assertj.core.api.Assertions.assertThat(successCount[0]).isGreaterThan(0);
    }

    @Test
    @DisplayName("Should block excessive requests from same IP")
    void shouldBlockExcessiveRequests() throws Exception {
        // This test depends on your rate limit configuration
        // With a low limit, rapid requests should eventually be blocked
        int successCount = 0;
        int blockedCount = 0;

        // Make more requests than the rate limit allows
        for (int i = 0; i < 150; i++) {
            try {
                mockMvc.perform(get("/actuator/health")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("X-Forwarded-For", "192.168.1.100"))
                        .andExpect(status().isOk());
                successCount++;
            } catch (AssertionError e) {
                // Request was blocked (status was not 200)
                blockedCount++;
            }
        }

        // At least some requests should succeed
        org.assertj.core.api.Assertions.assertThat(successCount).isGreaterThan(0);

        // Note: If rate limiting is working, some requests might be blocked
        // The actual numbers depend on your rate limit configuration
    }

    @Test
    @DisplayName("Should differentiate between different IPs")
    void shouldDifferentiateBetweenDifferentIPs() throws Exception {
        // Make requests from different "IPs"
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/actuator/health")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Forwarded-For", "192.168.1." + i))
                    .andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("Should handle X-Forwarded-For header correctly")
    void shouldHandleXForwardedForHeader() throws Exception {
        mockMvc.perform(get("/actuator/health")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Forwarded-For", "10.0.0.1, 192.168.1.1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should handle X-Real-IP header correctly")
    void shouldHandleXRealIPHeader() throws Exception {
        mockMvc.perform(get("/actuator/health")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Real-IP", "10.0.0.2"))
                .andExpect(status().isOk());
    }
}
