package com.belezza.api.service;

import com.belezza.api.dto.pagamento.PagamentoRequest;
import com.belezza.api.dto.pagamento.PagamentoResponse;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.entity.*;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.PagamentoRepository;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PagamentoService Tests")
class PagamentoServiceTest {

    @Mock
    private PagamentoRepository pagamentoRepository;

    @Mock
    private AgendamentoRepository agendamentoRepository;

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private CaixaService caixaService;

    @InjectMocks
    private PagamentoService pagamentoService;

    private Salon salonA;
    private Salon salonB;
    private Usuario operador;

    @BeforeEach
    void setUp() {
        salonA = Salon.builder().id(1L).nome("Salão A").build();
        salonB = Salon.builder().id(2L).nome("Salão B").build();
        operador = Usuario.builder().id(10L).nome("Recepcionista A").role(Role.RECEPCIONISTA).build();
        TenantContext.setCurrentTenant(1L);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private Agendamento agendamentoConcluido(Salon salon) {
        Cliente cliente = Cliente.builder().id(5L).salon(salon).build();
        return Agendamento.builder()
                .id(100L)
                .salon(salon)
                .cliente(cliente)
                .status(StatusAgendamento.CONCLUIDO)
                .valorCobrado(new BigDecimal("80.00"))
                .build();
    }

    private PagamentoRequest request() {
        return PagamentoRequest.builder()
                .agendamentoId(100L)
                .valor(new BigDecimal("80.00"))
                .forma(FormaPagamento.PIX)
                .build();
    }

    @Nested
    @DisplayName("Registrar")
    class Registrar {

        @Test
        @DisplayName("Should register payment for an appointment of the operator's salon")
        void shouldRegisterForOwnSalon() {
            when(agendamentoRepository.findById(100L)).thenReturn(Optional.of(agendamentoConcluido(salonA)));
            when(pagamentoRepository.sumAprovadoByAgendamentoId(100L)).thenReturn(BigDecimal.ZERO);
            Caixa caixaAberto = Caixa.builder().id(7L).salon(salonA).status(StatusCaixa.ABERTO).build();
            when(caixaService.exigirAberto(1L)).thenReturn(caixaAberto);
            when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(inv -> inv.getArgument(0));

            PagamentoResponse response = pagamentoService.registrar(request(), operador);

            assertThat(response.getStatus()).isEqualTo(StatusPagamento.APROVADO);
            verify(pagamentoRepository).save(argThat(p -> p.getCaixa() == caixaAberto));
        }

        @Test
        @DisplayName("Should not register payment when the salon has no open cash register")
        void shouldRequireOpenCashRegister() {
            when(agendamentoRepository.findById(100L)).thenReturn(Optional.of(agendamentoConcluido(salonA)));
            when(pagamentoRepository.sumAprovadoByAgendamentoId(100L)).thenReturn(BigDecimal.ZERO);
            when(caixaService.exigirAberto(1L)).thenThrow(new BusinessException("Nenhum caixa aberto"));

            assertThatThrownBy(() -> pagamentoService.registrar(request(), operador))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("caixa aberto");
            verify(pagamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should deny registering payment for an appointment of another salon")
        void shouldDenyOtherSalon() {
            when(agendamentoRepository.findById(100L)).thenReturn(Optional.of(agendamentoConcluido(salonB)));

            assertThatThrownBy(() -> pagamentoService.registrar(request(), operador))
                    .isInstanceOf(AccessDeniedException.class);

            verify(pagamentoRepository, never()).save(any());
            verifyNoInteractions(clienteRepository);
        }

        @Test
        @DisplayName("Should deny registering payment when there is no tenant in context")
        void shouldDenyWithoutTenant() {
            TenantContext.clear();
            when(agendamentoRepository.findById(100L)).thenReturn(Optional.of(agendamentoConcluido(salonA)));

            assertThatThrownBy(() -> pagamentoService.registrar(request(), operador))
                    .isInstanceOf(AccessDeniedException.class);

            verify(pagamentoRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Profissional só acessa pagamentos dos próprios atendimentos (BUG-012)")
    class ProfissionalProprio {

        private final Usuario prof = Usuario.builder().id(20L).role(Role.PROFISSIONAL).build();

        private Agendamento atendimentoDe(Long usuarioId) {
            Agendamento a = agendamentoConcluido(salonA);
            a.setProfissional(Profissional.builder().id(usuarioId + 100)
                    .usuario(Usuario.builder().id(usuarioId).build()).salon(salonA).build());
            return a;
        }

        @Test
        @DisplayName("Lista só os pagamentos dos próprios atendimentos")
        void listaSoOsProprios() {
            Pageable pageable = PageRequest.of(0, 20);
            when(pagamentoRepository.findBySalonIdAndAgendamentoProfissionalUsuarioId(1L, 20L, pageable))
                    .thenReturn(Page.empty());

            pagamentoService.listarPorSalon(1L, pageable, prof);

            verify(pagamentoRepository, never()).findBySalonId(any(), any());
        }

        @Test
        @DisplayName("Não registra pagamento do atendimento de um colega")
        void naoRegistraDeColega() {
            when(agendamentoRepository.findById(100L)).thenReturn(Optional.of(atendimentoDe(21L)));

            assertThatThrownBy(() -> pagamentoService.registrar(request(), prof))
                    .isInstanceOf(AccessDeniedException.class);
            verify(pagamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Não consulta o pagamento do atendimento de um colega")
        void naoConsultaDeColega() {
            Pagamento pago = Pagamento.builder().id(1L).salon(salonA).agendamento(atendimentoDe(21L))
                    .valor(new BigDecimal("80.00")).forma(FormaPagamento.PIX).status(StatusPagamento.APROVADO).build();
            when(pagamentoRepository.findByAgendamentoIdOrderByCriadoEmAsc(100L)).thenReturn(List.of(pago));

            assertThatThrownBy(() -> pagamentoService.buscarPorAgendamento(100L, prof))
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("Valor, troco e pagamento dividido (BUG-008)")
    class ValorTrocoDividido {

        private final Caixa caixaAberto = Caixa.builder().id(7L).status(StatusCaixa.ABERTO).build();

        /** Atendimento de R$80 com {@code jaPago} já aprovado. */
        private void atendimento(String jaPago) {
            when(agendamentoRepository.findById(100L)).thenReturn(Optional.of(agendamentoConcluido(salonA)));
            when(pagamentoRepository.sumAprovadoByAgendamentoId(100L)).thenReturn(new BigDecimal(jaPago));
        }

        private void permiteGravar() {
            when(caixaService.exigirAberto(1L)).thenReturn(caixaAberto);
            when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(inv -> inv.getArgument(0));
        }

        private PagamentoRequest umaForma(String valor, FormaPagamento forma) {
            return PagamentoRequest.builder().agendamentoId(100L).valor(new BigDecimal(valor)).forma(forma).build();
        }

        private PagamentoRequest.Parte parte(FormaPagamento forma, String valor, String recebido) {
            return PagamentoRequest.Parte.builder().forma(forma).valor(new BigDecimal(valor))
                    .valorRecebido(recebido != null ? new BigDecimal(recebido) : null).build();
        }

        @Test
        @DisplayName("Recusa pagamento menor que o valor do atendimento (R$30 de R$80)")
        void recusaInsuficiente() {
            atendimento("0");
            assertThatThrownBy(() -> pagamentoService.registrar(umaForma("30", FormaPagamento.CARTAO_DEBITO), operador))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("diferente do valor a pagar")
                    .hasMessageContaining("dividido");
            verify(pagamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Recusa pagamento acima do valor fora do dinheiro (R$500 no crédito de R$80)")
        void recusaAcimaNoCartao() {
            atendimento("0");
            assertThatThrownBy(() -> pagamentoService.registrar(umaForma("500", FormaPagamento.CARTAO_CREDITO), operador))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("diferente do valor a pagar");
            verify(pagamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Dinheiro acima do valor vira troco: R$100 entregues para R$80 → receita 80, troco 20")
        void dinheiroComTroco() {
            atendimento("0");
            permiteGravar();

            PagamentoResponse r = pagamentoService.registrar(umaForma("100", FormaPagamento.DINHEIRO), operador);

            assertThat(r.getValor()).isEqualByComparingTo("80");
            assertThat(r.getValorRecebido()).isEqualByComparingTo("100");
            assertThat(r.getTroco()).isEqualByComparingTo("20");
            assertThat(r.getTrocoTotal()).isEqualByComparingTo("20");
            verify(clienteRepository).save(argThat(c -> c.getTotalGasto().compareTo(new BigDecimal("80")) == 0));
        }

        @Test
        @DisplayName("Pagamento dividido: PIX 50 + dinheiro 30 (recebido 50) grava duas partes e troco 20")
        void dividido() {
            atendimento("0");
            permiteGravar();
            PagamentoRequest req = PagamentoRequest.builder().agendamentoId(100L).partes(List.of(
                    parte(FormaPagamento.PIX, "50", null),
                    parte(FormaPagamento.DINHEIRO, "30", "50"))).build();

            PagamentoResponse r = pagamentoService.registrar(req, operador);

            assertThat(r.getPartes()).hasSize(2);
            assertThat(r.getPartes()).extracting(PagamentoResponse::getForma)
                    .containsExactly(FormaPagamento.PIX, FormaPagamento.DINHEIRO);
            assertThat(r.getTotalAtendimento()).isEqualByComparingTo("80");
            assertThat(r.getTrocoTotal()).isEqualByComparingTo("20");
            verify(pagamentoRepository, times(2)).save(argThat(p -> p.getCaixa() == caixaAberto));

            // A resposta precisa ser serializável (sem referência circular entre principal e partes)
            assertThatCode(() -> new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules()
                    .writeValueAsString(r)).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Pagamento dividido cuja soma não fecha é recusado inteiro")
        void divididoNaoFecha() {
            atendimento("0");
            PagamentoRequest req = PagamentoRequest.builder().agendamentoId(100L).partes(List.of(
                    parte(FormaPagamento.PIX, "50", null),
                    parte(FormaPagamento.DINHEIRO, "20", null))).build();

            assertThatThrownBy(() -> pagamentoService.registrar(req, operador))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("R$ 70,00");
            verify(pagamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Valor recebido só em dinheiro e nunca menor que a parte")
        void valorRecebidoInvalido() {
            atendimento("0");
            PagamentoRequest noPix = PagamentoRequest.builder().agendamentoId(100L).partes(List.of(
                    parte(FormaPagamento.PIX, "80", "100"))).build();
            assertThatThrownBy(() -> pagamentoService.registrar(noPix, operador))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("só se aplicam a pagamento em dinheiro");

            PagamentoRequest recebidoMenor = PagamentoRequest.builder().agendamentoId(100L).partes(List.of(
                    parte(FormaPagamento.DINHEIRO, "80", "50"))).build();
            assertThatThrownBy(() -> pagamentoService.registrar(recebidoMenor, operador))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("menor que o valor da parte");
        }

        @Test
        @DisplayName("Atendimento já pago não aceita novo pagamento; após estorno parcial cobra só o que falta")
        void jaPagoERestante() {
            atendimento("80");
            assertThatThrownBy(() -> pagamentoService.registrar(umaForma("80", FormaPagamento.PIX), operador))
                    .isInstanceOf(BusinessException.class).hasMessageContaining("já está pago");

            // 50 continuam aprovados (a parte de 30 foi estornada): falta pagar 30
            when(pagamentoRepository.sumAprovadoByAgendamentoId(100L)).thenReturn(new BigDecimal("50"));
            permiteGravar();
            PagamentoResponse r = pagamentoService.registrar(umaForma("30", FormaPagamento.CARTAO_DEBITO), operador);
            assertThat(r.getValor()).isEqualByComparingTo("30");
        }

        @Test
        @DisplayName("Trava o atendimento antes de conferir o saldo (duplo clique em Pagar)")
        void travaAntesDoSaldo() {
            atendimento("0");
            permiteGravar();
            pagamentoService.registrar(umaForma("80", FormaPagamento.PIX), operador);

            var ordem = inOrder(agendamentoRepository, pagamentoRepository);
            ordem.verify(agendamentoRepository).lockAgendamento(100L);
            ordem.verify(pagamentoRepository).sumAprovadoByAgendamentoId(100L);
        }
    }

    @Nested
    @DisplayName("Estornar")
    class Estornar {

        private Pagamento pagamentoAprovado(Salon salon) {
            return Pagamento.builder()
                    .id(50L)
                    .salon(salon)
                    .agendamento(agendamentoConcluido(salon))
                    .valor(new BigDecimal("80.00"))
                    .forma(FormaPagamento.PIX)
                    .status(StatusPagamento.APROVADO)
                    .build();
        }

        @Test
        @DisplayName("Should refund a payment of the operator's salon")
        void shouldRefundOwnSalon() {
            when(pagamentoRepository.findById(50L)).thenReturn(Optional.of(pagamentoAprovado(salonA)));
            when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(inv -> inv.getArgument(0));

            PagamentoResponse response = pagamentoService.estornar(50L);

            assertThat(response.getStatus()).isEqualTo(StatusPagamento.ESTORNADO);
        }

        @Test
        @DisplayName("Should deny refunding a payment of another salon")
        void shouldDenyOtherSalon() {
            Pagamento pagamento = pagamentoAprovado(salonB);
            when(pagamentoRepository.findById(50L)).thenReturn(Optional.of(pagamento));

            assertThatThrownBy(() -> pagamentoService.estornar(50L))
                    .isInstanceOf(AccessDeniedException.class);

            assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.APROVADO);
            verify(pagamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Funcionário e recepcionista não estornam, nem pagamento do próprio atendimento (BUG-013)")
        void soAdminEstorna() {
            Pagamento pagamento = pagamentoAprovado(salonA);
            when(pagamentoRepository.findById(50L)).thenReturn(Optional.of(pagamento));
            Usuario prof = Usuario.builder().id(20L).role(Role.PROFISSIONAL).build();
            pagamento.getAgendamento().setProfissional(Profissional.builder().id(6L).usuario(prof).salon(salonA).build());

            assertThatThrownBy(() -> pagamentoService.estornar(50L, prof))
                    .isInstanceOf(AccessDeniedException.class);
            assertThatThrownBy(() -> pagamentoService.estornar(50L, operador)) // recepcionista
                    .isInstanceOf(AccessDeniedException.class);

            assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.APROVADO);
            verifyNoInteractions(caixaService);
            verify(pagamentoRepository, never()).save(any());
        }

        @Test
        @DisplayName("Admin do salão estorna e a devolução passa pelo caixa")
        void adminEstorna() {
            Usuario admin = Usuario.builder().id(1L).role(Role.ADMIN).build();
            Pagamento pagamento = pagamentoAprovado(salonA);
            when(pagamentoRepository.findById(50L)).thenReturn(Optional.of(pagamento));
            when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(inv -> inv.getArgument(0));

            PagamentoResponse response = pagamentoService.estornar(50L, admin);

            assertThat(response.getStatus()).isEqualTo(StatusPagamento.ESTORNADO);
            verify(caixaService).registrarEstorno(pagamento, admin);
        }
    }
}
