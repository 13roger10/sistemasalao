package com.belezza.api.service;

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
 * Limite de e-mails de "Esqueci minha senha" por endereço: no máximo {@code max-por-email} em
 * {@code janela-minutos}, com pelo menos {@code intervalo-minimo-segundos} entre um e outro. Sem
 * isso, qualquer um enchia a caixa de entrada de alguém com e-mails de redefinição (o limite por
 * IP não segura quem troca de IP ou vai devagar).
 *
 * <p>Vale também para e-mails sem conta, e quem passa do limite recebe a mesma resposta de
 * sempre — só o e-mail não sai —, para o limite não revelar quais contas existem.
 */
@Service
@Slf4j
public class PasswordResetLimiter {

    private record Envios(int quantidade, Instant primeiro, Instant ultimo) {}

    private final Map<String, Envios> porEmail = new ConcurrentHashMap<>();
    private final Clock clock;

    @Value("${belezza.senha.reset-max-por-email:3}")
    private int maxPorEmail = 3;

    @Value("${belezza.senha.reset-janela-minutos:60}")
    private int janelaMinutos = 60;

    @Value("${belezza.senha.reset-intervalo-minimo-segundos:120}")
    private int intervaloMinimoSegundos = 120;

    public PasswordResetLimiter() {
        this(Clock.systemUTC());
    }

    PasswordResetLimiter(Clock clock) {
        this.clock = clock;
    }

    private static String chave(String email) {
        return email == null ? "" : email.toLowerCase().trim();
    }

    public Duration intervaloMinimo() {
        return Duration.ofSeconds(intervaloMinimoSegundos);
    }

    /**
     * Conta um pedido de redefinição para o e-mail. Devolve {@code false} quando o e-mail já
     * atingiu o limite (ou o último pedido foi há pouco) — nesse caso nada deve ser enviado.
     */
    public boolean permitir(String email) {
        Instant agora = clock.instant();
        Duration janela = Duration.ofMinutes(janelaMinutos);
        boolean[] permitido = {false};
        porEmail.compute(chave(email), (k, atual) -> {
            if (atual == null || !agora.isBefore(atual.primeiro().plus(janela))) {
                permitido[0] = true;
                return new Envios(1, agora, agora);
            }
            if (atual.quantidade() >= maxPorEmail || agora.isBefore(atual.ultimo().plus(intervaloMinimo()))) {
                return atual;
            }
            permitido[0] = true;
            return new Envios(atual.quantidade() + 1, atual.primeiro(), agora);
        });
        if (!permitido[0]) {
            log.warn("Pedido de redefinição de senha ignorado (limite por e-mail): {}", chave(email));
        }
        return permitido[0];
    }

    /** Descarta janelas vencidas para o mapa não crescer sem limite. */
    @Scheduled(fixedRate = 600000)
    public void limpar() {
        Instant agora = clock.instant();
        Duration janela = Duration.ofMinutes(janelaMinutos);
        porEmail.entrySet().removeIf(e -> !agora.isBefore(e.getValue().primeiro().plus(janela)));
    }
}
