package com.belezza.api.service;

import com.belezza.api.dto.agendamento.AgendamentoRequest;
import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.agendamento.CancelamentoRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.integration.WhatsAppService;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.HorarioTrabalhoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AgendamentoService Tests")
class AgendamentoServiceTest {

    @Mock
    private AgendamentoRepository agendamentoRepository;

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private HorarioTrabalhoRepository horarioTrabalhoRepository;

    @Mock
    private SalonService salonService;

    @Mock
    private ProfissionalService profissionalService;

    @Mock
    private ServicoService servicoService;

    @Mock
    private ClienteService clienteService;

    @Mock
    private BloqueioHorarioService bloqueioHorarioService;

    @Mock
    private WhatsAppService whatsAppService;

    @InjectMocks
    private AgendamentoService agendamentoService;

    private Salon salon;
    private Profissional profissional;
    private Servico servico;
    private Cliente cliente;
    private Usuario usuario;
    private Agendamento agendamento;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(agendamentoService, "frontendUrl", "http://localhost:3000");

        usuario = Usuario.builder()
                .id(1L)
                .email("cliente@test.com")
                .nome("Cliente Teste")
                .telefone("+5511999999999")
                .role(Role.CLIENTE)
                .plano(Plano.FREE)
                .ativo(true)
                .build();

        salon = Salon.builder()
                .id(1L)
                .nome("Salão Teste")
                .endereco("Rua Teste, 123")
                .telefone("+5511888888888")
                .aceitaAgendamentoOnline(true)
                .horarioAbertura(LocalTime.of(8, 0))
                .horarioFechamento(LocalTime.of(18, 0))
                .antecedenciaMinimaHoras(1)
                .cancelamentoMinimoHoras(2)
                .maxNoShowsPermitidos(3)
                .admin(usuario)
                .build();

        Usuario profUsuario = Usuario.builder()
                .id(2L)
                .email("prof@test.com")
                .nome("Profissional Teste")
                .role(Role.PROFISSIONAL)
                .build();

        profissional = Profissional.builder()
                .id(1L)
                .usuario(profUsuario)
                .salon(salon)
                .aceitaAgendamentoOnline(true)
                .build();

        servico = Servico.builder()
                .id(1L)
                .nome("Corte Masculino")
                .descricao("Corte de cabelo masculino")
                .preco(BigDecimal.valueOf(50.00))
                .duracaoMinutos(30)
                .salon(salon)
                .ativo(true)
                .build();

        cliente = Cliente.builder()
                .id(1L)
                .usuario(usuario)
                .salon(salon)
                .noShows(0)
                .bloqueado(false)
                .build();

