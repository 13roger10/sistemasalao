package com.belezza.api.controller;

import com.belezza.api.dto.comissao.ComissaoResumoResponse;
import com.belezza.api.dto.comissao.ComissaoResponse;
import com.belezza.api.dto.comissao.ConfiguracaoComissaoRequest;
import com.belezza.api.entity.StatusComissao;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.ComissaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/comissoes")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Comissoes", description = "Gerenciamento de comissoes dos profissionais")
public class ComissaoController {

    private final ComissaoService comissaoService;

    @GetMapping("/{id}")
    @ProfissionalOrAdmin
    @Operation(summary = "Buscar comissao", description = "Busca uma comissao pelo ID")
    public ResponseEntity<ComissaoResponse> buscarPorId(@PathVariable Long id) {
        ComissaoResponse response = comissaoService.buscarPorId(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar por salao", description = "Lista comissoes de um salao")
    public ResponseEntity<Page<ComissaoResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        Page<ComissaoResponse> response = comissaoService.listarPorSalon(salonId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar por profissional", description = "Lista comissoes de um profissional")
    public ResponseEntity<Page<ComissaoResponse>> listarPorProfissional(
            @PathVariable Long profissionalId,
            @RequestParam(required = false) StatusComissao status,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        Page<ComissaoResponse> response;
        if (status != null) {
            response = comissaoService.listarPorProfissionalEStatus(profissionalId, status, pageable);
        } else {
            response = comissaoService.listarPorProfissional(profissionalId, pageable);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}/resumo")
    @ProfissionalOrAdmin
    @Operation(summary = "Resumo por salao", description = "Retorna resumo de comissoes por profissional")
    public ResponseEntity<List<ComissaoResumoResponse>> resumoPorSalon(
            @PathVariable Long salonId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        List<ComissaoResumoResponse> response = comissaoService.resumoPorSalon(salonId, inicio, fim);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}/pendentes")
    @ProfissionalOrAdmin
    @Operation(summary = "Total pendente", description = "Retorna total de comissoes pendentes de um profissional")
    public ResponseEntity<BigDecimal> totalPendentes(@PathVariable Long profissionalId) {
        BigDecimal total = comissaoService.totalComissoesPendentes(profissionalId);
        return ResponseEntity.ok(total);
    }

    @PutMapping("/profissional/{profissionalId}/configurar")
    @ProfissionalOrAdmin
    @Operation(summary = "Configurar comissao", description = "Configura tipo e valor de comissao de um profissional")
    public ResponseEntity<Void> configurarComissao(
            @PathVariable Long profissionalId,
            @Valid @RequestBody ConfiguracaoComissaoRequest request) {
        comissaoService.configurarComissaoProfissional(profissionalId, request);
        return ResponseEntity.ok().build();
    }
}
