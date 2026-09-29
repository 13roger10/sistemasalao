package com.belezza.api.service;

import com.belezza.api.exception.RateLimitExceededException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("LoginAttemptService - bloqueio por conta contra força bruta (BUG-029)")
class LoginAttemptServiceTest {

    /** Relógio que o teste avança à mão. */
    static class Relogio extends Clock {
        Instant agora = Instant.parse("2026-09-29T12:00:00Z");
        @Override public ZoneId getZone() { return ZoneId.of("UTC"); }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return agora; }
        void avancar(Duration d) { agora = agora.plus(d); }
    }

    private Relogio relogio;
    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        relogio = new Relogio();
        service = new LoginAttemptService(relogio); // padrão: 5 tentativas, 15 minutos
    }

    private void errar(String email, int vezes) {
        for (int i = 0; i < vezes; i++) service.registrarFalha(email);
    }

    @Test
    @DisplayName("4 erros ainda deixam tentar; o 5º bloqueia o e-mail")
    void bloqueiaNoQuintoErro() {
        errar("ana@teste.com", 4);
        assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();

        service.registrarFalha("ana@teste.com");
        assertThatThrownBy(() -> service.verificarBloqueio("ana@teste.com"))
                .isInstanceOf(RateLimitExceededException.class)
                .hasMessageContaining("Tente novamente em 15 minutos");
    }

    @Test
    @DisplayName("O bloqueio vale para o e-mail em qualquer caixa, e não afeta outros e-mails")
    void porEmail() {
        errar("Ana@Teste.com ", 5);
        assertThatThrownBy(() -> service.verificarBloqueio("ana@teste.com")).isInstanceOf(RateLimitExceededException.class);
        assertThatCode(() -> service.verificarBloqueio("bia@teste.com")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Depois do tempo de bloqueio, o e-mail volta a poder tentar")
    void bloqueioExpira() {
        errar("ana@teste.com", 5);
        relogio.avancar(Duration.ofMinutes(14));
        assertThatThrownBy(() -> service.verificarBloqueio("ana@teste.com"))
                .hasMessageContaining("1 minuto");
        relogio.avancar(Duration.ofMinutes(1).plusSeconds(1));
        assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
        // e a contagem recomeça: um erro só não bloqueia de novo
        service.registrarFalha("ana@teste.com");
        assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Erros espalhados além da janela de 15 minutos não somam")
    void janela() {
        errar("ana@teste.com", 4);
        relogio.avancar(Duration.ofMinutes(16));
        service.registrarFalha("ana@teste.com");
        assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Login certo zera o contador")
    void sucessoZera() {
        errar("ana@teste.com", 4);
        service.registrarSucesso("ana@teste.com");
        errar("ana@teste.com", 4);
        assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
    }
}
