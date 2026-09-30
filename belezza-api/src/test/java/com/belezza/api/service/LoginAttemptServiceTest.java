package com.belezza.api.service;

import com.belezza.api.exception.RateLimitExceededException;
import com.belezza.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("LoginAttemptService - bloqueio após 6 senhas erradas")
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

    @BeforeEach
    void setUp() {
        relogio = new Relogio();
    }

    @Nested
    @DisplayName("E-mail sem conta (limite em memória)")
    class EmMemoria {

        private LoginAttemptService service;

        @BeforeEach
        void setUp() {
            service = new LoginAttemptService(relogio); // padrão: 6 tentativas, 15 minutos
        }

        private void errar(String email, int vezes) {
            for (int i = 0; i < vezes; i++) service.registrarFalha(email);
        }

        @Test
        @DisplayName("5 erros ainda deixam tentar; o 6º bloqueia")
        void bloqueiaNoSextoErro() {
            errar("ana@teste.com", 5);
            assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
            service.registrarFalha("ana@teste.com");
            assertThatThrownBy(() -> service.verificarBloqueio("ana@teste.com"))
                    .isInstanceOf(RateLimitExceededException.class)
                    .hasMessage(LoginAttemptService.MENSAGEM_BLOQUEIO);
        }

        @Test
        @DisplayName("Vale para o e-mail em qualquer caixa, e não afeta outros e-mails")
        void porEmail() {
            errar("Ana@Teste.com ", 6);
            assertThatThrownBy(() -> service.verificarBloqueio("ana@teste.com")).isInstanceOf(RateLimitExceededException.class);
            assertThatCode(() -> service.verificarBloqueio("bia@teste.com")).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Sem conta, o limite em memória vence depois de 15 minutos")
        void memoriaExpira() {
            errar("ana@teste.com", 6);
            relogio.avancar(Duration.ofMinutes(15).plusSeconds(1));
            assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Login certo zera o contador")
        void sucessoZera() {
            errar("ana@teste.com", 5);
            service.registrarSucesso("ana@teste.com");
            errar("ana@teste.com", 5);
            assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Conta existente (bloqueio gravado no banco)")
    class NoBanco {

        private final UsuarioRepository repo = mock(UsuarioRepository.class);
        private LoginAttemptService service;

        @BeforeEach
        void setUp() {
            service = new LoginAttemptService(relogio, repo);
            when(repo.incrementarFalhasLogin(anyString())).thenReturn(1); // a conta existe
        }

        @Test
        @DisplayName("Cada erro soma no banco e pede o bloqueio ao atingir 6")
        void somaEBloqueia() {
            service.registrarFalha(" Ana@Teste.com");
            verify(repo).incrementarFalhasLogin("ana@teste.com");
            verify(repo).bloquearLoginSeAtingiuLimite(eq("ana@teste.com"), eq(6), any());
        }

        @Test
        @DisplayName("Conta bloqueada no banco recusa o login — mesmo com o tempo passando")
        void bloqueioNaoPassaComOTempo() {
            when(repo.isLoginBloqueado("ana@teste.com")).thenReturn(true);
            relogio.avancar(Duration.ofDays(3));
            assertThatThrownBy(() -> service.verificarBloqueio("ana@teste.com"))
                    .isInstanceOf(RateLimitExceededException.class)
                    .hasMessageContaining("Esqueci minha senha")
                    .hasMessageContaining("administrador");
        }

        @Test
        @DisplayName("Desbloquear (senha redefinida ou admin) zera o contador no banco e na memória")
        void desbloquear() {
            for (int i = 0; i < 6; i++) service.registrarFalha("ana@teste.com");
            service.desbloquear("ana@teste.com");

            verify(repo).zerarFalhasLogin("ana@teste.com");
            when(repo.isLoginBloqueado("ana@teste.com")).thenReturn(false);
            assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Por IP (password spraying e bloqueio de contas em massa)")
    class PorIp {

        private final com.belezza.api.security.ClientIpResolver ips = mock(com.belezza.api.security.ClientIpResolver.class);
        private LoginAttemptService service;

        @BeforeEach
        void setUp() {
            service = new LoginAttemptService(relogio, null, ips);
            when(ips.ipAtual()).thenReturn("203.0.113.7");
        }

        private void errarEmContasDiferentes(int vezes) {
            for (int i = 0; i < vezes; i++) service.registrarFalha("conta" + i + "@teste.com");
        }

        @Test
        @DisplayName("19 senhas erradas em contas diferentes passam; a 20ª bloqueia o IP por 30 minutos")
        void bloqueiaNoVigesimo() {
            errarEmContasDiferentes(19);
            assertThatCode(() -> service.verificarBloqueio("outra@teste.com")).doesNotThrowAnyException();
            service.registrarFalha("conta19@teste.com");
            assertThatThrownBy(() -> service.verificarBloqueio("qualquer@teste.com"))
                    .isInstanceOf(RateLimitExceededException.class)
                    .hasMessageContaining("desta rede")
                    .hasMessageContaining("30 minutos");
        }

        @Test
        @DisplayName("Outro IP não é afetado, e o bloqueio do IP vence depois do tempo")
        void outroIpEExpiracao() {
            errarEmContasDiferentes(20);
            when(ips.ipAtual()).thenReturn("198.51.100.9");
            assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();

            when(ips.ipAtual()).thenReturn("203.0.113.7");
            relogio.avancar(Duration.ofMinutes(30).plusSeconds(1));
            assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Erros espalhados além da janela de 15 minutos não somam no IP")
        void janelaDoIp() {
            errarEmContasDiferentes(19);
            relogio.avancar(Duration.ofMinutes(16));
            service.registrarFalha("mais@teste.com");
            assertThatCode(() -> service.verificarBloqueio("ana@teste.com")).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Login certo não zera o contador do IP")
        void sucessoNaoZeraIp() {
            errarEmContasDiferentes(19);
            service.registrarSucesso("minha@teste.com");
            service.registrarFalha("vitima@teste.com");
            assertThatThrownBy(() -> service.verificarBloqueio("vitima2@teste.com")).isInstanceOf(RateLimitExceededException.class);
        }
    }

    private static String anyString() {
        return org.mockito.ArgumentMatchers.anyString();
    }
}
