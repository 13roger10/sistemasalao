package com.belezza.api.config;

import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * BUG-004 (auditoria): em produção, as contas criadas pelas migrations com a senha pública
 * "Admin@123" não podem continuar entrando.
 */
@DisplayName("ContasDemoGuard")
class ContasDemoGuardTest {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private UsuarioRepository repo;
    private final Map<String, Usuario> contas = new HashMap<>();

    @BeforeEach
    void setUp() {
        repo = mock(UsuarioRepository.class);
        when(repo.findByEmail(anyString())).thenAnswer(inv -> Optional.ofNullable(contas.get(inv.<String>getArgument(0))));
    }

    private Usuario conta(String email, String senha, Role role) {
        Usuario u = Usuario.builder().email(email).password(encoder.encode(senha)).nome(email)
                .role(role).ativo(true).build();
        contas.put(email, u);
        return u;
    }

    private ContasDemoGuard guard(String perfil, String senhaAdmin) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(perfil);
        return new ContasDemoGuard(env, repo, encoder, senhaAdmin);
    }

    @Test
    @DisplayName("Em prod, conta demo com a senha pública é desativada")
    void desativaContaDemoComSenhaPublica() {
        Usuario carlos = conta("carlos@belezza.ai", "Admin@123", Role.PROFISSIONAL);
        Usuario joao = conta("joao@cliente.com", "Admin@123", Role.CLIENTE);

        guard("prod", "").aoSubir();

        assertThat(carlos.isAtivo()).isFalse();
        assertThat(joao.isAtivo()).isFalse();
    }

    @Test
    @DisplayName("Conta demo que já trocou a senha não é tocada")
    void naoMexeEmContaComSenhaTrocada() {
        Usuario ana = conta("ana@belezza.ai", "OutraSenhaForte#2026", Role.PROFISSIONAL);

        guard("prod", "").aoSubir();

        assertThat(ana.isAtivo()).isTrue();
        verify(repo, never()).save(ana);
    }

    @Test
    @DisplayName("Admin inicial recebe a senha de BELEZZA_ADMIN_INICIAL_SENHA e continua ativo")
    void trocaSenhaDoAdminInicial() {
        Usuario admin = conta("admin@belezza.ai", "Admin@123", Role.ADMIN);

        guard("prod", "SenhaDoDono#2026").aoSubir();

        assertThat(admin.isAtivo()).isTrue();
        assertThat(encoder.matches("Admin@123", admin.getPassword())).isFalse();
        assertThat(encoder.matches("SenhaDoDono#2026", admin.getPassword())).isTrue();
    }

    @Test
    @DisplayName("Sem BELEZZA_ADMIN_INICIAL_SENHA (ou curta), o admin inicial é desativado")
    void desativaAdminInicialSemSenhaConfigurada() {
        Usuario admin = conta("admin@belezza.ai", "Admin@123", Role.ADMIN);

        guard("prod", "curta").aoSubir();

        assertThat(admin.isAtivo()).isFalse();
        assertThat(encoder.matches("Admin@123", admin.getPassword())).isTrue();
    }

    @Test
    @DisplayName("Fora de prod/staging nada muda (contas demo do desenvolvimento)")
    void naoAgeForaDeProducao() {
        Usuario admin = conta("admin@belezza.ai", "Admin@123", Role.ADMIN);
        Usuario carlos = conta("carlos@belezza.ai", "Admin@123", Role.PROFISSIONAL);

        guard("dev", "").aoSubir();

        assertThat(admin.isAtivo()).isTrue();
        assertThat(carlos.isAtivo()).isTrue();
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Também age em staging")
    void ageEmStaging() {
        Usuario carlos = conta("carlos@belezza.ai", "Admin@123", Role.PROFISSIONAL);

        guard("staging", "").aoSubir();

        assertThat(carlos.isAtivo()).isFalse();
    }
}
