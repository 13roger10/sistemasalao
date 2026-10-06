package com.belezza.api.support;

import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.JwtService;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Monta salões, usuários e tokens para os testes de isolamento entre salões e de papel.
 * Use em testes @Transactional: tudo é desfeito ao fim de cada teste, sem apagar os dados
 * das migrations (o deleteAll quebrava a FK do admin dono do salão seed).
 */
@Component
public class TenantFixture {

    private static final AtomicInteger SEQ = new AtomicInteger();

    private final UsuarioRepository usuarioRepository;
    private final SalonRepository salonRepository;
    private final ClienteRepository clienteRepository;
    private final JwtService jwtService;

    public TenantFixture(UsuarioRepository usuarioRepository, SalonRepository salonRepository,
                         ClienteRepository clienteRepository, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.salonRepository = salonRepository;
        this.clienteRepository = clienteRepository;
        this.jwtService = jwtService;
    }

    public Usuario usuario(Role role, Salon salon) {
        int n = SEQ.incrementAndGet();
        return usuarioRepository.save(Usuario.builder()
                .email(role.name().toLowerCase() + n + "@fixture.test")
                .password("password")
                .nome(role.name() + " " + n)
                .telefone("1197" + String.format("%07d", n))
                .role(role)
                .plano(Plano.FREE)
                .ativo(true)
                .salon(role == Role.RECEPCIONISTA ? salon : null)
                .build());
    }

    /** Salão com o próprio admin. */
    public Salon salao(String nome) {
        Usuario admin = usuario(Role.ADMIN, null);
        return salonRepository.save(Salon.builder()
                .nome(nome)
                .endereco("Rua " + nome)
                .telefone("1133330000")
                .horarioAbertura(LocalTime.of(9, 0))
                .horarioFechamento(LocalTime.of(19, 0))
                .admin(admin)
                .build());
    }

    public Cliente cliente(Salon salon) {
        Usuario usuario = usuario(Role.CLIENTE, null);
        return clienteRepository.save(Cliente.builder()
                .usuario(usuario)
                .salon(salon)
                .noShows(0)
                .build());
    }

    /** Token como o login emite: com a claim salonId quando o usuário tem salão. */
    public String token(Usuario usuario, Long salonId) {
        UserDetails userDetails = User.builder()
                .username(usuario.getEmail())
                .password(usuario.getPassword())
                .roles(usuario.getRole().name())
                .build();
        return salonId != null
                ? jwtService.generateAccessToken(userDetails, salonId)
                : jwtService.generateAccessToken(userDetails);
    }

    public String tokenAdmin(Salon salon) {
        return token(salon.getAdmin(), salon.getId());
    }
}