        agendamento = Agendamento.builder()
                .id(1L)
                .salon(salon)
                .cliente(cliente)
                .profissional(profissional)
                .servico(servico)
                .dataHora(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0))
                .fimPrevisto(LocalDateTime.now().plusDays(1).withHour(10).withMinute(30))
                .status(StatusAgendamento.PENDENTE)
                .valorCobrado(BigDecimal.valueOf(50.00))
                .tokenConfirmacao("token-123")
                .build();
    }

    @Nested
    @DisplayName("Buscar Agendamento Tests")
    class BuscarAgendamentoTests {

        @Test
        @DisplayName("Should find agendamento by ID")
        void shouldFindAgendamentoById() {
            // Given
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            // When
            AgendamentoResponse response = agendamentoService.buscarPorId(1L);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(1L);
            verify(agendamentoRepository).findById(1L);
        }

        @Test
        @DisplayName("Should throw exception when agendamento not found")
        void shouldThrowExceptionWhenNotFound() {
            // Given
            when(agendamentoRepository.findById(999L)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> agendamentoService.buscarPorId(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Listar Agendamentos Tests")
    class ListarAgendamentosTests {

        @Test
        @DisplayName("Should list agendamentos by salon")
        void shouldListAgendamentosBySalon() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Agendamento> page = new PageImpl<>(List.of(agendamento));
            when(agendamentoRepository.findBySalonId(1L, pageable)).thenReturn(page);

            // When
            Page<AgendamentoResponse> result = agendamentoService.listarPorSalon(1L, pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
            verify(agendamentoRepository).findBySalonId(1L, pageable);
        }

        @Test
        @DisplayName("Should list agendamentos by cliente")
        void shouldListAgendamentosByCliente() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Agendamento> page = new PageImpl<>(List.of(agendamento));
            when(agendamentoRepository.findByClienteId(1L, pageable)).thenReturn(page);

            // When
            Page<AgendamentoResponse> result = agendamentoService.listarPorCliente(1L, pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
            verify(agendamentoRepository).findByClienteId(1L, pageable);
        }

        @Test
        @DisplayName("Should list agendamentos by profissional")
        void shouldListAgendamentosByProfissional() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Agendamento> page = new PageImpl<>(List.of(agendamento));
            when(agendamentoRepository.findByProfissionalId(1L, pageable)).thenReturn(page);

            // When
            Page<AgendamentoResponse> result = agendamentoService.listarPorProfissional(1L, pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
            verify(agendamentoRepository).findByProfissionalId(1L, pageable);
        }

        @Test
        @DisplayName("Should list daily agenda for profissional")
        void shouldListDailyAgenda() {
            // Given
            LocalDateTime data = LocalDateTime.now().plusDays(1);
            when(agendamentoRepository.findDailyByProfissional(eq(1L), any(), any()))
                    .thenReturn(List.of(agendamento));

            // When
            List<AgendamentoResponse> result = agendamentoService.listarAgendaDiaria(1L, data);

            // Then
            assertThat(result).hasSize(1);
            verify(agendamentoRepository).findDailyByProfissional(eq(1L), any(), any());
        }
    }

    @Nested
    @DisplayName("Confirmar Agendamento Tests")
    class ConfirmarAgendamentoTests {

        @Test
        @DisplayName("Should confirm pending agendamento")
        void shouldConfirmPendingAgendamento() {
            // Given
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            AgendamentoResponse response = agendamentoService.confirmar(1L);

            // Then
            assertThat(response).isNotNull();
            verify(agendamentoRepository).save(any(Agendamento.class));
        }

        @Test
        @DisplayName("Should throw exception when trying to confirm non-pending agendamento")
        void shouldThrowExceptionWhenConfirmingNonPending() {
            // Given
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            // When/Then
            assertThatThrownBy(() -> agendamentoService.confirmar(1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("pendentes");
        }

        @Test
        @DisplayName("Should confirm agendamento by token")
        void shouldConfirmAgendamentoByToken() {
            // Given
            when(agendamentoRepository.findByTokenConfirmacao("token-123"))
                    .thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            AgendamentoResponse response = agendamentoService.confirmarPorToken("token-123");

            // Then
            assertThat(response).isNotNull();
            verify(agendamentoRepository).findByTokenConfirmacao("token-123");
        }
    }

    @Nested
    @DisplayName("Iniciar Agendamento Tests")
    class IniciarAgendamentoTests {

        @Test
        @DisplayName("Should start confirmed agendamento")
        void shouldStartConfirmedAgendamento() {
            // Given
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            AgendamentoResponse response = agendamentoService.iniciar(1L);

            // Then
            assertThat(response).isNotNull();
            verify(agendamentoRepository).save(any(Agendamento.class));
        }

        @Test
        @DisplayName("Should throw exception when trying to start non-confirmed agendamento")
        void shouldThrowExceptionWhenStartingNonConfirmed() {
            // Given
            agendamento.setStatus(StatusAgendamento.PENDENTE);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            // When/Then
            assertThatThrownBy(() -> agendamentoService.iniciar(1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("confirmados");
        }
    }

    @Nested
    @DisplayName("Concluir Agendamento Tests")
    class ConcluirAgendamentoTests {

        @Test
        @DisplayName("Should complete in-progress agendamento")
        void shouldCompleteInProgressAgendamento() {
            // Given
            agendamento.setStatus(StatusAgendamento.EM_ANDAMENTO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            AgendamentoResponse response = agendamentoService.concluir(1L);

            // Then
            assertThat(response).isNotNull();
            verify(agendamentoRepository).save(any(Agendamento.class));
        }

        @Test
        @DisplayName("Should throw exception when trying to complete non-in-progress agendamento")
        void shouldThrowExceptionWhenCompletingNonInProgress() {
            // Given
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            // When/Then
            assertThatThrownBy(() -> agendamentoService.concluir(1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("em andamento");
        }
    }

    @Nested
    @DisplayName("Cancelar Agendamento Tests")
    class CancelarAgendamentoTests {

        @Test
        @DisplayName("Should cancel pending agendamento")
        void shouldCancelPendingAgendamento() {
            // Given
            agendamento.setDataHora(LocalDateTime.now().plusDays(1)); // Far enough in future
            CancelamentoRequest request = new CancelamentoRequest("Motivo teste");
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            AgendamentoResponse response = agendamentoService.cancelar(1L, request);

            // Then
            assertThat(response).isNotNull();
            verify(agendamentoRepository).save(any(Agendamento.class));
        }

        @Test
        @DisplayName("Should throw exception when canceling completed agendamento")
        void shouldThrowExceptionWhenCancelingCompleted() {
            // Given
            agendamento.setStatus(StatusAgendamento.CONCLUIDO);
            CancelamentoRequest request = new CancelamentoRequest("Motivo teste");
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            // When/Then
            assertThatThrownBy(() -> agendamentoService.cancelar(1L, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("não pode ser cancelado");
        }

        @Test
        @DisplayName("Should throw exception when canceling too close to appointment")
        void shouldThrowExceptionWhenCancelingTooClose() {
            // Given
            agendamento.setDataHora(LocalDateTime.now().plusMinutes(30)); // Too close
            CancelamentoRequest request = new CancelamentoRequest("Motivo teste");
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            // When/Then
            assertThatThrownBy(() -> agendamentoService.cancelar(1L, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("antecedência");
        }
    }

    @Nested
    @DisplayName("No-Show Tests")
    class NoShowTests {

        @Test
        @DisplayName("Should mark confirmed agendamento as no-show")
        void shouldMarkAsNoShow() {
            // Given
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            AgendamentoResponse response = agendamentoService.marcarNoShow(1L);

            // Then
            assertThat(response).isNotNull();
            verify(clienteRepository).incrementNoShows(cliente.getId());
        }

        @Test
        @DisplayName("Should block client after max no-shows")
        void shouldBlockClientAfterMaxNoShows() {
            // Given
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            cliente.setNoShows(2); // Will reach 3 after this
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            agendamentoService.marcarNoShow(1L);

            // Then
            verify(clienteRepository).save(cliente);
            assertThat(cliente.isBloqueado()).isTrue();
        }

        @Test
        @DisplayName("Should throw exception when marking non-confirmed as no-show")
        void shouldThrowExceptionWhenMarkingNonConfirmedAsNoShow() {
            // Given
            agendamento.setStatus(StatusAgendamento.PENDENTE);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            // When/Then
            assertThatThrownBy(() -> agendamentoService.marcarNoShow(1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("confirmados");
        }
    }
}
