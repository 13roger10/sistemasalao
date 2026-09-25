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
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
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
            when(pagamentoRepository.findByAgendamentoId(100L)).thenReturn(Optional.empty());
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
            when(pagamentoRepository.findByAgendamentoId(100L)).thenReturn(Optional.empty());
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
    }
}
