package com.belezza.api.service;

import com.belezza.api.dto.metricas.MetricasAgendamentoResponse;
import com.belezza.api.dto.metricas.MetricasAgendamentoResponse.MetricaDiaria;
import com.belezza.api.dto.metricas.MetricasAgendamentoResponse.MetricaPorProfissional;
import com.belezza.api.dto.metricas.MetricasAgendamentoResponse.MetricaPorServico;
import com.belezza.api.dto.metricas.PeriodoFilter;
import com.belezza.api.entity.*;
import com.belezza.api.repository.AgendamentoRepository;
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
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for MetricasAgendamentoService.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MetricasAgendamentoService Unit Tests")
class MetricasAgendamentoServiceTest {

    @Mock
    private AgendamentoRepository agendamentoRepository;

    @InjectMocks
    private MetricasAgendamentoService service;

    private PeriodoFilter periodo;
    private Long salonId;
    private Usuario usuario;
    private Salon salon;
    private Profissional profissional1;
    private Profissional profissional2;
    private Servico servico1;
    private Servico servico2;

    @BeforeEach
    void setUp() {
        salonId = 1L;
        periodo = PeriodoFilter.builder()
                .dataInicio(LocalDate.of(2024, 1, 1))
                .dataFim(LocalDate.of(2024, 1, 31))
                .build();

        // Setup test data
        usuario = Usuario.builder()
                .id(1L)
                .nome("João Silva")
                .email("joao@example.com")
                .build();

        Usuario usuario2 = Usuario.builder()
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
                .usuario(usuario)
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
    }

