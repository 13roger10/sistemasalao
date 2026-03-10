package com.belezza.api.service;

import com.belezza.api.dto.metricas.MetricasAgendamentoResponse;
import com.belezza.api.dto.metricas.MetricasAgendamentoResponse.MetricaDiaria;
import com.belezza.api.dto.metricas.MetricasAgendamentoResponse.MetricaPorProfissional;
import com.belezza.api.dto.metricas.MetricasAgendamentoResponse.MetricaPorServico;
import com.belezza.api.dto.metricas.PeriodoFilter;
import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.repository.AgendamentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for calculating scheduling metrics.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MetricasAgendamentoService {

    private final AgendamentoRepository agendamentoRepository;

    /**
     * Calculate comprehensive scheduling metrics for a salon in a given period.
     */
    public MetricasAgendamentoResponse calcularMetricas(Long salonId, PeriodoFilter periodo) {
        log.debug("Calculating scheduling metrics for salon: {} in period: {}", salonId, periodo);

        LocalDateTime inicio = periodo.getDataInicio().atStartOfDay();
        LocalDateTime fim = periodo.getDataFim().atTime(LocalTime.MAX);

        // Get status counts
        List<Object[]> statusCounts = agendamentoRepository.countByStatusAndPeriod(salonId, inicio, fim);
        Map<StatusAgendamento, Long> statusMap = convertToStatusMap(statusCounts);

        int total = statusMap.values().stream().mapToInt(Long::intValue).sum();
        int concluidos = statusMap.getOrDefault(StatusAgendamento.CONCLUIDO, 0L).intValue();
        int cancelados = statusMap.getOrDefault(StatusAgendamento.CANCELADO, 0L).intValue();
        int noShows = statusMap.getOrDefault(StatusAgendamento.NO_SHOW, 0L).intValue();

        double taxaConclusao = total > 0 ? (concluidos * 100.0 / total) : 0.0;

        // Get detailed metrics by professional and service
        List<MetricaPorProfissional> porProfissional = calcularMetricasPorProfissional(salonId, inicio, fim);
        List<MetricaPorServico> porServico = calcularMetricasPorServico(salonId, inicio, fim);
        List<MetricaDiaria> evolucaoDiaria = calcularEvolucaoDiaria(salonId, periodo);

        return MetricasAgendamentoResponse.builder()
                .periodo(periodo.getPeriodoIdentifier())
                .total(total)
                .concluidos(concluidos)
                .cancelados(cancelados)
                .noShows(noShows)
                .taxaConclusao(Math.round(taxaConclusao * 100.0) / 100.0)
                .porProfissional(porProfissional)
                .porServico(porServico)
                .evolucaoDiaria(evolucaoDiaria)
                .build();
    }

    /**
     * Calculate metrics grouped by professional.
     */
    private List<MetricaPorProfissional> calcularMetricasPorProfissional(
            Long salonId, LocalDateTime inicio, LocalDateTime fim) {

        // This would ideally be a custom repository query for better performance
        // For now, fetching all appointments and grouping in memory
        List<Agendamento> agendamentos = agendamentoRepository.findBySalonIdAndDataHoraBetween(
                salonId, inicio, fim);

        Map<Long, List<Agendamento>> groupedByProfissional = agendamentos.stream()
                .collect(Collectors.groupingBy(a -> a.getProfissional().getId()));

        return groupedByProfissional.entrySet().stream()
                .map(entry -> {
                    Long profId = entry.getKey();
                    List<Agendamento> profAgendamentos = entry.getValue();

                    int total = profAgendamentos.size();
                    int concluidos = (int) profAgendamentos.stream()
                            .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                            .count();
                    int cancelados = (int) profAgendamentos.stream()
                            .filter(a -> a.getStatus() == StatusAgendamento.CANCELADO)
                            .count();
                    int noShows = (int) profAgendamentos.stream()
                            .filter(a -> a.getStatus() == StatusAgendamento.NO_SHOW)
                            .count();

                    double taxa = total > 0 ? (concluidos * 100.0 / total) : 0.0;

                    // Get professional name from first appointment
                    String nome = profAgendamentos.get(0).getProfissional().getUsuario().getNome();

                    return MetricaPorProfissional.builder()
                            .profissionalId(profId)
                            .profissionalNome(nome)
                            .totalAgendamentos(total)
                            .concluidos(concluidos)
                            .cancelados(cancelados)
                            .noShows(noShows)
                            .taxaConclusao(Math.round(taxa * 100.0) / 100.0)
                            .build();
                })
                .sorted(Comparator.comparing(MetricaPorProfissional::getTotalAgendamentos).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Calculate metrics grouped by service.
     */
    private List<MetricaPorServico> calcularMetricasPorServico(
            Long salonId, LocalDateTime inicio, LocalDateTime fim) {

        List<Agendamento> agendamentos = agendamentoRepository.findBySalonIdAndDataHoraBetween(
                salonId, inicio, fim);

        Map<Long, List<Agendamento>> groupedByServico = agendamentos.stream()
                .collect(Collectors.groupingBy(a -> a.getServico().getId()));

        return groupedByServico.entrySet().stream()
                .map(entry -> {
                    Long servicoId = entry.getKey();
                    List<Agendamento> servicoAgendamentos = entry.getValue();

                    int total = servicoAgendamentos.size();
                    int concluidos = (int) servicoAgendamentos.stream()
                            .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                            .count();

                    BigDecimal somaValores = servicoAgendamentos.stream()
                            .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                            .map(Agendamento::getValorCobrado)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    double ticketMedio = concluidos > 0 ?
                            somaValores.divide(BigDecimal.valueOf(concluidos), 2, BigDecimal.ROUND_HALF_UP).doubleValue() : 0.0;

                    String nome = servicoAgendamentos.get(0).getServico().getNome();

                    return MetricaPorServico.builder()
                            .servicoId(servicoId)
                            .servicoNome(nome)
                            .totalAgendamentos(total)
                            .concluidos(concluidos)
                            .ticketMedio(Math.round(ticketMedio * 100.0) / 100.0)
                            .build();
                })
                .sorted(Comparator.comparing(MetricaPorServico::getTotalAgendamentos).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Calculate daily evolution of appointments.
     */
    private List<MetricaDiaria> calcularEvolucaoDiaria(Long salonId, PeriodoFilter periodo) {
        LocalDate inicio = periodo.getDataInicio();
        LocalDate fim = periodo.getDataFim();

        List<Agendamento> agendamentos = agendamentoRepository.findBySalonIdAndDataHoraBetween(
                salonId, inicio.atStartOfDay(), fim.atTime(LocalTime.MAX));

        // Group by date
        Map<LocalDate, List<Agendamento>> groupedByDate = agendamentos.stream()
                .collect(Collectors.groupingBy(a -> a.getDataHora().toLocalDate()));

        List<MetricaDiaria> metricas = new ArrayList<>();

        // Generate metrics for each day in the period
        LocalDate current = inicio;
        while (!current.isAfter(fim)) {
            List<Agendamento> dayAgendamentos = groupedByDate.getOrDefault(current, Collections.emptyList());

            int total = dayAgendamentos.size();
            int concluidos = (int) dayAgendamentos.stream()
                    .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                    .count();
            int cancelados = (int) dayAgendamentos.stream()
                    .filter(a -> a.getStatus() == StatusAgendamento.CANCELADO)
                    .count();

            metricas.add(MetricaDiaria.builder()
                    .data(current.toString())
                    .total(total)
                    .concluidos(concluidos)
                    .cancelados(cancelados)
                    .build());

            current = current.plusDays(1);
        }

        return metricas;
    }

    /**
     * Convert repository result to map.
     */
    private Map<StatusAgendamento, Long> convertToStatusMap(List<Object[]> results) {
        Map<StatusAgendamento, Long> map = new HashMap<>();
        for (Object[] row : results) {
            StatusAgendamento status = (StatusAgendamento) row[0];
            Long count = (Long) row[1];
            map.put(status, count);
        }
        return map;
    }
}
