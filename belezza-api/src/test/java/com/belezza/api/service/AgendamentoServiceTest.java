package com.belezza.api.service;

import com.belezza.api.dto.agendamento.AgendamentoRequest;
import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.agendamento.CancelamentoRequest;
import com.belezza.api.dto.agendamento.ReagendamentoRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.integration.WhatsAppService;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.HorarioFuncionamentoSalonRepository;
import com.belezza.api.repository.HorarioTrabalhoRepository;
import com.belezza.api.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
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
    private HorarioFuncionamentoSalonRepository horarioFuncionamentoSalonRepository;

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

    @Mock
    private TenantIsolationService tenantIsolationService;

    @Mock
    private PagamentoService pagamentoService;

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
        // Ações de staff exigem um salão no contexto (SEC-004: enforceStaffTenant)
        TenantContext.setCurrentTenant(1L);

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
        // o profissional realiza o Corte (BUG-022: só é agendado para os serviços vinculados a ele)
        profissional.getServicos().add(servico);

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

    @AfterEach
    void tearDown() {
        TenantContext.clear();
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
            Page<AgendamentoResponse> result = agendamentoService.listarPorSalon(1L, pageable, false);

            // Then
            assertThat(result.getContent()).hasSize(1);
            verify(tenantIsolationService).assertRequestedSalon(1L);
            verify(agendamentoRepository).findBySalonId(1L, pageable);
        }

        @Test
        @DisplayName("Should list agendamentos by cliente")
        void shouldListAgendamentosByCliente() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Agendamento> page = new PageImpl<>(List.of(agendamento));
            when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));
            when(agendamentoRepository.findByClienteId(1L, pageable)).thenReturn(page);

            // When
            Page<AgendamentoResponse> result = agendamentoService.listarPorCliente(1L, pageable, false);

            // Then
            assertThat(result.getContent()).hasSize(1);
            verify(tenantIsolationService).assertCurrentTenant(1L);
            verify(agendamentoRepository).findByClienteId(1L, pageable);
        }

        @Test
        @DisplayName("Should list agendamentos by profissional")
        void shouldListAgendamentosByProfissional() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Agendamento> page = new PageImpl<>(List.of(agendamento));
            when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);
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
            when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);
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
            when(agendamentoRepository.findIdByTokenConfirmacao("token-123")).thenReturn(Optional.of(1L));
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            AgendamentoResponse response = agendamentoService.confirmarPorToken("token-123");

            // Then
            assertThat(response).isNotNull();
            verify(agendamentoRepository).findIdByTokenConfirmacao("token-123");
            verify(agendamentoRepository).lockAgendamento(1L);
        }
    }

    @Nested
    @DisplayName("Iniciar Agendamento Tests")
    class IniciarAgendamentoTests {

        @Test
        @DisplayName("Should start confirmed agendamento")
        void shouldStartConfirmedAgendamento() {
            // Given — horário daqui a 10 min (dentro da janela de 30 min antes)
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            agendamento.setDataHora(LocalDateTime.now().plusMinutes(10));
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

        @Test
        @DisplayName("Não inicia dias antes do horário (BUG-023)")
        void naoIniciaDiasAntes() {
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            agendamento.setDataHora(LocalDateTime.now().plusDays(3));
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            assertThatThrownBy(() -> agendamentoService.iniciar(1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("30 minutos antes do horário marcado");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Atendimento em andamento não é cancelado nem reagendado (BUG-023)")
        void emAndamentoNaoCancelaNemReagenda() {
            agendamento.setStatus(StatusAgendamento.EM_ANDAMENTO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            Usuario recepcionista = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();
            ReagendamentoRequest req = new ReagendamentoRequest();
            req.setNovaDataHora(LocalDateTime.now().plusDays(2));

            assertThatThrownBy(() -> agendamentoService.cancelar(1L, new CancelamentoRequest("x"), false, false, recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("em andamento não pode ser cancelado");
            assertThatThrownBy(() -> agendamentoService.reagendar(1L, req, false, false, recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("em andamento não pode ser reagendado");
            when(agendamentoRepository.findIdByTokenConfirmacao("token-123")).thenReturn(Optional.of(1L));
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            assertThatThrownBy(() -> agendamentoService.cancelarPorToken("token-123", null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("em andamento não pode ser cancelado");
            verify(agendamentoRepository, never()).save(any());
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
    @DisplayName("Meus agendamentos — status de pagamento (BUG-025)")
    class MeusAgendamentosPagamentoTests {

        @Test
        @DisplayName("Atendimento quitado aparece como pago; os demais, não")
        void marcaSoOsAtendimentosPagos() {
            agendamento.setStatus(StatusAgendamento.CONCLUIDO);
            Agendamento outro = Agendamento.builder()
                    .id(2L).salon(salon).cliente(cliente).profissional(profissional)
                    .dataHora(LocalDateTime.now().minusDays(2)).fimPrevisto(LocalDateTime.now().minusDays(2).plusMinutes(30))
                    .status(StatusAgendamento.CONCLUIDO).build();
            when(agendamentoRepository.findByClienteUsuarioId(eq(9L), any()))
                    .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(agendamento, outro)));
            when(pagamentoService.idsPagos(List.of(agendamento, outro))).thenReturn(java.util.Set.of(1L));

            var resposta = agendamentoService.listarMeusAgendamentos(9L, 1, 10, null, null, null);

            assertThat(resposta.getItems()).extracting(i -> i.getId() + ":" + i.isPaid())
                    .containsExactly("1:true", "2:false");
        }

        @Test
        @DisplayName("Lista do salão traz 'pago' pelos pagamentos do atendimento, não por quem registrou (BUG-034)")
        void listaDoSalaoTrazPago() {
            when(agendamentoRepository.findBySalonId(eq(1L), any()))
                    .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(agendamento)));
            when(pagamentoService.idsPagos(List.of(agendamento))).thenReturn(java.util.Set.of(1L));

            var pagina = agendamentoService.listarPorSalon(1L, null, null,
                    org.springframework.data.domain.Pageable.unpaged(), false, null);

            assertThat(pagina.getContent()).singleElement().extracting(AgendamentoResponse::getPago).isEqualTo(true);
        }

        @Test
        @DisplayName("O JSON publica o campo como isPaid, o nome que a tela lê")
        void jsonUsaIsPaid() throws Exception {
            var json = new com.fasterxml.jackson.databind.ObjectMapper()
                    .findAndRegisterModules()
                    .writeValueAsString(com.belezza.api.dto.agendamento.MeuAgendamentoDTO.fromEntity(agendamento, true));

            assertThat(json).contains("\"isPaid\":true").doesNotContain("\"paid\"");
        }
    }

    @Nested
    @DisplayName("Grade de horários do cliente (BUG-041)")
    class GradeDoCliente {

        private void validar(LocalDateTime quando) {
            ReflectionTestUtils.invokeMethod(agendamentoService, "validarGradeDoCliente", profissional, salon, quando);
        }

        @BeforeEach
        void expedienteDasNove() {
            salon.setIntervaloAgendamentoMinutos(30);
            HorarioTrabalho expediente = HorarioTrabalho.builder().profissional(profissional)
                    .horaInicio(LocalTime.of(9, 0)).horaFim(LocalTime.of(18, 0)).ativo(true).build();
            lenient().when(horarioTrabalhoRepository.findByProfissionalIdAndDiaSemana(any(), any())).thenReturn(Optional.of(expediente));
            lenient().when(horarioFuncionamentoSalonRepository.findBySalonIdAndDiaSemana(any(), any())).thenReturn(Optional.empty());
        }

        @Test
        @DisplayName("13:07 numa grade de 30 em 30 min a partir das 09:00 é recusado")
        void foraDaGrade() {
            LocalDateTime quando = LocalDateTime.now().plusDays(2).withHour(13).withMinute(7).withSecond(0).withNano(0);
            assertThatThrownBy(() -> validar(quando))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("de 30 em 30 minutos a partir das 09:00");
        }

        @Test
        @DisplayName("13:30 está na grade")
        void naGrade() {
            validar(LocalDateTime.now().plusDays(2).withHour(13).withMinute(30).withSecond(0).withNano(0));
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
        @DisplayName("Duplo clique: trava o agendamento antes de ler o status (BUG-024)")
        void travaAntesDeLerOStatus() {
            agendamento.setDataHora(LocalDateTime.now().plusDays(1));
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            agendamentoService.cancelar(1L, new CancelamentoRequest("Motivo teste"));

            // a segunda requisição espera a trava e lê o status já cancelado
            org.mockito.InOrder ordem = org.mockito.Mockito.inOrder(agendamentoRepository);
            ordem.verify(agendamentoRepository).lockAgendamento(1L);
            ordem.verify(agendamentoRepository).findById(1L);
        }

        @Test
        @DisplayName("Duplo clique: o segundo cancelamento é recusado com mensagem (BUG-024)")
        void segundoCancelamentoRecusado() {
            agendamento.setStatus(StatusAgendamento.CANCELADO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            assertThatThrownBy(() -> agendamentoService.cancelar(1L, new CancelamentoRequest("de novo")))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("não pode ser cancelado");
            verify(agendamentoRepository, never()).save(any(Agendamento.class));
        }

        @Test
        @DisplayName("Cliente não cancela dentro do prazo mínimo de cancelamento do salão")
        void shouldThrowExceptionWhenCancelingTooClose() {
            // Given: salão exige 2 h; faltam 30 min
            agendamento.setDataHora(LocalDateTime.now().plusMinutes(30));
            CancelamentoRequest request = new CancelamentoRequest("Motivo teste");
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            // When/Then
            assertThatThrownBy(() -> agendamentoService.cancelar(1L, request, true, true, usuario))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("pelo menos 2 horas de antecedência");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Link de cancelamento do e-mail segue o mesmo prazo do cliente")
        void cancelamentoPorLinkDentroDoPrazo() {
            agendamento.setDataHora(LocalDateTime.now().plusMinutes(30));
            when(agendamentoRepository.findIdByTokenConfirmacao("token-123")).thenReturn(Optional.of(1L));
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            assertThatThrownBy(() -> agendamentoService.cancelarPorToken("token-123", null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("antecedência");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Equipe cancela a qualquer momento (cliente ligou desmarcando)")
        void equipeCancelaDentroDoPrazo() {
            agendamento.setDataHora(LocalDateTime.now().plusMinutes(30));
            Usuario recepcionista = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            agendamentoService.cancelar(1L, new CancelamentoRequest("Cliente ligou"), false, false, recepcionista);

            assertThat(agendamento.getStatus()).isEqualTo(StatusAgendamento.CANCELADO);
        }

        @Test
        @DisplayName("Cliente não reagenda dentro do prazo mínimo de cancelamento")
        void clienteNaoReagendaDentroDoPrazo() {
            agendamento.setDataHora(LocalDateTime.now().plusMinutes(30));
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            ReagendamentoRequest request = new ReagendamentoRequest();
            request.setNovaDataHora(LocalDateTime.now().plusDays(2).withHour(10).withMinute(0));

            assertThatThrownBy(() -> agendamentoService.reagendar(1L, request, true, true, usuario))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Só é possível reagendar");
            verify(agendamentoRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Criar - regras de antecedência do salão")
    class CriarAntecedenciaTests {

        private final Usuario recepcionista = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();

        @BeforeEach
        void stubs() {
            when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);
            when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));
            when(servicoService.getServicoEntity(1L)).thenReturn(servico);
        }

        private AgendamentoRequest em(LocalDateTime dataHora) {
            return AgendamentoRequest.builder()
                    .clienteId(1L).profissionalId(1L).servicoId(1L).dataHora(dataHora).build();
        }

        @Test
        @DisplayName("Horário antes da antecedência mínima é recusado")
        void antecedenciaMinima() {
            salon.setAntecedenciaMinimaHoras(3);

            assertThatThrownBy(() -> agendamentoService.criar(em(LocalDateTime.now().plusHours(1)), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("pelo menos 3 horas de antecedência");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Salão que não permite agendar no mesmo dia recusa horário de hoje")
        void mesmoDiaProibido() {
            salon.setAntecedenciaMinimaHoras(0);
            salon.setPermiteAgendamentoMesmoDia(false);
            LocalDateTime hojeMaisTarde = LocalDate.now(ZoneId.of("America/Sao_Paulo")).atTime(23, 59);

            assertThatThrownBy(() -> agendamentoService.criar(em(hojeMaisTarde), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("mesmo dia não é permitido");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Cliente excluído do salão não recebe agendamento da equipe (BUG-026)")
        void clienteExcluido() {
            cliente.setAtivo(false);

            assertThatThrownBy(() -> agendamentoService.criar(em(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0)), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("excluído do salão");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Data além do prazo máximo de antecedência é recusada")
        void alemDoPrazoMaximo() {
            assertThatThrownBy(() -> agendamentoService.criar(em(LocalDateTime.now().plusDays(31)), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("mais de 30 dias de antecedência");
            verify(agendamentoRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("No-Show Tests")
    class NoShowTests {

        @BeforeEach
        void horarioJaPassou() {
            // Falta só pode ser marcada depois do horário do agendamento
            agendamento.setDataHora(LocalDateTime.now().minusMinutes(30));
        }

        @Test
        @DisplayName("Não marca falta antes do horário do agendamento")
        void naoMarcaAntesDoHorario() {
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            agendamento.setDataHora(LocalDateTime.now().plusHours(2));
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            assertThatThrownBy(() -> agendamentoService.marcarNoShow(1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("depois do horário do agendamento");
            verify(agendamentoRepository, never()).save(any());
            assertThat(cliente.getNoShows()).isZero();
        }

        @Test
        @DisplayName("Desfazer falta volta para confirmado e retira a falta do cliente")
        void desfazNoShow() {
            agendamento.setStatus(StatusAgendamento.NO_SHOW);
            cliente.setNoShows(1);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            agendamentoService.desfazerNoShow(1L, false, null);

            assertThat(agendamento.getStatus()).isEqualTo(StatusAgendamento.CONFIRMADO);
            assertThat(cliente.getNoShows()).isZero();
            // a rotina automática de falta não marca este agendamento de novo
            assertThat(agendamento.isNoShowDesfeito()).isTrue();
            verify(clienteRepository).save(cliente);
        }

        @Test
        @DisplayName("Desfazer a falta que causou o bloqueio desbloqueia o cliente")
        void desfazerDesbloqueia() {
            agendamento.setStatus(StatusAgendamento.NO_SHOW);
            cliente.setNoShows(3);
            cliente.setBloqueado(true); // bloqueado ao atingir o limite de 3
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            agendamentoService.desfazerNoShow(1L, false, null);

            assertThat(cliente.getNoShows()).isEqualTo(2);
            assertThat(cliente.isBloqueado()).isFalse();
        }

        @Test
        @DisplayName("Bloqueio manual (abaixo do limite de faltas) continua depois de desfazer")
        void bloqueioManualContinua() {
            agendamento.setStatus(StatusAgendamento.NO_SHOW);
            cliente.setNoShows(1);
            cliente.setBloqueado(true);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            agendamentoService.desfazerNoShow(1L, false, null);

            assertThat(cliente.getNoShows()).isZero();
            assertThat(cliente.isBloqueado()).isTrue();
        }

        @Test
        @DisplayName("Só desfaz agendamento marcado como falta")
        void soDesfazNoShow() {
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            assertThatThrownBy(() -> agendamentoService.desfazerNoShow(1L, false, null))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("não está marcado");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should mark confirmed agendamento as no-show")
        void shouldMarkAsNoShow() {
            // Given
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            AgendamentoResponse response = agendamentoService.marcarNoShow(1L);

            // Then — counter persisted on the entity, client not blocked yet (1 of 3)
            assertThat(response).isNotNull();
            assertThat(cliente.getNoShows()).isEqualTo(1);
            assertThat(cliente.isBloqueado()).isFalse();
            verify(clienteRepository).save(cliente);
        }

        @Test
        @DisplayName("Should not block client before reaching max no-shows")
        void shouldNotBlockClientBeforeMaxNoShows() {
            // Given — salon allows 3; this is the 2nd no-show
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            cliente.setNoShows(1);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenReturn(agendamento);

            // When
            agendamentoService.marcarNoShow(1L);

            // Then
            assertThat(cliente.getNoShows()).isEqualTo(2);
            assertThat(cliente.isBloqueado()).isFalse();
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
            assertThat(cliente.getNoShows()).isEqualTo(3);
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

    @Nested
    @DisplayName("Criar - isolamento entre estabelecimentos")
    class CriarIsolamentoTests {

        private final Usuario recepcionista = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();

        private AgendamentoRequest request() {
            return AgendamentoRequest.builder()
                    .clienteId(1L)
                    .profissionalId(1L)
                    .servicoId(1L)
                    .dataHora(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0))
                    .build();
        }

        @Test
        @DisplayName("Equipe de outro salão não cria agendamento com profissional deste salão")
        void equipeDeOutroSalao() {
            TenantContext.setCurrentTenant(2L);
            when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);

            assertThatThrownBy(() -> agendamentoService.criar(request(), recepcionista))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

            verify(agendamentoRepository, never()).save(any());
            verifyNoInteractions(clienteRepository);
        }

        @Test
        @DisplayName("API pública (sem token): operador que não é admin do salão do profissional é negado")
        void apiPublicaOutroSalao() {
            TenantContext.clear();
            Usuario adminOutroSalao = Usuario.builder().id(99L).role(Role.ADMIN).build();
            when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);

            assertThatThrownBy(() -> agendamentoService.criar(request(), adminOutroSalao))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

            verifyNoInteractions(clienteRepository);
        }

        @Test
        @DisplayName("Trava o profissional antes de procurar conflitos (evita agendamento duplicado em requisições simultâneas)")
        void travaProfissionalAntesDeVerificarConflitos() {
            Usuario recepcionistaDoSalao = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();
            when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);
            when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));
            when(servicoService.getServicoEntity(1L)).thenReturn(servico);
            when(horarioTrabalhoRepository.findByProfissionalIdAndDiaSemana(eq(1L), any())).thenReturn(Optional.of(expediente(true)));
            when(bloqueioHorarioService.temBloqueio(eq(1L), any(), any())).thenReturn(false);
            when(agendamentoRepository.findConflicts(eq(1L), any(), any())).thenReturn(List.of(agendamento));

            assertThatThrownBy(() -> agendamentoService.criar(request(), recepcionistaDoSalao))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("já possui agendamento");

            var ordem = inOrder(agendamentoRepository);
            ordem.verify(agendamentoRepository).lockProfissional(1L);
            ordem.verify(agendamentoRepository).findConflicts(eq(1L), any(), any());
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("API pública (sem token): admin do próprio salão passa pela verificação")
        void apiPublicaMesmoSalao() {
            TenantContext.clear();
            Usuario adminDoSalao = Usuario.builder().id(50L).role(Role.ADMIN).build();
            salon.setAdmin(adminDoSalao);
            when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);
            when(clienteRepository.findById(1L)).thenReturn(Optional.empty());

            // Passa pela verificação de salão e segue para a busca do cliente
            assertThatThrownBy(() -> agendamentoService.criar(request(), adminDoSalao))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Profissional só acessa a própria agenda (BUG-012)")
    class ProfissionalPropriaAgendaTests {

        // O agendamento do setUp é do profissional cujo usuário tem id 2
        private final Usuario dono = Usuario.builder().id(2L).role(Role.PROFISSIONAL).build();
        private final Usuario colega = Usuario.builder().id(3L).role(Role.PROFISSIONAL).build();

        @Test
        @DisplayName("Colega não abre, confirma, inicia, conclui, cancela, reagenda nem marca no-show pelo id")
        void colegaNaoAgePeloId() {
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));

            assertThatThrownBy(() -> agendamentoService.buscarPorId(1L, true, false, colega))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> agendamentoService.confirmar(1L, true, colega))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> agendamentoService.iniciar(1L, true, colega))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> agendamentoService.concluir(1L, true, colega))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> agendamentoService.marcarNoShow(1L, true, colega))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> agendamentoService.cancelar(1L, CancelamentoRequest.builder().motivo("x").build(), true, false, colega))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> agendamentoService.reagendar(1L,
                    com.belezza.api.dto.agendamento.ReagendamentoRequest.builder()
                            .novaDataHora(LocalDateTime.now().plusDays(2)).build(), true, false, colega))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

            assertThat(agendamento.getStatus()).isEqualTo(StatusAgendamento.PENDENTE);
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("O próprio profissional confirma o seu agendamento")
        void donoConfirma() {
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(agendamentoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            AgendamentoResponse response = agendamentoService.confirmar(1L, true, dono);

            assertThat(response.getStatus()).isEqualTo(StatusAgendamento.CONFIRMADO);
        }

        @Test
        @DisplayName("Lista do salão e histórico do cliente trazem só a agenda do profissional")
        void listasFiltradas() {
            Pageable pageable = PageRequest.of(0, 10);
            when(agendamentoRepository.findBySalonIdAndProfissionalUsuarioId(1L, 3L, pageable)).thenReturn(Page.empty());
            when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));
            when(agendamentoRepository.findByClienteIdAndProfissionalUsuarioId(1L, 3L, pageable)).thenReturn(Page.empty());

            agendamentoService.listarPorSalon(1L, pageable, true, colega);
            agendamentoService.listarPorCliente(1L, pageable, true, colega);

            verify(agendamentoRepository, never()).findBySalonId(any(), any());
            verify(agendamentoRepository, never()).findByClienteId(any(), any());
        }

        @Test
        @DisplayName("Profissional não cria agendamento na agenda de um colega")
        void naoCriaNaAgendaDoColega() {
            AgendamentoRequest request = AgendamentoRequest.builder().clienteId(1L).profissionalId(1L).servicoId(1L)
                    .dataHora(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0)).build();

            assertThatThrownBy(() -> agendamentoService.criar(request, colega))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Regra geral: profissional não agenda nem na própria agenda")
        void naoCriaNemNaPropriaAgenda() {
            AgendamentoRequest request = AgendamentoRequest.builder().clienteId(1L).profissionalId(1L).servicoId(1L)
                    .dataHora(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0)).build();

            assertThatThrownBy(() -> agendamentoService.criar(request, dono))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                    .hasMessageContaining("administrador ou à recepção");
            verifyNoInteractions(profissionalService);
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Regra geral: profissional não reagenda nem o próprio agendamento")
        void naoReagendaOProprio() {
            assertThatThrownBy(() -> agendamentoService.reagendar(1L,
                    com.belezza.api.dto.agendamento.ReagendamentoRequest.builder()
                            .novaDataHora(LocalDateTime.now().plusDays(2)).build(), true, false, dono))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                    .hasMessageContaining("reagendar");
            assertThat(agendamento.getStatus()).isEqualTo(StatusAgendamento.PENDENTE);
            verify(agendamentoRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Profissional só é agendado para os serviços que realiza (BUG-022)")
    class ServicosDoProfissionalTests {

        private final Usuario recepcionista = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();
        private Servico coloracao;

        @BeforeEach
        void stubs() {
            coloracao = Servico.builder().id(2L).nome("Coloração").preco(BigDecimal.valueOf(100))
                    .duracaoMinutos(60).salon(salon).ativo(true).build();
            // usados só nos testes de criação
            lenient().when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);
            lenient().when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));
        }

        private LocalDateTime amanha10h() {
            return LocalDateTime.now().plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0);
        }

        @Test
        @DisplayName("Serviço que o profissional não realiza é recusado")
        void servicoUnicoNaoRealizado() {
            when(servicoService.getServicoEntity(2L)).thenReturn(coloracao);
            AgendamentoRequest req = AgendamentoRequest.builder().clienteId(1L).profissionalId(1L)
                    .servicoId(2L).dataHora(amanha10h()).build();

            assertThatThrownBy(() -> agendamentoService.criar(req, recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Profissional Teste não realiza o serviço Coloração");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Vários serviços: basta um que ele não faça para recusar")
        void variosServicosUmNaoRealizado() {
            when(servicoService.getServicoEntity(1L)).thenReturn(servico);
            when(servicoService.getServicoEntity(2L)).thenReturn(coloracao);
            AgendamentoRequest req = AgendamentoRequest.builder().clienteId(1L).profissionalId(1L)
                    .servicoIds(List.of(1L, 2L)).dataHora(amanha10h()).build();

            assertThatThrownBy(() -> agendamentoService.criar(req, recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("não realiza o serviço Coloração");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Reagendar para um profissional que não faz o serviço é recusado")
        void reagendarParaQuemNaoFaz() {
            Profissional outro = Profissional.builder().id(3L).salon(salon)
                    .usuario(Usuario.builder().id(30L).nome("Barbeiro").build()).build();
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(profissionalService.getProfissionalEntity(3L)).thenReturn(outro);
            ReagendamentoRequest req = new ReagendamentoRequest();
            req.setNovaDataHora(amanha10h());
            req.setNovoProfissionalId(3L);

            assertThatThrownBy(() -> agendamentoService.reagendar(1L, req, false, false, recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Barbeiro não realiza o serviço Corte Masculino");
            verify(agendamentoRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Reagendar para horário que cruza o antigo (BUG-021)")
    class ReagendarSobreposicaoTests {

        private final Usuario recepcionista = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();

        @BeforeEach
        void stubs() {
            // agendamento de amanhã 10:00–10:30 (Corte de 30 min), expediente 09–17
            agendamento.setDataHora(LocalDateTime.now().plusDays(1).withHour(10).withMinute(0).withSecond(0).withNano(0));
            agendamento.setStatus(StatusAgendamento.CONFIRMADO);
            when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
            when(horarioTrabalhoRepository.findByProfissionalIdAndDiaSemana(eq(1L), any())).thenReturn(Optional.of(expediente(true)));
        }

        private ReagendamentoRequest para(int hora, int minuto) {
            ReagendamentoRequest r = new ReagendamentoRequest();
            r.setNovaDataHora(agendamento.getDataHora().withHour(hora).withMinute(minuto));
            return r;
        }

        @Test
        @DisplayName("10:00 → 10:15 passa: o único \"conflito\" é o próprio agendamento")
        void conflitoComEleMesmoNaoConta() {
            when(agendamentoRepository.findConflicts(eq(1L), any(), any())).thenReturn(List.of(agendamento));
            when(agendamentoRepository.save(any(Agendamento.class))).thenAnswer(i -> i.getArgument(0));

            agendamentoService.reagendar(1L, para(10, 15), false, false, recepcionista);

            assertThat(agendamento.getDataHora().getHour()).isEqualTo(10);
            assertThat(agendamento.getDataHora().getMinute()).isEqualTo(15);
            verify(agendamentoRepository).save(agendamento);
        }

        @Test
        @DisplayName("Cruzar OUTRO agendamento continua recusado")
        void conflitoComOutroContinua() {
            Agendamento outro = Agendamento.builder().id(2L).profissional(profissional).build();
            when(agendamentoRepository.findConflicts(eq(1L), any(), any())).thenReturn(List.of(agendamento, outro));

            assertThatThrownBy(() -> agendamentoService.reagendar(1L, para(10, 15), false, false, recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("já possui agendamento neste horário");
            verify(agendamentoRepository, never()).save(any());
        }
    }

    private HorarioTrabalho expediente(boolean ativo) {
        return HorarioTrabalho.builder()
                .profissional(profissional)
                .horaInicio(LocalTime.of(9, 0))
                .horaFim(LocalTime.of(17, 0))
                .ativo(ativo)
                .build();
    }

    @Nested
    @DisplayName("Criar - dias de folga e salão fechado")
    class CriarDiaDeAtendimentoTests {

        private final Usuario recepcionista = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();

        private AgendamentoRequest request(int hora) {
            return AgendamentoRequest.builder()
                    .clienteId(1L)
                    .profissionalId(1L)
                    .servicoId(1L)
                    .dataHora(LocalDateTime.now().plusDays(1).withHour(hora).withMinute(0).withSecond(0).withNano(0))
                    .build();
        }

        @BeforeEach
        void stubs() {
            when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);
            when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));
            when(servicoService.getServicoEntity(1L)).thenReturn(servico);
        }

        private void salaoNoDia(HorarioFuncionamentoSalon horario) {
            when(horarioFuncionamentoSalonRepository.findBySalonIdAndDiaSemana(eq(1L), any()))
                    .thenReturn(Optional.ofNullable(horario));
        }

        @Test
        @DisplayName("Profissional sem expediente cadastrado no dia (folga) não recebe agendamento")
        void semExpedienteNoDia() {
            salaoNoDia(null);
            when(horarioTrabalhoRepository.findByProfissionalIdAndDiaSemana(eq(1L), any())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> agendamentoService.criar(request(10), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("não atende neste dia");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Expediente do dia desativado conta como folga")
        void expedienteDesativado() {
            salaoNoDia(null);
            when(horarioTrabalhoRepository.findByProfissionalIdAndDiaSemana(eq(1L), any())).thenReturn(Optional.of(expediente(false)));

            assertThatThrownBy(() -> agendamentoService.criar(request(10), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("não atende neste dia");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Salão fechado no dia recusa o agendamento, mesmo com o profissional escalado")
        void salaoFechadoNoDia() {
            salaoNoDia(HorarioFuncionamentoSalon.builder().salon(salon).ativo(false).build());

            assertThatThrownBy(() -> agendamentoService.criar(request(10), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("salão não abre neste dia");
            verifyNoInteractions(horarioTrabalhoRepository);
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Horário do dia configurado no salão prevalece sobre o horário geral")
        void horarioDoDiaPrevalece() {
            // Horário geral 08-18, mas neste dia o salão abre só das 13 às 18
            salaoNoDia(HorarioFuncionamentoSalon.builder().salon(salon)
                    .horaInicio(LocalTime.of(13, 0)).horaFim(LocalTime.of(18, 0)).build());

            assertThatThrownBy(() -> agendamentoService.criar(request(10), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("fora do funcionamento do salão (13:00 - 18:00)");
            verify(agendamentoRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Criar - vários serviços validados pela duração total")
    class CriarVariosServicosTests {

        private final Usuario recepcionista = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();
        private Servico coloracao;

        @BeforeEach
        void stubs() {
            coloracao = Servico.builder().id(2L).nome("Coloração").preco(BigDecimal.valueOf(100))
                    .duracaoMinutos(90).salon(salon).ativo(true).build();
            profissional.getServicos().add(coloracao);
            when(profissionalService.getProfissionalEntity(1L)).thenReturn(profissional);
            when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));
            when(servicoService.getServicoEntity(2L)).thenReturn(coloracao);
            // Expediente 09-17, salão 08-18
            when(horarioTrabalhoRepository.findByProfissionalIdAndDiaSemana(eq(1L), any())).thenReturn(Optional.of(expediente(true)));
        }

        private AgendamentoRequest duasColoracoes(int hora, int minuto) {
            return AgendamentoRequest.builder()
                    .clienteId(1L)
                    .profissionalId(1L)
                    .servicoIds(List.of(2L, 2L))
                    .dataHora(LocalDateTime.now().plusDays(1).withHour(hora).withMinute(minuto).withSecond(0).withNano(0))
                    .build();
        }

        @Test
        @DisplayName("2 × 90 min às 15:00 termina 18:00 e ultrapassa o expediente das 17:00")
        void blocoUltrapassaExpediente() {
            assertThatThrownBy(() -> agendamentoService.criar(duasColoracoes(15, 0), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("fora do expediente do profissional (09:00 - 17:00)");
            verify(agendamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Bloqueio e conflitos são verificados até o fim do bloco inteiro")
        void bloqueioVerificadoAteOFimDoBloco() {
            AgendamentoRequest request = duasColoracoes(14, 0);
            when(bloqueioHorarioService.temBloqueio(eq(1L), any(), any())).thenReturn(true);

            assertThatThrownBy(() -> agendamentoService.criar(request, recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("bloqueio");
            verify(bloqueioHorarioService).temBloqueio(1L, request.getDataHora(), request.getDataHora().plusMinutes(180));
        }

        @Test
        @DisplayName("Bloco que termina exatamente no fim do expediente é aceito na validação")
        void blocoTerminaNoFimDoExpediente() {
            when(bloqueioHorarioService.temBloqueio(eq(1L), any(), any())).thenReturn(false);
            when(agendamentoRepository.findConflicts(eq(1L), any(), any())).thenReturn(List.of(agendamento));

            // 14:00 + 180 min = 17:00: passa pelo expediente e chega à checagem de conflitos
            assertThatThrownBy(() -> agendamentoService.criar(duasColoracoes(14, 0), recepcionista))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("já possui agendamento");
        }
    }
}
