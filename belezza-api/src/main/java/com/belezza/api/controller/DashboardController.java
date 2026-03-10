package com.belezza.api.controller;

import com.belezza.api.dto.dashboard.*;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.DashboardService;
import com.belezza.api.service.SalonService;
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
 * Controller for dashboard and analytics endpoints.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Dashboard", description = "Dashboard e metricas do salao")
public class DashboardController {

    private final DashboardService dashboardService;
    private final SalonService salonService;

    @GetMapping("/diario")
    @ProfissionalOrAdmin
    @Operation(summary = "Dashboard diario", description = "Retorna metricas do dia atual")
    public ResponseEntity<DashboardResponse> getDashboardDiario() {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        log.info("Requisicao de dashboard diario para salon {}", salonId);

        DashboardResponse response = dashboardService.getDashboardDiario(salonId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/semanal")
    @ProfissionalOrAdmin
    @Operation(summary = "Dashboard semanal", description = "Retorna metricas da semana atual")
    public ResponseEntity<DashboardResponse> getDashboardSemanal() {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        log.info("Requisicao de dashboard semanal para salon {}", salonId);

        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1);
        LocalDate fimSemana = inicioSemana.plusDays(6);

        DashboardResponse response = dashboardService.getDashboard(salonId, inicioSemana, fimSemana, "SEMANAL");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/mensal")
    @ProfissionalOrAdmin
    @Operation(summary = "Dashboard mensal", description = "Retorna metricas do mes atual")
    public ResponseEntity<DashboardResponse> getDashboardMensal() {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        log.info("Requisicao de dashboard mensal para salon {}", salonId);

        LocalDate hoje = LocalDate.now();
        LocalDate inicioMes = hoje.withDayOfMonth(1);
        LocalDate fimMes = hoje.withDayOfMonth(hoje.lengthOfMonth());

        DashboardResponse response = dashboardService.getDashboard(salonId, inicioMes, fimMes, "MENSAL");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/periodo")
    @ProfissionalOrAdmin
    @Operation(summary = "Dashboard por periodo", description = "Retorna metricas de um periodo especifico")
    public ResponseEntity<DashboardResponse> getDashboardPeriodo(
            @Parameter(description = "Data inicial (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @Parameter(description = "Data final (yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {

        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        log.info("Requisicao de dashboard por periodo para salon {} de {} a {}", salonId, dataInicio, dataFim);

        DashboardResponse response = dashboardService.getDashboard(salonId, dataInicio, dataFim, "PERSONALIZADO");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/faturamento/dia")
    @ProfissionalOrAdmin
    @Operation(summary = "Faturamento do dia", description = "Retorna apenas o faturamento do dia atual")
    public ResponseEntity<FaturamentoDTO> getFaturamentoDia() {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        DashboardResponse dashboard = dashboardService.getDashboardDiario(salonId);
        return ResponseEntity.ok(dashboard.getFaturamento());
    }

    @GetMapping("/ranking/profissionais")
    @ProfissionalOrAdmin
    @Operation(summary = "Ranking de profissionais", description = "Retorna o ranking de profissionais por faturamento")
    public ResponseEntity<?> getRankingProfissionais(
            @Parameter(description = "Periodo: DIARIO, SEMANAL ou MENSAL")
            @RequestParam(defaultValue = "MENSAL") String periodo) {

        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        LocalDate hoje = LocalDate.now();
        LocalDate dataInicio;
        LocalDate dataFim = hoje;

        switch (periodo.toUpperCase()) {
            case "DIARIO" -> dataInicio = hoje;
            case "SEMANAL" -> dataInicio = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1);
            default -> dataInicio = hoje.withDayOfMonth(1);
        }

        DashboardResponse dashboard = dashboardService.getDashboard(salonId, dataInicio, dataFim, periodo);
        return ResponseEntity.ok(dashboard.getRankingProfissionais());
    }

    @GetMapping("/servicos/populares")
    @ProfissionalOrAdmin
    @Operation(summary = "Servicos mais vendidos", description = "Retorna os servicos mais vendidos")
    public ResponseEntity<?> getServicosMaisVendidos(
            @Parameter(description = "Periodo: DIARIO, SEMANAL ou MENSAL")
            @RequestParam(defaultValue = "MENSAL") String periodo) {

        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        LocalDate hoje = LocalDate.now();
        LocalDate dataInicio;
        LocalDate dataFim = hoje;

        switch (periodo.toUpperCase()) {
            case "DIARIO" -> dataInicio = hoje;
            case "SEMANAL" -> dataInicio = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1);
            default -> dataInicio = hoje.withDayOfMonth(1);
        }

        DashboardResponse dashboard = dashboardService.getDashboard(salonId, dataInicio, dataFim, periodo);
        return ResponseEntity.ok(dashboard.getServicosMaisVendidos());
    }

    @GetMapping("/agendamentos/resumo")
    @ProfissionalOrAdmin
    @Operation(summary = "Resumo de agendamentos", description = "Retorna resumo de agendamentos do periodo")
    public ResponseEntity<AgendamentosDTO> getResumoAgendamentos(
            @Parameter(description = "Periodo: DIARIO, SEMANAL ou MENSAL")
            @RequestParam(defaultValue = "DIARIO") String periodo) {

        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        LocalDate hoje = LocalDate.now();
        LocalDate dataInicio;
        LocalDate dataFim = hoje;

        switch (periodo.toUpperCase()) {
            case "SEMANAL" -> dataInicio = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1);
            case "MENSAL" -> dataInicio = hoje.withDayOfMonth(1);
            default -> dataInicio = hoje;
        }

        DashboardResponse dashboard = dashboardService.getDashboard(salonId, dataInicio, dataFim, periodo);
        return ResponseEntity.ok(dashboard.getAgendamentos());
    }

    @GetMapping("/clientes/metricas")
    @ProfissionalOrAdmin
    @Operation(summary = "Metricas de clientes", description = "Retorna metricas de clientes do periodo")
    public ResponseEntity<ClientesDTO> getMetricasClientes(
            @Parameter(description = "Periodo: DIARIO, SEMANAL ou MENSAL")
            @RequestParam(defaultValue = "MENSAL") String periodo) {

        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        LocalDate hoje = LocalDate.now();
        LocalDate dataInicio;
        LocalDate dataFim = hoje;

        switch (periodo.toUpperCase()) {
            case "DIARIO" -> dataInicio = hoje;
            case "SEMANAL" -> dataInicio = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1);
            default -> dataInicio = hoje.withDayOfMonth(1);
        }

        DashboardResponse dashboard = dashboardService.getDashboard(salonId, dataInicio, dataFim, periodo);
        return ResponseEntity.ok(dashboard.getClientes());
    }

    @GetMapping("/comissoes/resumo")
    @ProfissionalOrAdmin
    @Operation(summary = "Resumo de comissoes", description = "Retorna resumo de comissoes do periodo")
    public ResponseEntity<ComissoesDTO> getResumoComissoes(
            @Parameter(description = "Periodo: DIARIO, SEMANAL ou MENSAL")
            @RequestParam(defaultValue = "MENSAL") String periodo) {

        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        LocalDate hoje = LocalDate.now();
        LocalDate dataInicio;
        LocalDate dataFim = hoje;

        switch (periodo.toUpperCase()) {
            case "DIARIO" -> dataInicio = hoje;
            case "SEMANAL" -> dataInicio = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1);
            default -> dataInicio = hoje.withDayOfMonth(1);
        }

        DashboardResponse dashboard = dashboardService.getDashboard(salonId, dataInicio, dataFim, periodo);
        return ResponseEntity.ok(dashboard.getComissoes());
    }
}
