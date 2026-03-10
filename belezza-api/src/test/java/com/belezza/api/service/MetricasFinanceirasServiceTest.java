package com.belezza.api.service;

import com.belezza.api.dto.metricas.MetricasFinanceirasResponse;
import com.belezza.api.dto.metricas.MetricasFinanceirasResponse.EvolucaoMensal;
import com.belezza.api.dto.metricas.MetricasFinanceirasResponse.MetricaPorFormaPagamento;
import com.belezza.api.dto.metricas.MetricasFinanceirasResponse.MetricaPorProfissional;
import com.belezza.api.dto.metricas.MetricasFinanceirasResponse.MetricaPorServico;
import com.belezza.api.dto.metricas.PeriodoFilter;
import com.belezza.api.entity.*;
import com.belezza.api.repository.PagamentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for MetricasFinanceirasService.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MetricasFinanceirasService Unit Tests")
class MetricasFinanceirasServiceTest {

    @Mock
    private PagamentoRepository pagamentoRepository;

    @InjectMocks
    private MetricasFinanceirasService service;

    private PeriodoFilter periodo;
    private Long salonId;
    private Usuario usuario1;
    private Usuario usuario2;
    private Salon salon;
    private Profissional profissional1;
    private Profissional profissional2;
    private Servico servico1;
    private Servico servico2;
    private Cliente cliente;

    @BeforeEach
    void setUp() {
        salonId = 1L;
        periodo = PeriodoFilter.builder()
                .dataInicio(LocalDate.of(2024, 1, 1))
                .dataFim(LocalDate.of(2024, 1, 31))
                .build();

        // Setup test data
        usuario1 = Usuario.builder()
                .id(1L)
                .nome("João Silva")
                .email("joao@example.com")
                .build();

        usuario2 = Usuario.builder()
                .id(2L)
                .nome("Maria Santos")
                .email("maria@example.com")
                .build();

        salon = Salon.builder()
                .id(salonId)
                .nome("Beleza Salon")
                .build();

        profissional1 = Profissional.builder()
                .id(1L)
                .usuario(usuario1)
                .salon(salon)
                .build();

        profissional2 = Profissional.builder()
                .id(2L)
                .usuario(usuario2)
                .salon(salon)
                .build();

        servico1 = Servico.builder()
                .id(1L)
                .nome("Corte de Cabelo")
                .preco(BigDecimal.valueOf(50.00))
                .build();

        servico2 = Servico.builder()
                .id(2L)
                .nome("Manicure")
                .preco(BigDecimal.valueOf(30.00))
                .build();

        Usuario clienteUsuario = Usuario.builder()
                .id(3L)
                .nome("Cliente Teste")
                .email("cliente@example.com")
                .build();

        cliente = Cliente.builder()
                .id(1L)
                .usuario(clienteUsuario)
                .build();
    }

