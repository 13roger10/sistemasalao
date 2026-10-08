package com.belezza.api.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * SEC-A03: limite em memória com expurgo de baldes ociosos e caminho distribuído em Redis.
 */
@DisplayName("RateLimitFilter")
class RateLimitFilterTest {

    @SuppressWarnings("unchecked")
    private ObjectProvider<RedisTemplate<String, String>> semRedis() {
        ObjectProvider<RedisTemplate<String, String>> p = mock(ObjectProvider.class);
        when(p.getIfAvailable()).thenReturn(null);
        return p;
    }

    private RateLimitFilter filtroEmMemoria(int authPorMin, int geralPorMin) {
        RateLimitFilter f = new RateLimitFilter(semRedis());
        ReflectionTestUtils.setField(f, "rateLimitEnabled", true);
        ReflectionTestUtils.setField(f, "requestsPerMinute", geralPorMin);
        ReflectionTestUtils.setField(f, "authRequestsPerMinute", authPorMin);
        ReflectionTestUtils.setField(f, "trustForwardHeader", false);
        ReflectionTestUtils.setField(f, "maxTrackedKeys", 100000);
        return f;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Bucket> baldes(RateLimitFilter f) {
        return (Map<String, Bucket>) ReflectionTestUtils.getField(f, "buckets");
    }

    private int bater(RateLimitFilter f, String path, int vezes) throws Exception {
        int ok = 0;
        for (int i = 0; i < vezes; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", path);
            req.setServletPath(path);
            req.setRemoteAddr("10.0.0.7");
            MockHttpServletResponse resp = new MockHttpServletResponse();
            FilterChain chain = mock(FilterChain.class);
            f.doFilterInternal(req, resp, chain);
            if (resp.getStatus() != 429) ok++;
        }
        return ok;
    }

    @Test
    @DisplayName("em memória: libera até o limite de auth e bloqueia o excedente")
    void limiteAuthEmMemoria() throws Exception {
        RateLimitFilter f = filtroEmMemoria(5, 60);
        assertThat(bater(f, "/api/auth/login", 8)).isEqualTo(5);
    }

    @Test
    @DisplayName("expurgo remove balde cheio (ocioso) e mantém balde com consumo recente")
    void expurgaApenasOciosos() {
        RateLimitFilter f = filtroEmMemoria(5, 60);
        Map<String, Bucket> buckets = baldes(f);

        // Balde cheio (ocioso) no escopo geral.
        buckets.put("gen:1.1.1.1", cheio(60));
        // Balde com consumo recente (1 token a menos) no escopo auth.
        Bucket usado = cheio(5);
        usado.tryConsume(1);
        buckets.put("auth:2.2.2.2", usado);

        f.expurgarBaldesOciosos();

        assertThat(buckets).doesNotContainKey("gen:1.1.1.1");  // ocioso: removido
        assertThat(buckets).containsKey("auth:2.2.2.2");       // consumo recente: mantido
    }

    @SuppressWarnings("deprecation")
    private Bucket cheio(int limite) {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(limite, Refill.greedy(limite, Duration.ofMinutes(1))))
                .build();
    }

    @Test
    @DisplayName("distribuído: usa Redis (INCR+EXPIRE) e bloqueia acima do limite")
    void distribuidoViaRedis() throws Exception {
        @SuppressWarnings("unchecked")
        RedisTemplate<String, String> redis = mock(RedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        final long[] n = {0};
        when(ops.increment(any())).thenAnswer(inv -> ++n[0]); // 1,2,3,...

        @SuppressWarnings("unchecked")
        ObjectProvider<RedisTemplate<String, String>> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(redis);

        RateLimitFilter f = new RateLimitFilter(provider);
        ReflectionTestUtils.setField(f, "rateLimitEnabled", true);
        ReflectionTestUtils.setField(f, "requestsPerMinute", 60);
        ReflectionTestUtils.setField(f, "authRequestsPerMinute", 3);
        ReflectionTestUtils.setField(f, "trustForwardHeader", false);
        ReflectionTestUtils.setField(f, "maxTrackedKeys", 100000);

        assertThat(bater(f, "/api/auth/login", 5)).isEqualTo(3); // 1,2,3 passam; 4,5 bloqueiam
        verify(ops, times(5)).increment(any());
        verify(redis, times(1)).expire(any(), eq(70L), eq(TimeUnit.SECONDS)); // só na 1ª (contador==1)
        assertThat(baldes(f)).as("modo Redis não usa o mapa em memória").isEmpty();
    }

    @Test
    @DisplayName("desligado: não bloqueia nada")
    void desligado() throws Exception {
        RateLimitFilter f = filtroEmMemoria(1, 1);
        ReflectionTestUtils.setField(f, "rateLimitEnabled", false);
        assertThat(bater(f, "/api/auth/login", 10)).isEqualTo(10);
    }
}
