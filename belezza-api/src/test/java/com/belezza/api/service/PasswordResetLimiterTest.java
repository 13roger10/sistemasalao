package com.belezza.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PasswordResetLimiter - limite de e-mails de redefinição por endereço")
class PasswordResetLimiterTest {

    private LoginAttemptServiceTest.Relogio relogio;
    private PasswordResetLimiter limiter;

    @BeforeEach
    void setUp() {
        relogio = new LoginAttemptServiceTest.Relogio();
        limiter = new PasswordResetLimiter(relogio); // padrão: 3 por hora, 2 min entre um e outro
    }

    @Test
    @DisplayName("Pedido repetido antes de 2 minutos é ignorado")
    void intervaloMinimo() {
        assertThat(limiter.permitir("ana@teste.com")).isTrue();
        relogio.avancar(Duration.ofSeconds(119));
        assertThat(limiter.permitir("ana@teste.com")).isFalse();
        relogio.avancar(Duration.ofSeconds(1));
        assertThat(limiter.permitir("ana@teste.com")).isTrue();
    }

    @Test
    @DisplayName("No máximo 3 por hora; a janela seguinte libera de novo")
    void maximoPorHora() {
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.permitir("ana@teste.com")).isTrue();
            relogio.avancar(Duration.ofMinutes(5));
        }
        assertThat(limiter.permitir("ana@teste.com")).isFalse();
        relogio.avancar(Duration.ofMinutes(30));
        assertThat(limiter.permitir("ana@teste.com")).isFalse();
        relogio.avancar(Duration.ofMinutes(15)); // 60 min desde o primeiro
        assertThat(limiter.permitir("ana@teste.com")).isTrue();
    }

    @Test
    @DisplayName("Maiúsculas e espaços contam como o mesmo e-mail; outro e-mail tem limite próprio")
    void porEndereco() {
        assertThat(limiter.permitir("ana@teste.com")).isTrue();
        assertThat(limiter.permitir("  ANA@Teste.com ")).isFalse();
        assertThat(limiter.permitir("bia@teste.com")).isTrue();
    }

    @Test
    @DisplayName("Pedido ignorado não estende a espera")
    void ignoradoNaoConta() {
        assertThat(limiter.permitir("ana@teste.com")).isTrue();
        for (int i = 0; i < 10; i++) {
            relogio.avancar(Duration.ofSeconds(10));
            assertThat(limiter.permitir("ana@teste.com")).isFalse();
        }
        relogio.avancar(Duration.ofSeconds(20)); // 120 s desde o primeiro
        assertThat(limiter.permitir("ana@teste.com")).isTrue();
    }
}
