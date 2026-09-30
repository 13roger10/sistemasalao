package com.belezza.api.service;

import com.belezza.api.exception.RateLimitExceededException;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.ClientIpResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Proteção contra força bruta por conta. Na {@code max-tentativas}ª senha (ou código 2FA)
 * errada seguida, a conta fica <b>bloqueada no banco</b> — vale em todas as instâncias da API e
 * não passa com o tempo: só volta com a redefinição de senha ("Esqueci minha senha") ou o
 * desbloqueio pelo admin. Login certo zera o contador.
 *
 * <p>E-mails sem conta também são limitados (em memória, por {@code bloqueio-minutos}), com a
 * mesma mensagem, para a resposta não revelar quais contas existem.
 *
 * <p><b>Por IP</b>: {@code max-falhas-por-ip} senhas erradas do mesmo IP dentro de
 * {@code janela-ip-minutos}, para qualquer e-mail, bloqueiam o IP por {@code bloqueio-ip-minutos}.
 * Barra quem testa uma senha em muitas contas (password spraying) e quem bloqueia contas alheias
 * em massa: com o IP bloqueado, as tentativas nem chegam a contar nas contas. É temporário porque
 * um IP costuma ser compartilhado (rede do salão, operadora móvel).
 */
@Service
@Slf4j
public class LoginAttemptService {

    static final String MENSAGEM_BLOQUEIO = "Conta bloqueada por excesso de tentativas de login com senha errada. "
            + "Redefina a senha em \"Esqueci minha senha\" ou peça ao administrador do salão para desbloquear.";

    private record Tentativas(int falhas, Instant primeira, Instant bloqueadoAte) {}

    private final Map<String, Tentativas> porEmail = new ConcurrentHashMap<>();
    private final Map<String, Tentativas> porIp = new ConcurrentHashMap<>();
    private final Clock clock;
    /** Nulo só nos testes do limite em memória. */
    private final UsuarioRepository usuarioRepository;
    /** Nulo só nos testes; sem requisição HTTP, não há limite por IP. */
    private final ClientIpResolver clientIpResolver;

    @Value("${belezza.login.max-tentativas:6}")
    private int maxTentativas = 6;

    @Value("${belezza.login.bloqueio-minutos:15}")
    private int bloqueioMinutos = 15;

    @Value("${belezza.login.max-falhas-por-ip:20}")
    private int maxFalhasPorIp = 20;

    @Value("${belezza.login.janela-ip-minutos:15}")
    private int janelaIpMinutos = 15;

    @Value("${belezza.login.bloqueio-ip-minutos:30}")
    private int bloqueioIpMinutos = 30;

    @Autowired
    public LoginAttemptService(UsuarioRepository usuarioRepository, ClientIpResolver clientIpResolver) {
        this(Clock.systemUTC(), usuarioRepository, clientIpResolver);
    }

    LoginAttemptService(Clock clock) {
        this(clock, null, null);
    }

    LoginAttemptService(Clock clock, UsuarioRepository usuarioRepository) {
        this(clock, usuarioRepository, null);
    }

    LoginAttemptService(Clock clock, UsuarioRepository usuarioRepository, ClientIpResolver clientIpResolver) {
        this.clock = clock;
        this.usuarioRepository = usuarioRepository;
        this.clientIpResolver = clientIpResolver;
    }

    private String ipAtual() {
        return clientIpResolver != null ? clientIpResolver.ipAtual() : null;
    }

    private static String chave(String email) {
        return email == null ? "" : email.toLowerCase().trim();
    }

    /** Recusa a tentativa se a conta (ou o e-mail) está bloqueada — mesmo com a senha certa. */
    public void verificarBloqueio(String email) {
        // IP primeiro: IP bloqueado não chega a testar (nem a somar erros em) conta nenhuma
        String ip = ipAtual();
        Tentativas doIp = ip != null ? porIp.get(ip) : null;
        if (doIp != null && doIp.bloqueadoAte() != null && clock.instant().isBefore(doIp.bloqueadoAte())) {
            long minutos = Math.max(1, (Duration.between(clock.instant(), doIp.bloqueadoAte()).getSeconds() + 59) / 60);
            throw new RateLimitExceededException("Muitas tentativas de login erradas a partir desta rede. Tente novamente em "
                    + minutos + (minutos == 1 ? " minuto." : " minutos."));
        }
        if (usuarioRepository != null && usuarioRepository.isLoginBloqueado(chave(email))) {
            throw new RateLimitExceededException(MENSAGEM_BLOQUEIO);
        }
        Tentativas t = porEmail.get(chave(email));
        if (t != null && t.bloqueadoAte() != null && clock.instant().isBefore(t.bloqueadoAte())) {
            throw new RateLimitExceededException(MENSAGEM_BLOQUEIO);
        }
    }