    @Test
    @DisplayName("Should calculate financial metrics successfully")
    void shouldCalculateFinancialMetricsSuccessfully() {
        // Given
        BigDecimal totalBruto = BigDecimal.valueOf(500.00);
        BigDecimal ticketMedio = BigDecimal.valueOf(100.00);

        List<Pagamento> pagamentos = Arrays.asList(
                createPagamento(1L, BigDecimal.valueOf(100.00), FormaPagamento.PIX, profissional1, servico1),
                createPagamento(2L, BigDecimal.valueOf(100.00), FormaPagamento.PIX, profissional1, servico1),
                createPagamento(3L, BigDecimal.valueOf(100.00), FormaPagamento.CARTAO_CREDITO, profissional1, servico1),
                createPagamento(4L, BigDecimal.valueOf(100.00), FormaPagamento.CARTAO_CREDITO, profissional2, servico2),
                createPagamento(5L, BigDecimal.valueOf(100.00), FormaPagamento.DINHEIRO, profissional2, servico2)
        );

        List<Object[]> formaPagamentoData = Arrays.asList(
                new Object[]{FormaPagamento.PIX, 2L, BigDecimal.valueOf(200.00)},
                new Object[]{FormaPagamento.CARTAO_CREDITO, 2L, BigDecimal.valueOf(200.00)},
                new Object[]{FormaPagamento.DINHEIRO, 1L, BigDecimal.valueOf(100.00)}
        );

        when(pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(totalBruto);

        when(pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(ticketMedio);

        when(pagamentoRepository.findBySalonIdAndStatusAndPeriod(
                eq(salonId), eq(StatusPagamento.APROVADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(pagamentos);

        when(pagamentoRepository.sumByFormaPagamentoAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(formaPagamentoData);

        // When
        MetricasFinanceirasResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTotalBruto()).isEqualByComparingTo(BigDecimal.valueOf(500.00));
        assertThat(response.getTotalLiquido()).isEqualByComparingTo(BigDecimal.valueOf(500.00));
        assertThat(response.getTicketMedio()).isEqualByComparingTo(BigDecimal.valueOf(100.00));
        assertThat(response.getTotalAtendimentos()).isEqualTo(5);
        assertThat(response.getPeriodo()).contains("2024-01");

        verify(pagamentoRepository).sumFaturamentoBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class));
        verify(pagamentoRepository).avgTicketMedioBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("Should calculate metrics by payment method")
    void shouldCalculateMetricsByPaymentMethod() {
        // Given
        BigDecimal totalBruto = BigDecimal.valueOf(500.00);

        List<Object[]> formaPagamentoData = Arrays.asList(
                new Object[]{FormaPagamento.PIX, 2L, BigDecimal.valueOf(200.00)},
                new Object[]{FormaPagamento.CARTAO_CREDITO, 2L, BigDecimal.valueOf(200.00)},
                new Object[]{FormaPagamento.DINHEIRO, 1L, BigDecimal.valueOf(100.00)}
        );

        when(pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(totalBruto);

        when(pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(100.00));

        when(pagamentoRepository.findBySalonIdAndStatusAndPeriod(
                eq(salonId), eq(StatusPagamento.APROVADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        when(pagamentoRepository.sumByFormaPagamentoAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(formaPagamentoData);

        // When
        MetricasFinanceirasResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getPorFormaPagamento()).hasSize(3);

        MetricaPorFormaPagamento pixMetrics = response.getPorFormaPagamento().stream()
                .filter(m -> m.getFormaPagamento().equals("PIX"))
                .findFirst()
                .orElseThrow();

        assertThat(pixMetrics.getTotal()).isEqualByComparingTo(BigDecimal.valueOf(200.00));
        assertThat(pixMetrics.getQuantidade()).isEqualTo(2);
        assertThat(pixMetrics.getPercentual()).isEqualTo(40.0);
    }

    @Test
    @DisplayName("Should calculate metrics by service")
    void shouldCalculateMetricsByService() {
        // Given
        List<Pagamento> pagamentos = Arrays.asList(
                createPagamento(1L, BigDecimal.valueOf(50.00), FormaPagamento.PIX, profissional1, servico1),
                createPagamento(2L, BigDecimal.valueOf(50.00), FormaPagamento.PIX, profissional1, servico1),
                createPagamento(3L, BigDecimal.valueOf(50.00), FormaPagamento.PIX, profissional1, servico1),
                createPagamento(4L, BigDecimal.valueOf(30.00), FormaPagamento.PIX, profissional2, servico2),
                createPagamento(5L, BigDecimal.valueOf(30.00), FormaPagamento.PIX, profissional2, servico2)
        );

        when(pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(210.00));

        when(pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(42.00));

        when(pagamentoRepository.findBySalonIdAndStatusAndPeriod(
                eq(salonId), eq(StatusPagamento.APROVADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(pagamentos);

        when(pagamentoRepository.sumByFormaPagamentoAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // When
        MetricasFinanceirasResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getPorServico()).hasSize(2);

        MetricaPorServico servico1Metrics = response.getPorServico().stream()
                .filter(s -> s.getServicoId().equals(1L))
                .findFirst()
                .orElseThrow();

        assertThat(servico1Metrics.getServicoNome()).isEqualTo("Corte de Cabelo");
        assertThat(servico1Metrics.getTotal()).isEqualByComparingTo(BigDecimal.valueOf(150.00));
        assertThat(servico1Metrics.getQuantidade()).isEqualTo(3);
        assertThat(servico1Metrics.getTicketMedio()).isEqualByComparingTo(BigDecimal.valueOf(50.00));

        MetricaPorServico servico2Metrics = response.getPorServico().stream()
                .filter(s -> s.getServicoId().equals(2L))
                .findFirst()
                .orElseThrow();

        assertThat(servico2Metrics.getServicoNome()).isEqualTo("Manicure");
        assertThat(servico2Metrics.getTotal()).isEqualByComparingTo(BigDecimal.valueOf(60.00));
        assertThat(servico2Metrics.getQuantidade()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should calculate metrics by professional")
    void shouldCalculateMetricsByProfessional() {
        // Given
        List<Pagamento> pagamentos = Arrays.asList(
                createPagamento(1L, BigDecimal.valueOf(50.00), FormaPagamento.PIX, profissional1, servico1),
                createPagamento(2L, BigDecimal.valueOf(50.00), FormaPagamento.PIX, profissional1, servico1),
                createPagamento(3L, BigDecimal.valueOf(50.00), FormaPagamento.PIX, profissional1, servico1),
                createPagamento(4L, BigDecimal.valueOf(30.00), FormaPagamento.PIX, profissional2, servico2),
                createPagamento(5L, BigDecimal.valueOf(30.00), FormaPagamento.PIX, profissional2, servico2)
        );

        when(pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(210.00));

        when(pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(42.00));

        when(pagamentoRepository.findBySalonIdAndStatusAndPeriod(
                eq(salonId), eq(StatusPagamento.APROVADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(pagamentos);

        when(pagamentoRepository.sumByFormaPagamentoAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // When
        MetricasFinanceirasResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getPorProfissional()).hasSize(2);

        MetricaPorProfissional prof1Metrics = response.getPorProfissional().stream()
                .filter(p -> p.getProfissionalId().equals(1L))
                .findFirst()
                .orElseThrow();

        assertThat(prof1Metrics.getProfissionalNome()).isEqualTo("João Silva");
        assertThat(prof1Metrics.getTotal()).isEqualByComparingTo(BigDecimal.valueOf(150.00));
        assertThat(prof1Metrics.getQuantidade()).isEqualTo(3);
        assertThat(prof1Metrics.getTicketMedio()).isEqualByComparingTo(BigDecimal.valueOf(50.00));

        MetricaPorProfissional prof2Metrics = response.getPorProfissional().stream()
                .filter(p -> p.getProfissionalId().equals(2L))
                .findFirst()
                .orElseThrow();

        assertThat(prof2Metrics.getProfissionalNome()).isEqualTo("Maria Santos");
        assertThat(prof2Metrics.getTotal()).isEqualByComparingTo(BigDecimal.valueOf(60.00));
    }

    @Test
    @DisplayName("Should calculate monthly evolution")
    void shouldCalculateMonthlyEvolution() {
        // Given
        PeriodoFilter threeMonthPeriod = PeriodoFilter.builder()
                .dataInicio(LocalDate.of(2024, 1, 1))
                .dataFim(LocalDate.of(2024, 3, 31))
                .build();

        // Month 1: R$ 1000
        when(pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                eq(salonId),
                eq(LocalDateTime.of(2024, 1, 1, 0, 0, 0)),
                any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(1000.00));

        // Month 2: R$ 1200 (20% growth)
        when(pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                eq(salonId),
                eq(LocalDateTime.of(2024, 2, 1, 0, 0, 0)),
                any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(1200.00));

        // Month 3: R$ 1320 (10% growth)
        when(pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                eq(salonId),
                eq(LocalDateTime.of(2024, 3, 1, 0, 0, 0)),
                any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(1320.00));

        when(pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(100.00));

        when(pagamentoRepository.findBySalonIdAndStatusAndPeriod(
                eq(salonId), eq(StatusPagamento.APROVADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Arrays.asList(
                        createPagamento(1L, BigDecimal.valueOf(100.00), FormaPagamento.PIX, profissional1, servico1)
                ));

        when(pagamentoRepository.sumByFormaPagamentoAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // When
        MetricasFinanceirasResponse response = service.calcularMetricas(salonId, threeMonthPeriod);

        // Then
        assertThat(response.getEvolucaoMensal()).hasSize(3);

        EvolucaoMensal mes1 = response.getEvolucaoMensal().get(0);
        assertThat(mes1.getMes()).isEqualTo("2024-01");
        assertThat(mes1.getTotalBruto()).isEqualByComparingTo(BigDecimal.valueOf(1000.00));
        assertThat(mes1.getCrescimentoPercentual()).isEqualTo(0.0); // First month has no growth

        EvolucaoMensal mes2 = response.getEvolucaoMensal().get(1);
        assertThat(mes2.getMes()).isEqualTo("2024-02");
        assertThat(mes2.getTotalBruto()).isEqualByComparingTo(BigDecimal.valueOf(1200.00));
        assertThat(mes2.getCrescimentoPercentual()).isEqualTo(20.0);

        EvolucaoMensal mes3 = response.getEvolucaoMensal().get(2);
        assertThat(mes3.getMes()).isEqualTo("2024-03");
        assertThat(mes3.getTotalBruto()).isEqualByComparingTo(BigDecimal.valueOf(1320.00));
        assertThat(mes3.getCrescimentoPercentual()).isEqualTo(10.0);
    }

    @Test
    @DisplayName("Should handle empty results")
    void shouldHandleEmptyResults() {
        // Given
        when(pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(null);

        when(pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(null);

        when(pagamentoRepository.findBySalonIdAndStatusAndPeriod(
                eq(salonId), eq(StatusPagamento.APROVADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        when(pagamentoRepository.sumByFormaPagamentoAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // When
        MetricasFinanceirasResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTotalBruto()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getTotalLiquido()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getTicketMedio()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.getTotalAtendimentos()).isEqualTo(0);
        assertThat(response.getPorFormaPagamento()).isEmpty();
        assertThat(response.getPorServico()).isEmpty();
        assertThat(response.getPorProfissional()).isEmpty();
    }

    @Test
    @DisplayName("Should handle single month period")
    void shouldHandleSingleMonthPeriod() {
        // Given
        when(pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(1000.00));

        when(pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(BigDecimal.valueOf(100.00));

        when(pagamentoRepository.findBySalonIdAndStatusAndPeriod(
                eq(salonId), eq(StatusPagamento.APROVADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Arrays.asList(
                        createPagamento(1L, BigDecimal.valueOf(100.00), FormaPagamento.PIX, profissional1, servico1)
                ));

        when(pagamentoRepository.sumByFormaPagamentoAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // When
        MetricasFinanceirasResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getEvolucaoMensal()).hasSize(1);
        assertThat(response.getEvolucaoMensal().get(0).getMes()).isEqualTo("2024-01");
        assertThat(response.getEvolucaoMensal().get(0).getCrescimentoPercentual()).isEqualTo(0.0);
    }

    // Helper methods

    private Pagamento createPagamento(
            Long id,
            BigDecimal valor,
            FormaPagamento forma,
            Profissional profissional,
            Servico servico) {

        Agendamento agendamento = Agendamento.builder()
                .id(id)
                .profissional(profissional)
                .servico(servico)
                .cliente(cliente)
                .status(StatusAgendamento.CONCLUIDO)
                .dataHora(LocalDateTime.of(2024, 1, 15, 10, 0))
                .valorCobrado(valor)
                .build();

        return Pagamento.builder()
                .id(id)
                .agendamento(agendamento)
                .salon(salon)
                .valor(valor)
                .forma(forma)
                .status(StatusPagamento.APROVADO)
                .processadoEm(LocalDateTime.of(2024, 1, 15, 11, 0))
                .build();
    }
}
