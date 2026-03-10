package com.belezza.api.controller;

import com.belezza.api.dto.fidelidade.*;
import com.belezza.api.entity.NivelFidelidade;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.FidelidadeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/fidelidade")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fidelidade", description = "Sistema de fidelidade com extrato e niveis Bronze/Prata/Ouro")
public class FidelidadeController {

    private final FidelidadeService fidelidadeService;

    // ==================== PROGRAMAS ====================

    @PostMapping("/programas")
    @AdminOnly
    @Operation(summary = "Criar programa de fidelidade", description = "Cria um novo programa de fidelidade para o salao")
    public ResponseEntity<FidelidadeProgramaResponse> criarPrograma(
            @Valid @RequestBody FidelidadeProgramaRequest request,
            Authentication auth) {
        FidelidadeProgramaResponse response = fidelidadeService.criarPrograma(request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/programas/{id}")
    @AdminOnly
    @Operation(summary = "Atualizar programa de fidelidade", description = "Atualiza um programa existente")
    public ResponseEntity<FidelidadeProgramaResponse> atualizarPrograma(
            @PathVariable Long id,
            @Valid @RequestBody FidelidadeProgramaRequest request,
            Authentication auth) {
        FidelidadeProgramaResponse response = fidelidadeService.atualizarPrograma(id, request, auth.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/programas")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar programas de fidelidade", description = "Lista todos os programas ativos do salao")
    public ResponseEntity<List<FidelidadeProgramaResponse>> listarProgramas(Authentication auth) {
        List<FidelidadeProgramaResponse> programas = fidelidadeService.listarProgramas(auth.getName());
        return ResponseEntity.ok(programas);
    }

    @GetMapping("/programas/{id}")
    @ProfissionalOrAdmin
    @Operation(summary = "Buscar programa por ID", description = "Retorna detalhes de um programa especifico")
    public ResponseEntity<FidelidadeProgramaResponse> buscarPrograma(
            @PathVariable Long id,
            Authentication auth) {
        FidelidadeProgramaResponse programa = fidelidadeService.buscarPrograma(id, auth.getName());
        return ResponseEntity.ok(programa);
    }

    @DeleteMapping("/programas/{id}")
    @AdminOnly
    @Operation(summary = "Desativar programa", description = "Desativa um programa de fidelidade")
    public ResponseEntity<Void> desativarPrograma(
            @PathVariable Long id,
            Authentication auth) {
        fidelidadeService.desativarPrograma(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // ==================== CLIENTES ====================

    @PostMapping("/clientes/{clienteId}/inscrever/{programaId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Inscrever cliente em programa", description = "Inscreve um cliente em um programa de fidelidade")
    public ResponseEntity<FidelidadeClienteResponse> inscreverCliente(
            @PathVariable Long clienteId,
            @PathVariable Long programaId,
            Authentication auth) {
        FidelidadeClienteResponse response = fidelidadeService.inscreverCliente(clienteId, programaId, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/clientes/{clienteId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Buscar fidelidades do cliente", description = "Retorna todas as inscricoes de fidelidade de um cliente")
    public ResponseEntity<List<FidelidadeClienteResponse>> buscarFidelidadesCliente(
            @PathVariable Long clienteId) {
        List<FidelidadeClienteResponse> fidelidades = fidelidadeService.buscarFidelidadesCliente(clienteId);
        return ResponseEntity.ok(fidelidades);
    }

    @GetMapping("/clientes")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar clientes inscritos", description = "Lista todos os clientes inscritos em programas de fidelidade")
    public ResponseEntity<Page<FidelidadeClienteResponse>> listarClientes(
            @PageableDefault(size = 20) Pageable pageable,
            Authentication auth) {
        Page<FidelidadeClienteResponse> clientes = fidelidadeService.listarClientesPorSalon(auth.getName(), pageable);
        return ResponseEntity.ok(clientes);
    }

    @GetMapping("/clientes/nivel/{nivel}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar clientes por nivel", description = "Lista clientes filtrados por nivel de fidelidade")
    public ResponseEntity<List<FidelidadeClienteResponse>> listarClientesPorNivel(
            @PathVariable NivelFidelidade nivel,
            Authentication auth) {
        List<FidelidadeClienteResponse> clientes = fidelidadeService.listarClientesPorNivel(auth.getName(), nivel);
        return ResponseEntity.ok(clientes);
    }

    // ==================== TRANSACOES ====================

    @PostMapping("/resgatar/{fidelidadeClienteId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Resgatar credito", description = "Resgata um credito de recompensa")
    public ResponseEntity<FidelidadeTransacaoResponse> resgatarCredito(
            @PathVariable Long fidelidadeClienteId,
            @RequestParam(required = false) Long agendamentoId,
            Authentication auth) {
        FidelidadeTransacaoResponse response = fidelidadeService.resgatarCredito(
                fidelidadeClienteId, agendamentoId, auth.getName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bonus/{fidelidadeClienteId}")
    @AdminOnly
    @Operation(summary = "Adicionar bonus", description = "Adiciona creditos de bonus para um cliente")
    public ResponseEntity<FidelidadeTransacaoResponse> adicionarBonus(
            @PathVariable Long fidelidadeClienteId,
            @RequestParam int creditos,
            @RequestParam(required = false) String descricao,
            Authentication auth) {
        FidelidadeTransacaoResponse response = fidelidadeService.adicionarBonus(
                fidelidadeClienteId, creditos, descricao, auth.getName());
        return ResponseEntity.ok(response);
    }

    // ==================== EXTRATO ====================

    @GetMapping("/extrato/{fidelidadeClienteId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Extrato de fidelidade", description = "Retorna o extrato completo de um cliente")
    public ResponseEntity<ExtratoFidelidadeResponse> getExtrato(
            @PathVariable Long fidelidadeClienteId,
            @Parameter(description = "Data inicial (yyyy-MM-ddTHH:mm:ss)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @Parameter(description = "Data final (yyyy-MM-ddTHH:mm:ss)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fim) {
        ExtratoFidelidadeResponse extrato = fidelidadeService.getExtrato(fidelidadeClienteId, inicio, fim);
        return ResponseEntity.ok(extrato);
    }

    // ==================== RESUMO/DASHBOARD ====================

    @GetMapping("/resumo")
    @ProfissionalOrAdmin
    @Operation(summary = "Resumo de fidelidade", description = "Retorna resumo geral do programa de fidelidade")
    public ResponseEntity<FidelidadeResumoResponse> getResumo(Authentication auth) {
        FidelidadeResumoResponse resumo = fidelidadeService.getResumo(auth.getName());
        return ResponseEntity.ok(resumo);
    }
}
