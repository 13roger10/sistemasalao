package com.belezza.api.repository;

import com.belezza.api.BaseIntegrationTest;
import com.belezza.api.entity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for AgendamentoRepository.
 * These tests use a real PostgreSQL database via Testcontainers.
 */
@DisplayName("AgendamentoRepository Integration Tests")
@SuppressWarnings("null")
class AgendamentoRepositoryIT extends BaseIntegrationTest {

    @Autowired
    private AgendamentoRepository agendamentoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private SalonRepository salonRepository;

    @Autowired
    private ProfissionalRepository profissionalRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ServicoRepository servicoRepository;

    private Salon salon;
    private Profissional profissional;
    private Cliente cliente;
    private Servico servico;

    @BeforeEach
    void setUp() {
        // Clean up
        agendamentoRepository.deleteAll();
        profissionalRepository.deleteAll();
        clienteRepository.deleteAll();
        servicoRepository.deleteAll();
        salonRepository.deleteAll();
        usuarioRepository.deleteAll();

        // Create test data
        Usuario adminUsuario = usuarioRepository.save(Usuario.builder()
                .email("admin@example.com")
                .password("password")
                .nome("Admin User")
                .telefone("11999999999")
                .role(Role.ADMIN)
                .plano(Plano.PRO)
                .ativo(true)
                .build());

        salon = salonRepository.save(Salon.builder()
                .nome("Test Salon")
                .endereco("Test Address")
                .telefone("11988888888")
                .admin(adminUsuario)
                .build());

        Usuario profUsuario = usuarioRepository.save(Usuario.builder()
                .email("prof@example.com")
                .password("password")
                .nome("Professional User")
                .telefone("11977777777")
                .role(Role.PROFISSIONAL)
                .plano(Plano.FREE)
                .ativo(true)
                .build());

        profissional = profissionalRepository.save(Profissional.builder()
                .usuario(profUsuario)
                .salon(salon)
                .aceitaAgendamentoOnline(true)
                .build());

        Usuario clienteUsuario = usuarioRepository.save(Usuario.builder()
                .email("client@example.com")
                .password("password")
                .nome("Client User")
                .telefone("11966666666")
                .role(Role.CLIENTE)
                .plano(Plano.FREE)
                .ativo(true)
                .build());

        cliente = clienteRepository.save(Cliente.builder()
                .usuario(clienteUsuario)
                .noShows(0)
                .build());

        servico = servicoRepository.save(Servico.builder()
                .nome("Haircut")
                .descricao("Standard haircut")
                .preco(new java.math.BigDecimal("50.00"))
                .duracaoMinutos(60)
                .tipo(TipoServico.CABELO)
                .salon(salon)
                .ativo(true)
                .build());
    }

    /** Helper: build and save an Agendamento with one service via the new multi-service API. */
    private Agendamento buildAndSave(LocalDateTime dataHora, LocalDateTime fimPrevisto,
                                     StatusAgendamento status) {
        Agendamento ag = Agendamento.builder()
                .cliente(cliente)
                .profissional(profissional)
                .salon(salon)
                .dataHora(dataHora)
                .fimPrevisto(fimPrevisto)
                .status(status)
                .valorCobrado(servico.getPreco())
                .build();
        ag.addServico(servico, null, null);
        return agendamentoRepository.save(ag);
    }

    /** Helper: same but allows setting lembreteEnviado24h. */
    private Agendamento buildAndSaveWithLembrete(LocalDateTime dataHora, LocalDateTime fimPrevisto,
                                                  StatusAgendamento status, boolean lembrete24h) {
        Agendamento ag = Agendamento.builder()
                .cliente(cliente)
                .profissional(profissional)
                .salon(salon)
                .dataHora(dataHora)
                .fimPrevisto(fimPrevisto)
                .status(status)
                .lembreteEnviado24h(lembrete24h)
                .valorCobrado(servico.getPreco())
                .build();
        ag.addServico(servico, null, null);
        return agendamentoRepository.save(ag);
    }