    /**
     * Conta uma senha (ou código 2FA) errada; ao atingir o limite, bloqueia a conta. Transação
     * própria: o login que chamou é desfeito ao recusar a senha, e a contagem não pode ir junto.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrarFalha(String email) {
        Instant agora = clock.instant();
        registrarFalhaDoIp(ipAtual(), agora);
        Duration janela = Duration.ofMinutes(bloqueioMinutos);
        Tentativas t = porEmail.compute(chave(email), (k, atual) -> {
            // Fora da janela (ou bloqueio em memória já vencido), a contagem recomeça
            if (atual == null || agora.isAfter(atual.primeira().plus(janela))
                    || (atual.bloqueadoAte() != null && !agora.isBefore(atual.bloqueadoAte()))) {
                atual = new Tentativas(0, agora, null);
            }
            int falhas = atual.falhas() + 1;
            Instant bloqueio = falhas >= maxTentativas ? agora.plus(janela) : null;
            return new Tentativas(falhas, atual.primeira(), bloqueio);
        });

        if (usuarioRepository != null && usuarioRepository.incrementarFalhasLogin(chave(email)) > 0) {
            LocalDateTime quando = LocalDateTime.ofInstant(agora, ZoneId.systemDefault());
            if (usuarioRepository.bloquearLoginSeAtingiuLimite(chave(email), maxTentativas, quando) > 0) {
                log.warn("Conta bloqueada após {} senhas erradas seguidas: {}", maxTentativas, chave(email));
            }
        } else if (t.bloqueadoAte() != null && t.falhas() == maxTentativas) {
            log.warn("E-mail sem conta limitado por {} min após {} tentativas: {}", bloqueioMinutos, t.falhas(), chave(email));
        }
    }

    /** Soma o erro no IP; ao atingir o limite dentro da janela, bloqueia o IP por um tempo. */
    private void registrarFalhaDoIp(String ip, Instant agora) {
        if (ip == null) {
            return;
        }
        Duration janela = Duration.ofMinutes(janelaIpMinutos);
        Tentativas t = porIp.compute(ip, (k, atual) -> {
            if (atual == null || agora.isAfter(atual.primeira().plus(janela))
                    || (atual.bloqueadoAte() != null && !agora.isBefore(atual.bloqueadoAte()))) {
                atual = new Tentativas(0, agora, null);
            }
            int falhas = atual.falhas() + 1;
            Instant bloqueio = falhas >= maxFalhasPorIp ? agora.plus(Duration.ofMinutes(bloqueioIpMinutos)) : null;
            return new Tentativas(falhas, atual.primeira(), bloqueio);
        });
        if (t.bloqueadoAte() != null && t.falhas() == maxFalhasPorIp) {
            log.warn("IP {} bloqueado por {} min após {} senhas erradas em {} min", ip, bloqueioIpMinutos, t.falhas(), janelaIpMinutos);
        }
    }

    /** Login certo: zera o contador da conta (o do IP não: o atacante logaria na própria conta para zerá-lo). */
    public void registrarSucesso(String email) {
        porEmail.remove(chave(email));
        if (usuarioRepository != null) {
            usuarioRepository.zerarFalhasLogin(chave(email));
        }
    }

    /** Libera a conta: senha redefinida ou desbloqueio pelo admin. */
    @Transactional
    public void desbloquear(String email) {
        porEmail.remove(chave(email));
        if (usuarioRepository != null && usuarioRepository.zerarFalhasLogin(chave(email)) > 0) {
            log.info("Login desbloqueado: {}", chave(email));
        }
    }

    /** Descarta registros em memória vencidos para o mapa não crescer sem limite. */
    @Scheduled(fixedRate = 600000)
    public void limpar() {
        Instant agora = clock.instant();
        Duration janela = Duration.ofMinutes(bloqueioMinutos);
        porEmail.entrySet().removeIf(e -> {
            Tentativas t = e.getValue();
            Instant fim = t.bloqueadoAte() != null ? t.bloqueadoAte() : t.primeira().plus(janela);
            return agora.isAfter(fim);
        });
        Duration janelaIp = Duration.ofMinutes(janelaIpMinutos);
        porIp.entrySet().removeIf(e -> {
            Tentativas t = e.getValue();
            Instant fim = t.bloqueadoAte() != null ? t.bloqueadoAte() : t.primeira().plus(janelaIp);
            return agora.isAfter(fim);
        });
    }
}
