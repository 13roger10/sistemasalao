package com.belezza.api.controller;

import com.belezza.api.dto.comissao.ConfirmarPagamentoRequest;
import com.belezza.api.dto.comissao.GerarPagamentoRequest;
import com.belezza.api.dto.comissao.PagamentoProfissionalResponse;
import com.belezza.api.entity.StatusPagamentoProfissional;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.PagamentoProfissionalService;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/pagamentos-profissional")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Pagamentos Profissional", description = "Gerenciamento de pagamentos de comissoes aos profissionais")
public class PagamentoProfissionalController {

    private final PagamentoProfissionalService pagamentoProfissionalService;

    @PostMapping("/salon/{salonId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Gerar pagamento", description = "Gera um pagamento consolidando comissoes de um profissional")
    public ResponseEntity<PagamentoProfissionalResponse> gerarPagamento(
            @PathVariable Long salonId,
            @Valid @RequestBody GerarPagamentoRequest request) {
        PagamentoProfissionalResponse response = pagamentoProfissionalService.gerarPagamento(salonId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @ProfissionalOrAdmin
    @Operation(summary = "Buscar pagamento", description = "Busca um pagamento pelo ID")
    public ResponseEntity<PagamentoProfissionalResponse> buscarPorId(@PathVariable Long id) {
        PagamentoProfissionalResponse response = pagamentoProfissionalService.buscarPorId(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar por salao", description = "Lista pagamentos de um salao")
    public ResponseEntity<Page<PagamentoProfissionalResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @RequestParam(required = false) StatusPagamentoProfissional status,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        Page<PagamentoProfissionalResponse> response;
        if (status != null) {
            response = pagamentoProfissionalService.listarPorSalonEStatus(salonId, status, pageable);
        } else {
            response = pagamentoProfissionalService.listarPorSalon(salonId, pageable);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar por profissional", description = "Lista pagamentos de um profissional")
    public ResponseEntity<Page<PagamentoProfissionalResponse>> listarPorProfissional(
            @PathVariable Long profissionalId,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        Page<PagamentoProfissionalResponse> response = pagamentoProfissionalService.listarPorProfissional(
                profissionalId, pageable);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/processar")
    @ProfissionalOrAdmin
    @Operation(summary = "Iniciar processamento", description = "Marca pagamento como em processamento")
    public ResponseEntity<PagamentoProfissionalResponse> iniciarProcessamento(@PathVariable Long id) {
        PagamentoProfissionalResponse response = pagamentoProfissionalService.iniciarProcessamento(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/confirmar")
    @ProfissionalOrAdmin
    @Operation(summary = "Confirmar pagamento", description = "Confirma que o pagamento foi realizado")
    public ResponseEntity<PagamentoProfissionalResponse> confirmarPagamento(
            @PathVariable Long id,
            @Valid @RequestBody ConfirmarPagamentoRequest request) {
        PagamentoProfissionalResponse response = pagamentoProfissionalService.confirmarPagamento(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancelar")
    @ProfissionalOrAdmin
    @Operation(summary = "Cancelar pagamento", description = "Cancela um pagamento pendente")
    public ResponseEntity<PagamentoProfissionalResponse> cancelarPagamento(@PathVariable Long id) {
        PagamentoProfissionalResponse response = pagamentoProfissionalService.cancelarPagamento(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}/total-pago")
    @ProfissionalOrAdmin
    @Operation(summary = "Total pago", description = "Retorna total pago em comissoes em um periodo")
    public ResponseEntity<BigDecimal> totalPago(
            @PathVariable Long salonId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        BigDecimal total = pagamentoProfissionalService.totalPagoPorSalon(salonId, inicio, fim);
        return ResponseEntity.ok(total);
    }
}