    @Test
    @DisplayName("Should calculate metrics with all appointments completed")
    void shouldCalculateMetricsWithAllCompleted() {
        // Given
        List<Object[]> statusCounts = List.<Object[]>of(
                new Object[]{StatusAgendamento.CONCLUIDO, 10L}
        );

        List<Agendamento> agendamentos = createAgendamentos(
                StatusAgendamento.CONCLUIDO, 10);

        when(agendamentoRepository.countByStatusAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(statusCounts);

        when(agendamentoRepository.findBySalonIdAndDataHoraBetween(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(agendamentos);

        // When
        MetricasAgendamentoResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTotal()).isEqualTo(10);
        assertThat(response.getConcluidos()).isEqualTo(10);
        assertThat(response.getCancelados()).isEqualTo(0);
        assertThat(response.getNoShows()).isEqualTo(0);
        assertThat(response.getTaxaConclusao()).isEqualTo(100.0);
        assertThat(response.getPeriodo()).contains("2024-01");

        verify(agendamentoRepository).countByStatusAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class));
        verify(agendamentoRepository, times(3)).findBySalonIdAndDataHoraBetween(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("Should calculate metrics with mixed statuses")
    void shouldCalculateMetricsWithMixedStatuses() {
        // Given
        List<Object[]> statusCounts = List.<Object[]>of(
                new Object[]{StatusAgendamento.CONCLUIDO, 7L},
                new Object[]{StatusAgendamento.CANCELADO, 2L},
                new Object[]{StatusAgendamento.NO_SHOW, 1L}
        );

        List<Agendamento> agendamentos = Arrays.asList(
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 10, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 11, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 12, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional2, servico2, LocalDateTime.of(2024, 1, 13, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional2, servico2, LocalDateTime.of(2024, 1, 14, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional2, servico2, LocalDateTime.of(2024, 1, 15, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional2, servico2, LocalDateTime.of(2024, 1, 16, 10, 0)),
                createAgendamento(StatusAgendamento.CANCELADO, profissional1, servico1, LocalDateTime.of(2024, 1, 17, 10, 0)),
                createAgendamento(StatusAgendamento.CANCELADO, profissional2, servico2, LocalDateTime.of(2024, 1, 18, 10, 0)),
                createAgendamento(StatusAgendamento.NO_SHOW, profissional1, servico1, LocalDateTime.of(2024, 1, 19, 10, 0))
        );

        when(agendamentoRepository.countByStatusAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(statusCounts);

        when(agendamentoRepository.findBySalonIdAndDataHoraBetween(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(agendamentos);

        // When
        MetricasAgendamentoResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTotal()).isEqualTo(10);
        assertThat(response.getConcluidos()).isEqualTo(7);
        assertThat(response.getCancelados()).isEqualTo(2);
        assertThat(response.getNoShows()).isEqualTo(1);
        assertThat(response.getTaxaConclusao()).isEqualTo(70.0);
    }

    @Test
    @DisplayName("Should calculate metrics by professional")
    void shouldCalculateMetricsByProfessional() {
        // Given
        List<Object[]> statusCounts = List.<Object[]>of(
                new Object[]{StatusAgendamento.CONCLUIDO, 5L}
        );

        List<Agendamento> agendamentos = Arrays.asList(
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 10, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 11, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 12, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional2, servico2, LocalDateTime.of(2024, 1, 13, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional2, servico2, LocalDateTime.of(2024, 1, 14, 10, 0))
        );

        when(agendamentoRepository.countByStatusAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(statusCounts);

        when(agendamentoRepository.findBySalonIdAndDataHoraBetween(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(agendamentos);

        // When
        MetricasAgendamentoResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getPorProfissional()).hasSize(2);

        MetricaPorProfissional prof1Metrics = response.getPorProfissional().stream()
                .filter(p -> p.getProfissionalId().equals(1L))
                .findFirst()
                .orElseThrow();

        assertThat(prof1Metrics.getProfissionalNome()).isEqualTo("João Silva");
        assertThat(prof1Metrics.getTotalAgendamentos()).isEqualTo(3);
        assertThat(prof1Metrics.getConcluidos()).isEqualTo(3);
        assertThat(prof1Metrics.getTaxaConclusao()).isEqualTo(100.0);

        MetricaPorProfissional prof2Metrics = response.getPorProfissional().stream()
                .filter(p -> p.getProfissionalId().equals(2L))
                .findFirst()
                .orElseThrow();

        assertThat(prof2Metrics.getProfissionalNome()).isEqualTo("Maria Santos");
        assertThat(prof2Metrics.getTotalAgendamentos()).isEqualTo(2);
        assertThat(prof2Metrics.getConcluidos()).isEqualTo(2);
    }

    @Test
    @DisplayName("Should calculate metrics by service")
    void shouldCalculateMetricsByService() {
        // Given
        List<Object[]> statusCounts = List.<Object[]>of(
                new Object[]{StatusAgendamento.CONCLUIDO, 5L}
        );

        List<Agendamento> agendamentos = Arrays.asList(
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 10, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 11, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 12, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional2, servico2, LocalDateTime.of(2024, 1, 13, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional2, servico2, LocalDateTime.of(2024, 1, 14, 10, 0))
        );

        when(agendamentoRepository.countByStatusAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(statusCounts);

        when(agendamentoRepository.findBySalonIdAndDataHoraBetween(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(agendamentos);

        // When
        MetricasAgendamentoResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getPorServico()).hasSize(2);

        MetricaPorServico servico1Metrics = response.getPorServico().stream()
                .filter(s -> s.getServicoId().equals(1L))
                .findFirst()
                .orElseThrow();

        assertThat(servico1Metrics.getServicoNome()).isEqualTo("Corte de Cabelo");
        assertThat(servico1Metrics.getTotalAgendamentos()).isEqualTo(3);
        assertThat(servico1Metrics.getConcluidos()).isEqualTo(3);
        assertThat(servico1Metrics.getTicketMedio()).isEqualTo(50.0);

        MetricaPorServico servico2Metrics = response.getPorServico().stream()
                .filter(s -> s.getServicoId().equals(2L))
                .findFirst()
                .orElseThrow();

        assertThat(servico2Metrics.getServicoNome()).isEqualTo("Manicure");
        assertThat(servico2Metrics.getTotalAgendamentos()).isEqualTo(2);
        assertThat(servico2Metrics.getTicketMedio()).isEqualTo(30.0);
    }

    @Test
    @DisplayName("Should calculate daily evolution")
    void shouldCalculateDailyEvolution() {
        // Given
        PeriodoFilter shortPeriod = PeriodoFilter.builder()
                .dataInicio(LocalDate.of(2024, 1, 1))
                .dataFim(LocalDate.of(2024, 1, 3))
                .build();

        List<Object[]> statusCounts = List.<Object[]>of(
                new Object[]{StatusAgendamento.CONCLUIDO, 3L}
        );

        List<Agendamento> agendamentos = Arrays.asList(
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 1, 10, 0)),
                createAgendamento(StatusAgendamento.CONCLUIDO, profissional1, servico1, LocalDateTime.of(2024, 1, 2, 10, 0)),
                createAgendamento(StatusAgendamento.CANCELADO, profissional1, servico1, LocalDateTime.of(2024, 1, 2, 11, 0))
        );

        when(agendamentoRepository.countByStatusAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(statusCounts);

        when(agendamentoRepository.findBySalonIdAndDataHoraBetween(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(agendamentos);

        // When
        MetricasAgendamentoResponse response = service.calcularMetricas(salonId, shortPeriod);

        // Then
        assertThat(response.getEvolucaoDiaria()).hasSize(3);

        MetricaDiaria day1 = response.getEvolucaoDiaria().get(0);
        assertThat(day1.getData()).isEqualTo("2024-01-01");
        assertThat(day1.getTotal()).isEqualTo(1);
        assertThat(day1.getConcluidos()).isEqualTo(1);
        assertThat(day1.getCancelados()).isEqualTo(0);

        MetricaDiaria day2 = response.getEvolucaoDiaria().get(1);
        assertThat(day2.getData()).isEqualTo("2024-01-02");
        assertThat(day2.getTotal()).isEqualTo(2);
        assertThat(day2.getConcluidos()).isEqualTo(1);
        assertThat(day2.getCancelados()).isEqualTo(1);

        MetricaDiaria day3 = response.getEvolucaoDiaria().get(2);
        assertThat(day3.getData()).isEqualTo("2024-01-03");
        assertThat(day3.getTotal()).isEqualTo(0);
        assertThat(day3.getConcluidos()).isEqualTo(0);
    }

    @Test
    @DisplayName("Should handle empty results")
    void shouldHandleEmptyResults() {
        // Given
        when(agendamentoRepository.countByStatusAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        when(agendamentoRepository.findBySalonIdAndDataHoraBetween(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // When
        MetricasAgendamentoResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getTotal()).isEqualTo(0);
        assertThat(response.getConcluidos()).isEqualTo(0);
        assertThat(response.getCancelados()).isEqualTo(0);
        assertThat(response.getNoShows()).isEqualTo(0);
        assertThat(response.getTaxaConclusao()).isEqualTo(0.0);
        assertThat(response.getPorProfissional()).isEmpty();
        assertThat(response.getPorServico()).isEmpty();
        assertThat(response.getEvolucaoDiaria()).hasSize(31); // January has 31 days
    }

    @Test
    @DisplayName("Should calculate completion rate correctly")
    void shouldCalculateCompletionRateCorrectly() {
        // Given
        List<Object[]> statusCounts = List.<Object[]>of(
                new Object[]{StatusAgendamento.CONCLUIDO, 8L},
                new Object[]{StatusAgendamento.CANCELADO, 2L}
        );

        when(agendamentoRepository.countByStatusAndPeriod(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(statusCounts);

        when(agendamentoRepository.findBySalonIdAndDataHoraBetween(
                eq(salonId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // When
        MetricasAgendamentoResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getTaxaConclusao()).isEqualTo(80.0);
    }

    // Helper methods

    private List<Agendamento> createAgendamentos(StatusAgendamento status, int count) {
        List<Agendamento> agendamentos = new java.util.ArrayList<>();
        for (int i = 0; i < count; i++) {
            agendamentos.add(createAgendamento(
                    status,
                    profissional1,
                    servico1,
                    LocalDateTime.of(2024, 1, i + 1, 10, 0)
            ));
        }
        return agendamentos;
    }

    private Agendamento createAgendamento(
            StatusAgendamento status,
            Profissional profissional,
            Servico servico,
            LocalDateTime dataHora) {

        return Agendamento.builder()
                .id(System.nanoTime())
                .profissional(profissional)
                .servico(servico)
                .status(status)
                .dataHora(dataHora)
                .valorCobrado(servico.getPreco())
                .build();
    }
}