    @Test
    @DisplayName("Should save and retrieve agendamento")
    void shouldSaveAndRetrieveAgendamento() {
        // Given
        LocalDateTime dataHora = LocalDateTime.of(2024, 1, 15, 10, 0);
        Agendamento saved = buildAndSave(dataHora, dataHora.plusHours(1), StatusAgendamento.CONFIRMADO);

        // Then
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCliente()).isEqualTo(cliente);
        assertThat(saved.getProfissional()).isEqualTo(profissional);
        assertThat(saved.getServicos()).hasSize(1);
        assertThat(saved.getServicos().get(0).getServico()).isEqualTo(servico);
        assertThat(saved.getStatus()).isEqualTo(StatusAgendamento.CONFIRMADO);
    }

    @Test
    @DisplayName("Should find agendamentos by salon")
    void shouldFindAgendamentosBySalon() {
        // Given
        LocalDateTime dataHora1 = LocalDateTime.of(2024, 1, 15, 10, 0);
        LocalDateTime dataHora2 = LocalDateTime.of(2024, 1, 16, 14, 0);

        buildAndSave(dataHora1, dataHora1.plusHours(1), StatusAgendamento.CONFIRMADO);
        buildAndSave(dataHora2, dataHora2.plusHours(1), StatusAgendamento.PENDENTE);

        // When
        List<Agendamento> found = agendamentoRepository.findBySalonIdAndStatus(
                salon.getId(), StatusAgendamento.CONFIRMADO);

        // Then
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getStatus()).isEqualTo(StatusAgendamento.CONFIRMADO);
    }

    @Test
    @DisplayName("Should find scheduling conflicts")
    void shouldFindSchedulingConflicts() {
        // Given — existing appointment from 10:00 to 11:00
        LocalDateTime dataHora = LocalDateTime.of(2024, 1, 15, 10, 0);
        buildAndSave(dataHora, dataHora.plusHours(1), StatusAgendamento.CONFIRMADO);

        // When - Try to schedule from 10:30 to 11:30 (conflict!)
        LocalDateTime newDataHora = LocalDateTime.of(2024, 1, 15, 10, 30);
        List<Agendamento> conflicts = agendamentoRepository.findConflicts(
                profissional.getId(),
                newDataHora,
                newDataHora.plusHours(1));

        // Then
        assertThat(conflicts).hasSize(1);
        assertThat(conflicts.get(0).getDataHora()).isEqualTo(dataHora);
    }

    @Test
    @DisplayName("Should not find conflicts for different professional")
    void shouldNotFindConflictsForDifferentProfessional() {
        // Given — appointment for profissional1
        LocalDateTime dataHora = LocalDateTime.of(2024, 1, 15, 10, 0);
        buildAndSave(dataHora, dataHora.plusHours(1), StatusAgendamento.CONFIRMADO);

        // Create another professional
        Usuario prof2Usuario = usuarioRepository.save(Usuario.builder()
                .email("prof2@example.com")
                .password("password")
                .nome("Professional 2")
                .telefone("11955555555")
                .role(Role.PROFISSIONAL)
                .plano(Plano.FREE)
                .ativo(true)
                .build());

        Profissional profissional2 = profissionalRepository.save(Profissional.builder()
                .usuario(prof2Usuario)
                .salon(salon)
                .aceitaAgendamentoOnline(true)
                .build());

        // When - Check conflicts for profissional2 at the same time
        LocalDateTime newDataHora = LocalDateTime.of(2024, 1, 15, 10, 30);
        List<Agendamento> conflicts = agendamentoRepository.findConflicts(
                profissional2.getId(),
                newDataHora,
                newDataHora.plusHours(1));

        // Then
        assertThat(conflicts).isEmpty();
    }

    @Test
    @DisplayName("Should find appointments needing 24h reminder")
    void shouldFindAppointmentsNeeding24hReminder() {
        // Given
        LocalDateTime tomorrow = LocalDateTime.now().plusDays(1);
        buildAndSaveWithLembrete(tomorrow, tomorrow.plusHours(1), StatusAgendamento.CONFIRMADO, false);

        // When - Find appointments between 23 and 25 hours from now
        LocalDateTime inicio = LocalDateTime.now().plusHours(23);
        LocalDateTime fim = LocalDateTime.now().plusHours(25);

        List<Agendamento> needingReminder = agendamentoRepository.findNeedingReminder24h(
                inicio, fim);

        // Then
        assertThat(needingReminder).hasSize(1);
        assertThat(needingReminder.get(0).isLembreteEnviado24h()).isFalse();
    }

    @Test
    @DisplayName("Should count agendamentos by status and period")
    void shouldCountAgendamentosByStatusAndPeriod() {
        // Given
        LocalDateTime inicio = LocalDateTime.of(2024, 1, 1, 0, 0);
        LocalDateTime fim = LocalDateTime.of(2024, 1, 31, 23, 59);

        buildAndSave(LocalDateTime.of(2024, 1, 15, 10, 0),
                     LocalDateTime.of(2024, 1, 15, 11, 0),
                     StatusAgendamento.CONFIRMADO);
        buildAndSave(LocalDateTime.of(2024, 1, 16, 14, 0),
                     LocalDateTime.of(2024, 1, 16, 15, 0),
                     StatusAgendamento.CONFIRMADO);
        buildAndSave(LocalDateTime.of(2024, 1, 17, 10, 0),
                     LocalDateTime.of(2024, 1, 17, 11, 0),
                     StatusAgendamento.CANCELADO);

        // When
        List<Object[]> counts = agendamentoRepository.countByStatusAndPeriod(
                salon.getId(), inicio, fim);

        // Then
        assertThat(counts).hasSize(2);

        // Verify CONFIRMADO count
        Object[] confirmadoRow = counts.stream()
                .filter(row -> row[0] == StatusAgendamento.CONFIRMADO)
                .findFirst()
                .orElseThrow();
        assertThat(confirmadoRow[1]).isEqualTo(2L);

        // Verify CANCELADO count
        Object[] canceladoRow = counts.stream()
                .filter(row -> row[0] == StatusAgendamento.CANCELADO)
                .findFirst()
                .orElseThrow();
        assertThat(canceladoRow[1]).isEqualTo(1L);
    }
}
