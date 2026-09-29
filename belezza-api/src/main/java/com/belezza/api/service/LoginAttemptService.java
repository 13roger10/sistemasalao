package com.belezza.api.service;

import com.belezza.api.exception.RateLimitExceededException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Proteção contra força bruta por conta (BUG-029). O limite por IP (RateLimitFilter) não basta:
 * fica desligado no ambiente local e, atrás do proxy do Next, todos os logins chegam do mesmo IP.
 * Depois de {@code max-tentativas} senhas erradas para o mesmo e-mail dentro da janela, o e-mail
 * fica bloqueado por {@code bloqueio-minutos}, mesmo com a senha certa. Vale para qualquer e-mail,
 * exista ou não a conta, para não revelar quais existem. Login certo zera o contador.
 *
 * <p>Em memória: com mais de uma instância da API, cada uma conta as próprias tentativas.
 */
@Service
@Slf4j
public class LoginAttemptService {

    private record Tentativas(int falhas, Instant primeira, Instant bloqueadoAte) {}

    private final Map<String, Tentativas> porEmail = new ConcurrentHashMap<>();
    private final Clock clock;

    @Value("${belezza.login.max-tentativas:5}")
    private int maxTentativas = 5;

    @Value("${belezza.login.bloqueio-minutos:15}")
    private int bloqueioMinutos = 15;

    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    private static String chave(String email) {
        return email == null ? "" : email.toLowerCase().trim();
    }

    /** Recusa a tentativa se o e-mail está bloqueado. */
    public void verificarBloqueio(String email) {
        Tentativas t = porEmail.get(chave(email));
        Instant agora = clock.instant();
        if (t != null && t.bloqueadoAte() != null && agora.isBefore(t.bloqueadoAte())) {
            long minutos = Math.max(1, (Duration.between(agora, t.bloqueadoAte()).getSeconds() + 59) / 60);
            throw new RateLimitExceededException("Muitas tentativas de login com este e-mail. Tente novamente em "
                    + minutos + (minutos == 1 ? " minuto" : " minutos") + " ou redefina a senha.");
        }
    }

    /** Conta uma senha (ou código 2FA) errada; ao atingir o limite, bloqueia o e-mail. */
    public void registrarFalha(String email) {
        Instant agora = clock.instant();
        Duration janela = Duration.ofMinutes(bloqueioMinutos);
        Tentativas t = porEmail.compute(chave(email), (k, atual) -> {
            // Fora da janela (ou bloqueio já vencido), a contagem recomeça
            if (atual == null || agora.isAfter(atual.primeira().plus(janela))
                    || (atual.bloqueadoAte() != null && !agora.isBefore(atual.bloqueadoAte()))) {
                atual = new Tentativas(0, agora, null);
            }
            int falhas = atual.falhas() + 1;
            Instant bloqueio = falhas >= maxTentativas ? agora.plus(janela) : null;
            return new Tentativas(falhas, atual.primeira(), bloqueio);
        });
        if (t.bloqueadoAte() != null && t.falhas() == maxTentativas) {
            log.warn("Login bloqueado por {} min após {} tentativas erradas: {}", bloqueioMinutos, t.falhas(), chave(email));
        }
    }

    /** Login certo: zera o contador do e-mail. */
    public void registrarSucesso(String email) {
        porEmail.remove(chave(email));
    }

    /** Descarta registros vencidos para o mapa não crescer sem limite. */
    @Scheduled(fixedRate = 600000)
    public void limpar() {
        Instant agora = clock.instant();
        Duration janela = Duration.ofMinutes(bloqueioMinutos);
        porEmail.entrySet().removeIf(e -> {
            Tentativas t = e.getValue();
            Instant fim = t.bloqueadoAte() != null ? t.bloqueadoAte() : t.primeira().plus(janela);
            return agora.isAfter(fim);
        });
    }
}
