package com.belezza.api.config;

import com.belezza.api.entity.*;
import com.belezza.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * Data initializer for local profile (H2 in-memory database).
 * Creates initial test data for development without Docker.
 */
@Configuration
@Profile("local")
@RequiredArgsConstructor
@Slf4j
public class LocalDataInitializer {

    private final PasswordEncoder passwordEncoder;

    @Bean
    CommandLineRunner initLocalData(
            UsuarioRepository usuarioRepository,
            SalonRepository salonRepository,
            ProfissionalRepository profissionalRepository,
            ServicoRepository servicoRepository
    ) {
        return args -> {
            log.info("=== Initializing local development data ===");

            // Check if data already exists
            if (usuarioRepository.count() > 0) {
                log.info("Data already exists, skipping initialization");
                return;
            }

            // Create admin user
            Usuario admin = Usuario.builder()
                    .email("admin@admin.com")
                    .password(passwordEncoder.encode("admin123"))
                    .nome("Administrador Belezza")
                    .telefone("+5511999999999")
                    .role(Role.ADMIN)
                    .plano(Plano.PREMIUM)
                    .ativo(true)
                    .emailVerificado(true)
                    .build();
            admin = usuarioRepository.save(admin);
            log.info("Created admin user: {}", admin.getEmail());

            // Create salon
            Salon salon = Salon.builder()
                    .nome("Salão Belezza Demo")
                    .endereco("Rua das Flores, 123 - São Paulo, SP")
                    .telefone("+5511988888888")
                    .horarioAbertura(LocalTime.of(9, 0))
                    .horarioFechamento(LocalTime.of(18, 0))
                    .admin(admin)
                    .ativo(true)
                    .build();
            salon = salonRepository.save(salon);
            log.info("Created salon: {}", salon.getNome());

            // Create professional user
            Usuario profUser = Usuario.builder()
                    .email("prof@prof.com")
                    .password(passwordEncoder.encode("prof123"))
                    .nome("Maria Profissional")
                    .telefone("+5511977777777")
                    .role(Role.PROFISSIONAL)
                    .plano(Plano.FREE)
                    .ativo(true)
                    .emailVerificado(true)
                    .build();
            profUser = usuarioRepository.save(profUser);

            Profissional profissional = Profissional.builder()
                    .usuario(profUser)
                    .salon(salon)
                    .ativo(true)
                    .aceitaAgendamentoOnline(true)
                    .build();
            profissionalRepository.save(profissional);
            log.info("Created professional: {}", profUser.getEmail());

            // Create client user
            Usuario clienteUser = Usuario.builder()
                    .email("cliente@cliente.com")
                    .password(passwordEncoder.encode("cliente123"))
                    .nome("João Cliente")
                    .telefone("+5511966666666")
                    .role(Role.CLIENTE)
                    .plano(Plano.FREE)
                    .ativo(true)
                    .emailVerificado(true)
                    .build();
            usuarioRepository.save(clienteUser);
            log.info("Created client: {}", clienteUser.getEmail());

            // Create sample services
            Servico corte = Servico.builder()
                    .nome("Corte de Cabelo")
                    .descricao("Corte masculino ou feminino")
                    .preco(new BigDecimal("50.00"))
                    .duracaoMinutos(30)
                    .tipo(TipoServico.CABELO)
                    .salon(salon)
                    .ativo(true)
                    .build();
            servicoRepository.save(corte);

            Servico coloracao = Servico.builder()
                    .nome("Coloração")
                    .descricao("Coloração completa")
                    .preco(new BigDecimal("150.00"))
                    .duracaoMinutos(120)
                    .tipo(TipoServico.CABELO)
                    .salon(salon)
                    .ativo(true)
                    .build();
            servicoRepository.save(coloracao);

            Servico manicure = Servico.builder()
                    .nome("Manicure")
                    .descricao("Manicure com esmaltação")
                    .preco(new BigDecimal("35.00"))
                    .duracaoMinutos(45)
                    .tipo(TipoServico.UNHA)
                    .salon(salon)
                    .ativo(true)
                    .build();
            servicoRepository.save(manicure);

            log.info("Created {} sample services", 3);

            log.info("=== Local development data initialized ===");
            log.info("");
            log.info("Test credentials:");
            log.info("  Admin:        admin@admin.com / admin123");
            log.info("  Professional: prof@prof.com / prof123");
            log.info("  Client:       cliente@cliente.com / cliente123");
            log.info("");
            log.info("H2 Console: http://localhost:8080/h2-console");
            log.info("Swagger UI: http://localhost:8080/swagger-ui.html");
        };
    }
}
