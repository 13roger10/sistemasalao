package com.belezza.api.service;

import com.belezza.api.dto.dashboard.*;
import com.belezza.api.entity.*;
import com.belezza.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for dashboard metrics and analytics.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DashboardService {

    private final AgendamentoRepository agendamentoRepository;
    private final PagamentoRepository pagamentoRepository;
    private final ClienteRepository clienteRepository;
    private final ComissaoRepository comissaoRepository;
    private final AvaliacaoRepository avaliacaoRepository;

    private static final NumberFormat CURRENCY_FORMAT = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));

    /**
     * Get dashboard data for the current day.
     */
    public DashboardResponse getDashboardDiario(Long salonId) {
        LocalDate hoje = LocalDate.now();
        return getDashboard(salonId, hoje, hoje, "DIARIO");
    }

    /**
     * Get dashboard data for a specific date range.
     */
    public DashboardResponse getDashboard(Long salonId, LocalDate dataInicio, LocalDate dataFim, String periodo) {
        log.info("Gerando dashboard {} para salon {} de {} a {}", periodo, salonId, dataInicio, dataFim);

        LocalDateTime inicio = dataInicio.atStartOfDay();
        LocalDateTime fim = dataFim.atTime(LocalTime.MAX);

        // Calculate previous period for comparison
        long diasPeriodo = java.time.temporal.ChronoUnit.DAYS.between(dataInicio, dataFim) + 1;
        LocalDateTime inicioPeriodoAnterior = inicio.minusDays(diasPeriodo);
        LocalDateTime fimPeriodoAnterior = inicio.minusSeconds(1);

        return DashboardResponse.builder()
                .dataReferencia(dataInicio)
                .periodo(periodo)
                .faturamento(calcularFaturamento(salonId, inicio, fim, inicioPeriodoAnterior, fimPeriodoAnterior))
                .agendamentos(calcularAgendamentos(salonId, inicio, fim, inicioPeriodoAnterior, fimPeriodoAnterior))
                .rankingProfissionais(calcularRankingProfissionais(salonId, inicio, fim))
                .servicosMaisVendidos(calcularServicosMaisVendidos(salonId, inicio, fim))
                .clientes(calcularMetricasClientes(salonId, inicio, fim))
                .comissoes(calcularMetricasComissoes(salonId, inicio, fim))
                .build();
    }

    /**
     * Calculate revenue metrics.
     */
    private FaturamentoDTO calcularFaturamento(Long salonId, LocalDateTime inicio, LocalDateTime fim,
                                                LocalDateTime inicioAnterior, LocalDateTime fimAnterior) {
        // Current period
        BigDecimal valorTotalTemp = pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(salonId, inicio, fim);
        final BigDecimal valorTotal = valorTotalTemp != null ? valorTotalTemp : BigDecimal.ZERO;

        BigDecimal ticketMedio = pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(salonId, inicio, fim);
        if (ticketMedio == null) ticketMedio = BigDecimal.ZERO;

        // Previous period for comparison
        BigDecimal valorAnterior = pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(salonId, inicioAnterior, fimAnterior);
        if (valorAnterior == null) valorAnterior = BigDecimal.ZERO;

        // Calculate variation
        BigDecimal percentualVariacao = BigDecimal.ZERO;
        boolean crescimento = false;
        if (valorAnterior.compareTo(BigDecimal.ZERO) > 0) {
            percentualVariacao = valorTotal.subtract(valorAnterior)
                    .divide(valorAnterior, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
            crescimento = percentualVariacao.compareTo(BigDecimal.ZERO) >= 0;
        } else if (valorTotal.compareTo(BigDecimal.ZERO) > 0) {
            percentualVariacao = BigDecimal.valueOf(100);
            crescimento = true;
        }

        // By payment method
        List<Object[]> porForma = pagamentoRepository.sumByFormaPagamentoAndPeriod(salonId, inicio, fim);
        List<FaturamentoDTO.FaturamentoPorFormaPagamentoDTO> faturamentoPorForma = porForma.stream()
                .map(row -> {
                    FormaPagamento forma = (FormaPagamento) row[0];
                    Long count = (Long) row[1];
                    BigDecimal valor = (BigDecimal) row[2];
                    if (valor == null) valor = BigDecimal.ZERO;

                    BigDecimal percentual = BigDecimal.ZERO;
                    if (valorTotal.compareTo(BigDecimal.ZERO) > 0) {
                        percentual = valor.divide(valorTotal, 4, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100))
                                .setScale(2, RoundingMode.HALF_UP);
                    }

                    return FaturamentoDTO.FaturamentoPorFormaPagamentoDTO.builder()
                            .formaPagamento(forma.name())
                            .valor(valor)
                            .valorFormatado(formatCurrency(valor))
                            .quantidade(count.intValue())
                            .percentual(percentual)
                            .build();
                })
                .collect(Collectors.toList());

        return FaturamentoDTO.builder()
                .valorTotal(valorTotal)
                .valorTotalFormatado(formatCurrency(valorTotal))
                .valorPeriodoAnterior(valorAnterior)
                .percentualVariacao(percentualVariacao.abs())
                .crescimento(crescimento)
                .porFormaPagamento(faturamentoPorForma)
                .ticketMedio(ticketMedio.setScale(2, RoundingMode.HALF_UP))
                .ticketMedioFormatado(formatCurrency(ticketMedio))
                .build();
    }

    /**
     * Calculate appointment metrics.
     */
    private AgendamentosDTO calcularAgendamentos(Long salonId, LocalDateTime inicio, LocalDateTime fim,
                                                  LocalDateTime inicioAnterior, LocalDateTime fimAnterior) {
        // Current period by status
        List<Object[]> porStatus = agendamentoRepository.countByStatusAndPeriod(salonId, inicio, fim);

        int confirmados = 0, concluidos = 0, cancelados = 0, noShow = 0, pendentes = 0;
        int total = 0;

        for (Object[] row : porStatus) {
            StatusAgendamento status = (StatusAgendamento) row[0];
            Long count = (Long) row[1];

            switch (status) {
                case CONFIRMADO -> confirmados = count.intValue();
                case CONCLUIDO -> concluidos = count.intValue();
                case CANCELADO -> cancelados = count.intValue();
                case NO_SHOW -> noShow = count.intValue();
                case PENDENTE -> pendentes = count.intValue();
            }
            total += count.intValue();
        }

        // Previous period
        List<Object[]> porStatusAnterior = agendamentoRepository.countByStatusAndPeriod(salonId, inicioAnterior, fimAnterior);
        int totalAnterior = porStatusAnterior.stream()
                .mapToInt(row -> ((Long) row[1]).intValue())
                .sum();

        // Calculate variation
        BigDecimal percentualVariacao = BigDecimal.ZERO;
        boolean crescimento = false;
        if (totalAnterior > 0) {
            percentualVariacao = BigDecimal.valueOf(total - totalAnterior)
                    .divide(BigDecimal.valueOf(totalAnterior), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
            crescimento = percentualVariacao.compareTo(BigDecimal.ZERO) >= 0;
        } else if (total > 0) {
            percentualVariacao = BigDecimal.valueOf(100);
            crescimento = true;
        }

        // Attendance and cancellation rates
        int totalRealizados = concluidos + cancelados + noShow;
        BigDecimal taxaComparecimento = BigDecimal.ZERO;
        BigDecimal taxaCancelamento = BigDecimal.ZERO;
        if (totalRealizados > 0) {
            taxaComparecimento = BigDecimal.valueOf(concluidos)
                    .divide(BigDecimal.valueOf(totalRealizados), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
            taxaCancelamento = BigDecimal.valueOf(cancelados)
                    .divide(BigDecimal.valueOf(totalRealizados), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        // By hour (for chart)
        List<Object[]> porHora = agendamentoRepository.countByHourAndPeriod(salonId, inicio, fim);
        Map<Integer, Integer> mapaPorHora = new HashMap<>();
        for (int h = 6; h <= 22; h++) mapaPorHora.put(h, 0);
        for (Object[] row : porHora) {
            Integer hora = ((Number) row[0]).intValue();
            Long count = (Long) row[1];
            mapaPorHora.put(hora, count.intValue());
        }

        return AgendamentosDTO.builder()
                .total(total)
                .confirmados(confirmados)
                .concluidos(concluidos)
                .cancelados(cancelados)
                .noShow(noShow)
                .pendentes(pendentes)
                .totalPeriodoAnterior(totalAnterior)
                .percentualVariacao(percentualVariacao.abs())
                .crescimento(crescimento)
                .taxaComparecimento(taxaComparecimento)
                .taxaCancelamento(taxaCancelamento)
                .porHora(mapaPorHora)
                .build();
    }

    /**
     * Calculate professional ranking by revenue.
     */
    private List<RankingProfissionalDTO> calcularRankingProfissionais(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        List<Object[]> ranking = agendamentoRepository.findRankingProfissionaisByPeriod(salonId, inicio, fim);
        List<RankingProfissionalDTO> result = new ArrayList<>();

        int posicao = 1;
        for (Object[] row : ranking) {
            Long profId = (Long) row[0];
            String nome = (String) row[1];
            String fotoUrl = (String) row[2];
            Long atendimentos = (Long) row[3];
            BigDecimal faturamento = (BigDecimal) row[4];
            if (faturamento == null) faturamento = BigDecimal.ZERO;

            // Ticket médio
            BigDecimal ticketMedio = BigDecimal.ZERO;
            if (atendimentos > 0) {
                ticketMedio = faturamento.divide(BigDecimal.valueOf(atendimentos), 2, RoundingMode.HALF_UP);
            }

            // Commission total
            BigDecimal comissaoTotal = comissaoRepository.sumValorComissaoByProfissionalIdAndStatusAndPeriod(
                    profId, StatusComissao.CALCULADA, inicio, fim);
            BigDecimal comissaoPaga = comissaoRepository.sumValorComissaoByProfissionalIdAndStatusAndPeriod(
                    profId, StatusComissao.PAGA, inicio, fim);
            if (comissaoTotal == null) comissaoTotal = BigDecimal.ZERO;
            if (comissaoPaga == null) comissaoPaga = BigDecimal.ZERO;
            comissaoTotal = comissaoTotal.add(comissaoPaga);

            // Average rating
            BigDecimal avaliacaoMedia = avaliacaoRepository.avgNotaByProfissionalId(profId);
            if (avaliacaoMedia == null) avaliacaoMedia = BigDecimal.ZERO;

            result.add(RankingProfissionalDTO.builder()
                    .posicao(posicao++)
                    .profissionalId(profId)
                    .nome(nome)
                    .fotoUrl(fotoUrl)
                    .faturamento(faturamento)
                    .faturamentoFormatado(formatCurrency(faturamento))
                    .atendimentos(atendimentos.intValue())
                    .ticketMedio(ticketMedio)
                    .ticketMedioFormatado(formatCurrency(ticketMedio))
                    .avaliacaoMedia(avaliacaoMedia.setScale(1, RoundingMode.HALF_UP))
                    .comissaoTotal(comissaoTotal)
                    .comissaoTotalFormatada(formatCurrency(comissaoTotal))
                    .build());
        }

        return result;
    }

    /**
     * Calculate most popular services.
     */
    private List<ServicoPopularDTO> calcularServicosMaisVendidos(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        List<Object[]> topServicos = agendamentoRepository.findTopServicosByPeriod(
                salonId, inicio, fim, PageRequest.of(0, 10));

        // Total for percentage calculation
        int totalGeral = topServicos.stream()
                .mapToInt(row -> ((Long) row[4]).intValue())
                .sum();

        List<ServicoPopularDTO> result = new ArrayList<>();
        int posicao = 1;

        for (Object[] row : topServicos) {
            Long servicoId = (Long) row[0];
            String nome = (String) row[1];
            TipoServico tipo = (TipoServico) row[2];
            BigDecimal preco = (BigDecimal) row[3];
            Long quantidade = (Long) row[4];
            BigDecimal faturamento = (BigDecimal) row[5];
            if (faturamento == null) faturamento = BigDecimal.ZERO;

            BigDecimal percentual = BigDecimal.ZERO;
            if (totalGeral > 0) {
                percentual = BigDecimal.valueOf(quantidade)
                        .divide(BigDecimal.valueOf(totalGeral), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(2, RoundingMode.HALF_UP);
            }

            result.add(ServicoPopularDTO.builder()
                    .posicao(posicao++)
                    .servicoId(servicoId)
                    .nome(nome)
                    .categoria(tipo != null ? tipo.name() : "OUTROS")
                    .quantidade(quantidade.intValue())
                    .faturamento(faturamento)
                    .faturamentoFormatado(formatCurrency(faturamento))
                    .percentualTotal(percentual)
                    .preco(preco)
                    .precoFormatado(formatCurrency(preco))
                    .build());
        }

        return result;
    }

    /**
     * Calculate client metrics.
     */
    private ClientesDTO calcularMetricasClientes(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        long totalCadastrados = clienteRepository.countActiveBySalonId(salonId);
        long novosNoPeriodo = clienteRepository.countNovosBySalonIdAndPeriod(salonId, inicio, fim);
        long atendidosNoPeriodo = agendamentoRepository.countDistinctClientesAtendidosByPeriod(salonId, inicio, fim);

        // Recurrent clients (this returns null if no results)
        Long recorrentes = 0L;
        try {
            // Count clients with more than one appointment
            List<Agendamento> agendamentos = agendamentoRepository.findBySalonIdAndDataHoraBetween(salonId, inicio, fim);
            Map<Long, Long> atendimentosPorCliente = agendamentos.stream()
                    .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                    .collect(Collectors.groupingBy(
                            a -> a.getCliente().getId(),
                            Collectors.counting()
                    ));
            recorrentes = atendimentosPorCliente.values().stream()
                    .filter(count -> count > 1)
                    .count();
        } catch (Exception e) {
            log.warn("Erro ao calcular clientes recorrentes: {}", e.getMessage());
        }

        // Return rate
        BigDecimal taxaRetorno = BigDecimal.ZERO;
        if (atendidosNoPeriodo > 0) {
            taxaRetorno = BigDecimal.valueOf(recorrentes)
                    .divide(BigDecimal.valueOf(atendidosNoPeriodo), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        return ClientesDTO.builder()
                .totalCadastrados((int) totalCadastrados)
                .novosNoPeriodo((int) novosNoPeriodo)
                .atendidosNoPeriodo((int) atendidosNoPeriodo)
                .recorrentes(recorrentes.intValue())
                .taxaRetorno(taxaRetorno)
                .aniversariantes(0) // Not implemented yet - requires dataNascimento field
                .emProgramaFidelidade(0) // Will be implemented in Sprint 8
                .fidelidadeCompleta(0) // Will be implemented in Sprint 8
                .build();
    }

    /**
     * Calculate commission metrics.
     */
    private ComissoesDTO calcularMetricasComissoes(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        List<Object[]> porStatus = comissaoRepository.sumByStatusAndPeriod(salonId, inicio, fim);

        BigDecimal totalCalculado = BigDecimal.ZERO;
        BigDecimal totalPago = BigDecimal.ZERO;
        int quantidadeCalculadas = 0;
        int quantidadePagas = 0;

        for (Object[] row : porStatus) {
            StatusComissao status = (StatusComissao) row[0];
            Long count = (Long) row[1];
            BigDecimal valor = (BigDecimal) row[2];
            if (valor == null) valor = BigDecimal.ZERO;

            switch (status) {
                case CALCULADA -> {
                    totalCalculado = valor;
                    quantidadeCalculadas = count.intValue();
                }
                case PAGA -> {
                    totalPago = valor;
                    quantidadePagas = count.intValue();
                }
            }
        }

        BigDecimal totalPendente = totalCalculado; // CALCULADA = pending payment
        int quantidadePendentes = quantidadeCalculadas;

        return ComissoesDTO.builder()
                .totalCalculado(totalCalculado.add(totalPago))
                .totalCalculadoFormatado(formatCurrency(totalCalculado.add(totalPago)))
                .totalPago(totalPago)
                .totalPagoFormatado(formatCurrency(totalPago))
                .totalPendente(totalPendente)
                .totalPendenteFormatado(formatCurrency(totalPendente))
                .quantidadeCalculadas(quantidadeCalculadas + quantidadePagas)
                .quantidadePagas(quantidadePagas)
                .quantidadePendentes(quantidadePendentes)
                .build();
    }

    /**
     * Format currency in Brazilian Real.
     */
    private String formatCurrency(BigDecimal value) {
        if (value == null) return "R$ 0,00";
        return CURRENCY_FORMAT.format(value);
    }
}
