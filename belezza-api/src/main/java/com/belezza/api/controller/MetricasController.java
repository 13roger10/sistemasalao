package com.belezza.api.controller;

import com.belezza.api.dto.metricas.MetricasAgendamentoResponse;
import com.belezza.api.dto.metricas.MetricasFinanceirasResponse;
import com.belezza.api.dto.metricas.MetricasSocialResponse;
import com.belezza.api.dto.metricas.PeriodoFilter;
import com.belezza.api.security.annotation.Authenticated;
import com.belezza.api.service.MetricasAgendamentoService;
import com.belezza.api.service.MetricasFinanceirasService;
import com.belezza.api.service.MetricasSocialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * REST Controller for salon metrics and analytics.
 * Provides endpoints for scheduling, financial, and social media metrics.
 */
@RestController
@RequestMapping("/api/metricas")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Métricas", description = "Relatórios e métricas do salão")
public class MetricasController {

    private final MetricasAgendamentoService metricasAgendamentoService;
    private final MetricasFinanceirasService metricasFinanceirasService;
    private final MetricasSocialService metricasSocialService;

    // ====================================
    // 8.1 Métricas de Agendamento
    // ====================================

    @GetMapping("/agendamentos")
    @Authenticated
    @Operation(
        summary = "Obter métricas de agendamentos",
        description = "Retorna estatísticas completas sobre agendamentos do salão no período especificado. " +
                     "Inclui totais, taxas de conclusão, métricas por profissional e por serviço."
    )
    public ResponseEntity<MetricasAgendamentoResponse> getMetricasAgendamentos(
        @Parameter(description = "ID do salão") @RequestParam Long salonId,
        @Parameter(description = "Data de início do período (formato: yyyy-MM-dd)")
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
        @Parameter(description = "Data de fim do período (formato: yyyy-MM-dd)")
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim
    ) {
        log.info("Get scheduling metrics for salon: {} from {} to {}", salonId, dataInicio, dataFim);

        PeriodoFilter periodo = buildPeriodoFilter(dataInicio, dataFim);
        MetricasAgendamentoResponse metricas = metricasAgendamentoService.calcularMetricas(salonId, periodo);

        return ResponseEntity.ok(metricas);
    }

    // ====================================
    // 8.2 Métricas Financeiras
    // ====================================

    @GetMapping("/faturamento")
    @Authenticated
    @Operation(
        summary = "Obter métricas financeiras",
        description = "Retorna estatísticas financeiras do salão no período especificado. " +
                     "Inclui faturamento total, ticket médio, distribuição por forma de pagamento, " +
                     "e evolução mensal."
    )
    public ResponseEntity<MetricasFinanceirasResponse> getMetricasFinanceiras(
        @Parameter(description = "ID do salão") @RequestParam Long salonId,
        @Parameter(description = "Data de início do período (formato: yyyy-MM-dd)")
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
        @Parameter(description = "Data de fim do período (formato: yyyy-MM-dd)")
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim
    ) {
        log.info("Get financial metrics for salon: {} from {} to {}", salonId, dataInicio, dataFim);

        PeriodoFilter periodo = buildPeriodoFilter(dataInicio, dataFim);
        MetricasFinanceirasResponse metricas = metricasFinanceirasService.calcularMetricas(salonId, periodo);

        return ResponseEntity.ok(metricas);
    }

    // ====================================
    // 8.3 Métricas de Engajamento Social
    // ====================================

    @GetMapping("/social")
    @Authenticated
    @Operation(
        summary = "Obter métricas de redes sociais",
        description = "Retorna estatísticas de engajamento nas redes sociais no período especificado. " +
                     "Inclui posts publicados, engajamento total, melhor horário/dia para postar, " +
                     "e top posts."
    )
    public ResponseEntity<MetricasSocialResponse> getMetricasSocial(
        @Parameter(description = "ID do salão") @RequestParam Long salonId,
        @Parameter(description = "Data de início do período (formato: yyyy-MM-dd)")
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
        @Parameter(description = "Data de fim do período (formato: yyyy-MM-dd)")
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim
    ) {
        log.info("Get social metrics for salon: {} from {} to {}", salonId, dataInicio, dataFim);

        PeriodoFilter periodo = buildPeriodoFilter(dataInicio, dataFim);
        MetricasSocialResponse metricas = metricasSocialService.calcularMetricas(salonId, periodo);

        return ResponseEntity.ok(metricas);
    }

    // ====================================
    // Helper Methods
    // ====================================

    /**
     * Build PeriodoFilter from request parameters.
     * If dates are not provided, defaults to current month.
     */
    private PeriodoFilter buildPeriodoFilter(LocalDate dataInicio, LocalDate dataFim) {
        if (dataInicio != null && dataFim != null) {
            return PeriodoFilter.builder()
                    .dataInicio(dataInicio)
                    .dataFim(dataFim)
                    .build();
        }

        // Default to current month
        return PeriodoFilter.currentMonth();
    }
}
