package com.belezza.api.service;

import com.belezza.api.dto.metricas.MetricasFinanceirasResponse;
import com.belezza.api.dto.metricas.MetricasFinanceirasResponse.EvolucaoMensal;
import com.belezza.api.dto.metricas.MetricasFinanceirasResponse.MetricaPorFormaPagamento;
import com.belezza.api.dto.metricas.MetricasFinanceirasResponse.MetricaPorProfissional;
import com.belezza.api.dto.metricas.MetricasFinanceirasResponse.MetricaPorServico;
import com.belezza.api.dto.metricas.PeriodoFilter;
import com.belezza.api.entity.FormaPagamento;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.StatusPagamento;
import com.belezza.api.repository.PagamentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for calculating financial metrics.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MetricasFinanceirasService {

    private final PagamentoRepository pagamentoRepository;

    /**
     * Calculate comprehensive financial metrics for a salon in a given period.
     */
    public MetricasFinanceirasResponse calcularMetricas(Long salonId, PeriodoFilter periodo) {
        log.debug("Calculating financial metrics for salon: {} in period: {}", salonId, periodo);

        LocalDateTime inicio = periodo.getDataInicio().atStartOfDay();
        LocalDateTime fim = periodo.getDataFim().atTime(LocalTime.MAX);

        // Calculate total revenue
        BigDecimal totalBruto = pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(salonId, inicio, fim);
        if (totalBruto == null) {
            totalBruto = BigDecimal.ZERO;
        }

        // For now, totalLiquido = totalBruto (no deductions implemented yet)
        BigDecimal totalLiquido = totalBruto;

        // Calculate average ticket
        BigDecimal ticketMedio = pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(salonId, inicio, fim);
        if (ticketMedio == null) {
            ticketMedio = BigDecimal.ZERO;
        }

        // Get all approved payments for detailed metrics
        List<Pagamento> pagamentos = pagamentoRepository.findBySalonIdAndStatusAndPeriod(
                salonId, StatusPagamento.APROVADO, inicio, fim);

        int totalAtendimentos = pagamentos.size();

        // Calculate metrics by payment method
        List<MetricaPorFormaPagamento> porFormaPagamento = calcularPorFormaPagamento(salonId, inicio, fim, totalBruto);

        // Calculate metrics by service
        List<MetricaPorServico> porServico = calcularPorServico(pagamentos);

        // Calculate metrics by professional
        List<MetricaPorProfissional> porProfissional = calcularPorProfissional(pagamentos);

        // Calculate monthly evolution
        List<EvolucaoMensal> evolucaoMensal = calcularEvolucaoMensal(salonId, periodo);

        return MetricasFinanceirasResponse.builder()
                .periodo(periodo.getPeriodoIdentifier())
                .totalBruto(totalBruto.setScale(2, RoundingMode.HALF_UP))
                .totalLiquido(totalLiquido.setScale(2, RoundingMode.HALF_UP))
                .ticketMedio(ticketMedio.setScale(2, RoundingMode.HALF_UP))
                .totalAtendimentos(totalAtendimentos)
                .porFormaPagamento(porFormaPagamento)
                .porServico(porServico)
                .porProfissional(porProfissional)
                .evolucaoMensal(evolucaoMensal)
                .build();
    }

    /**
     * Calculate revenue by payment method.
     */
    private List<MetricaPorFormaPagamento> calcularPorFormaPagamento(
            Long salonId, LocalDateTime inicio, LocalDateTime fim, BigDecimal totalBruto) {

        List<Object[]> results = pagamentoRepository.sumByFormaPagamentoAndPeriod(salonId, inicio, fim);

        return results.stream()
                .map(row -> {
                    FormaPagamento forma = (FormaPagamento) row[0];
                    Long quantidade = (Long) row[1];
                    BigDecimal total = (BigDecimal) row[2];

                    double percentual = totalBruto.compareTo(BigDecimal.ZERO) > 0 ?
                            total.divide(totalBruto, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue() : 0.0;

                    return MetricaPorFormaPagamento.builder()
                            .formaPagamento(forma.name())
                            .total(total.setScale(2, RoundingMode.HALF_UP))
                            .quantidade(quantidade.intValue())
                            .percentual(Math.round(percentual * 100.0) / 100.0)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Calculate revenue by service.
     */
    private List<MetricaPorServico> calcularPorServico(List<Pagamento> pagamentos) {
        Map<Long, List<Pagamento>> groupedByServico = pagamentos.stream()
                .collect(Collectors.groupingBy(p -> p.getAgendamento().getServico().getId()));

        return groupedByServico.entrySet().stream()
                .map(entry -> {
                    Long servicoId = entry.getKey();
                    List<Pagamento> servicoPagamentos = entry.getValue();

                    BigDecimal total = servicoPagamentos.stream()
                            .map(Pagamento::getValor)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    int quantidade = servicoPagamentos.size();

                    BigDecimal ticketMedio = quantidade > 0 ?
                            total.divide(BigDecimal.valueOf(quantidade), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

                    String servicoNome = servicoPagamentos.get(0).getAgendamento().getServico().getNome();

                    return MetricaPorServico.builder()
                            .servicoId(servicoId)
                            .servicoNome(servicoNome)
                            .total(total.setScale(2, RoundingMode.HALF_UP))
                            .quantidade(quantidade)
                            .ticketMedio(ticketMedio)
                            .build();
                })
                .sorted((a, b) -> b.getTotal().compareTo(a.getTotal()))
                .collect(Collectors.toList());
    }

    /**
     * Calculate revenue by professional.
     */
    private List<MetricaPorProfissional> calcularPorProfissional(List<Pagamento> pagamentos) {
        Map<Long, List<Pagamento>> groupedByProfissional = pagamentos.stream()
                .collect(Collectors.groupingBy(p -> p.getAgendamento().getProfissional().getId()));

        return groupedByProfissional.entrySet().stream()
                .map(entry -> {
                    Long profissionalId = entry.getKey();
                    List<Pagamento> profPagamentos = entry.getValue();

                    BigDecimal total = profPagamentos.stream()
                            .map(Pagamento::getValor)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    int quantidade = profPagamentos.size();

                    BigDecimal ticketMedio = quantidade > 0 ?
                            total.divide(BigDecimal.valueOf(quantidade), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

                    String profissionalNome = profPagamentos.get(0).getAgendamento().getProfissional()
                            .getUsuario().getNome();

                    return MetricaPorProfissional.builder()
                            .profissionalId(profissionalId)
                            .profissionalNome(profissionalNome)
                            .total(total.setScale(2, RoundingMode.HALF_UP))
                            .quantidade(quantidade)
                            .ticketMedio(ticketMedio)
                            .build();
                })
                .sorted((a, b) -> b.getTotal().compareTo(a.getTotal()))
                .collect(Collectors.toList());
    }

    /**
     * Calculate monthly revenue evolution.
     */
    private List<EvolucaoMensal> calcularEvolucaoMensal(Long salonId, PeriodoFilter periodo) {
        List<EvolucaoMensal> evolucao = new ArrayList<>();

        LocalDate inicio = periodo.getDataInicio();
        LocalDate fim = periodo.getDataFim();

        // Get all months in the period
        YearMonth current = YearMonth.from(inicio);
        YearMonth last = YearMonth.from(fim);

        BigDecimal previousTotal = null;

        while (!current.isAfter(last)) {
            LocalDateTime monthStart = current.atDay(1).atStartOfDay();
            LocalDateTime monthEnd = current.atEndOfMonth().atTime(LocalTime.MAX);

            BigDecimal total = pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(salonId, monthStart, monthEnd);
            if (total == null) {
                total = BigDecimal.ZERO;
            }

            BigDecimal ticketMedio = pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(salonId, monthStart, monthEnd);
            if (ticketMedio == null) {
                ticketMedio = BigDecimal.ZERO;
            }

            List<Pagamento> monthPagamentos = pagamentoRepository.findBySalonIdAndStatusAndPeriod(
                    salonId, StatusPagamento.APROVADO, monthStart, monthEnd);

            // Calculate growth percentage
            double crescimento = 0.0;
            if (previousTotal != null && previousTotal.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal diff = total.subtract(previousTotal);
                crescimento = diff.divide(previousTotal, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue();
            }

            evolucao.add(EvolucaoMensal.builder()
                    .mes(current.toString())
                    .totalBruto(total.setScale(2, RoundingMode.HALF_UP))
                    .quantidade(monthPagamentos.size())
                    .ticketMedio(ticketMedio.setScale(2, RoundingMode.HALF_UP))
                    .crescimentoPercentual(Math.round(crescimento * 100.0) / 100.0)
                    .build());

            previousTotal = total;
            current = current.plusMonths(1);
        }

        return evolucao;
    }
}
