package com.belezza.api.config;

import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.UsuarioRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * BUG-004 (auditoria): as migrations V2 e V16 criam contas de demonstração com a senha pública
 * "Admin@123" (está escrita no próprio SQL), e o Flyway roda as mesmas migrations em produção.
 *
 * <p>Em perfil de produção (prod/staging), ao subir a aplicação, nenhuma dessas contas pode
 * continuar entrando com a senha pública:
 * <ul>
 *   <li>as contas demo de profissionais e clientes são desativadas;</li>
 *   <li>o admin inicial ({@code admin@belezza.ai}) recebe a senha de
 *       {@code BELEZZA_ADMIN_INICIAL_SENHA}; sem ela, também é desativado.</li>
 * </ul>
 * Só age enquanto a senha ainda é a pública: uma conta cuja senha já foi trocada não é tocada.
 * Em dev/local/test as contas demo continuam como estão, para o desenvolvimento.
 */
@Component
@Slf4j
public class ContasDemoGuard {

    static final String SENHA_PUBLICA = "Admin@123";
    static final String ADMIN_INICIAL = "admin@belezza.ai";
    static final List<String> CONTAS_DEMO = List.of(
            "carlos@belezza.ai", "ana@belezza.ai", "roberto@belezza.ai",
            "joao@cliente.com", "maria@cliente.com", "pedro@cliente.com", "fernanda@cliente.com");

    private static final List<String> PRODUCTION_PROFILES = Arrays.asList("prod", "staging");
    private static final int SENHA_MINIMA = 12;

    private final Environment environment;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String senhaAdminInicial;

    public ContasDemoGuard(Environment environment, UsuarioRepository usuarioRepository,
                           PasswordEncoder passwordEncoder,
                           @Value("${belezza.admin-inicial.senha:}") String senhaAdminInicial) {
        this.environment = environment;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.senhaAdminInicial = senhaAdminInicial;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void aoSubir() {
        boolean producao = Arrays.stream(environment.getActiveProfiles()).anyMatch(PRODUCTION_PROFILES::contains);
        if (!producao) {
            return;
        }
        protegerContasDemo();
    }

    public void protegerContasDemo() {
        for (String email : CONTAS_DEMO) {
            usuarioRepository.findByEmail(email)
                    .filter(this::aindaComSenhaPublica)
                    .ifPresent(u -> desativar(u, "conta de demonstração"));
        }

        usuarioRepository.findByEmail(ADMIN_INICIAL)
                .filter(this::aindaComSenhaPublica)
                .ifPresent(admin -> {
                    if (senhaAdminInicial != null && senhaAdminInicial.length() >= SENHA_MINIMA
                            && !SENHA_PUBLICA.equals(senhaAdminInicial)) {
                        admin.setPassword(passwordEncoder.encode(senhaAdminInicial));
                        usuarioRepository.save(admin);
                        log.warn("ContasDemoGuard: senha pública de {} trocada pela de BELEZZA_ADMIN_INICIAL_SENHA", ADMIN_INICIAL);
                    } else {
                        desativar(admin, "admin inicial sem BELEZZA_ADMIN_INICIAL_SENHA (mín. "
                                + SENHA_MINIMA + " caracteres)");
                    }
                });
    }

    private boolean aindaComSenhaPublica(Usuario usuario) {
        return usuario.getPassword() != null && passwordEncoder.matches(SENHA_PUBLICA, usuario.getPassword());
    }

    private void desativar(Usuario usuario, String motivo) {
        if (!usuario.isAtivo()) {
            return;
        }
        usuario.setAtivo(false);
        usuarioRepository.save(usuario);
        log.warn("ContasDemoGuard: {} desativado ({}): ainda usava a senha pública das migrations",
                usuario.getEmail(), motivo);
    }
}
