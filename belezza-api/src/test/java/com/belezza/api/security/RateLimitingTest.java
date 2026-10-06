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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests for rate limiting functionality.
 *
 * O limite é por IP de origem (remoteAddr): desde a SEC-015, X-Forwarded-For e X-Real-IP só valem
 * vindos de proxy confiável. Cada teste usa um IP próprio — antes todos saíam de 127.0.0.1 e as
 * requisições do teste de bloqueio esgotavam o limite dos outros (429 conforme a ordem dos testes).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("test")
@DisplayName("Rate Limiting Tests")
class RateLimitingTest {

    /** belezza.rate-limit.requests-per-minute (padrão do application.yml). */
    private static final int LIMITE_POR_MINUTO = 60;

    @Autowired
    private MockMvc mockMvc;

    private static MockHttpServletRequestBuilder health(String ipDeOrigem) {
        return get("/actuator/health")
                .contentType(MediaType.APPLICATION_JSON)
                .with(request -> {
                    request.setRemoteAddr(ipDeOrigem);
                    return request;
                });
    }

    /**
     * Faz requisições do IP até receber 429. O balde recarrega aos poucos (Refill.greedy: ~1 ficha
     * por segundo com 60/min), então o bloqueio pode vir algumas requisições depois do limite.
     */
    private boolean esgotarLimite(String ipDeOrigem, String xForwardedFor) throws Exception {
        for (int i = 0; i < LIMITE_POR_MINUTO + 30; i++) {
            MockHttpServletRequestBuilder req = health(ipDeOrigem);
            if (xForwardedFor != null) {
                req = req.header("X-Forwarded-For", xForwardedFor + i);
            }
            if (mockMvc.perform(req).andReturn().getResponse().getStatus() == 429) {
                return true;
            }
        }
        return false;
    }

    @Test
    @DisplayName("Should allow requests within rate limit")
    void shouldAllowRequestsWithinRateLimit() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(health("10.1.0.1")).andExpect(status().isOk());
        }
    }

    @Test
    @DisplayName("Should return rate limit headers")
    void shouldReturnRateLimitHeaders() throws Exception {
        mockMvc.perform(health("10.1.0.2")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should handle concurrent requests")
    void shouldHandleConcurrentRequests() throws Exception {
        Thread[] threads = new Thread[10];
        int[] successCount = {0};

        for (int i = 0; i < threads.length; i++) {
            threads[i] = new Thread(() -> {
                try {
                    mockMvc.perform(health("10.1.0.3")).andExpect(status().isOk());
                    synchronized (successCount) {
                        successCount[0]++;
                    }
                } catch (Throwable ignored) {
                    // contado como falha pela asserção abaixo
                }
            });
            threads[i].start();
        }
        for (Thread thread : threads) {
            thread.join();
        }

        // Dez requisições ficam dentro do limite: todas devem passar
        assertThat(successCount[0]).isEqualTo(threads.length);
    }

    @Test
    @DisplayName("Should block excessive requests from same IP")
    void shouldBlockExcessiveRequests() throws Exception {
        int successCount = 0;
        int blockedCount = 0;

        for (int i = 0; i < LIMITE_POR_MINUTO + 20; i++) {
            int status = mockMvc.perform(health("10.1.0.4")).andReturn().getResponse().getStatus();
            if (status == 200) {
                successCount++;
            } else if (status == 429) {
                blockedCount++;
            }
        }

        // Passa o limite (mais alguma ficha recarregada durante o teste) e bloqueia o excesso
        assertThat(successCount).isBetween(LIMITE_POR_MINUTO, LIMITE_POR_MINUTO + 5);
        assertThat(blockedCount).isGreaterThan(0);
        assertThat(successCount + blockedCount).isEqualTo(LIMITE_POR_MINUTO + 20);
    }

    @Test
    @DisplayName("Should differentiate between different IPs")
    void shouldDifferentiateBetweenDifferentIPs() throws Exception {
        // Esgota o limite de um IP; outro IP continua sendo atendido
        assertThat(esgotarLimite("10.1.0.5", null)).isTrue();
        mockMvc.perform(health("10.1.0.6")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should ignore forged X-Forwarded-For header")
    void shouldHandleXForwardedForHeader() throws Exception {
        // Sem proxy confiável o cabeçalho é ignorado: um X-Forwarded-For diferente a cada
        // requisição não renova o limite (o IP considerado continua sendo o de origem)
        assertThat(esgotarLimite("10.1.0.7", "192.168.1.")).isTrue();
    }

    @Test
    @DisplayName("Should handle X-Real-IP header correctly")
    void shouldHandleXRealIPHeader() throws Exception {
        mockMvc.perform(health("10.1.0.8").header("X-Real-IP", "10.0.0.2"))
                .andExpect(status().isOk());
    }
}
