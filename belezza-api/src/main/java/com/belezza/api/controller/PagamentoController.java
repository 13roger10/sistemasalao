package com.belezza.api.controller;

import com.belezza.api.dto.pagamento.PagamentoRequest;
import com.belezza.api.dto.pagamento.PagamentoResponse;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.PagamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pagamentos")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Pagamentos", description = "Gerenciamento de pagamentos")
public class PagamentoController {

    private final PagamentoService pagamentoService;

    @PostMapping
    @ProfissionalOrAdmin
    @Operation(summary = "Registrar pagamento", description = "Registra pagamento de um agendamento")
    public ResponseEntity<PagamentoResponse> registrar(@Valid @RequestBody PagamentoRequest request) {
        PagamentoResponse response = pagamentoService.registrar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/agendamento/{agendamentoId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Buscar por agendamento", description = "Busca pagamento de um agendamento")
    public ResponseEntity<PagamentoResponse> buscarPorAgendamento(@PathVariable Long agendamentoId) {
        PagamentoResponse response = pagamentoService.buscarPorAgendamento(agendamentoId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar por salão", description = "Lista pagamentos de um salão")
    public ResponseEntity<Page<PagamentoResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        Page<PagamentoResponse> response = pagamentoService.listarPorSalon(salonId, pageable);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/estornar")
    @ProfissionalOrAdmin
    @Operation(summary = "Estornar pagamento", description = "Estorna um pagamento aprovado")
    public ResponseEntity<PagamentoResponse> estornar(@PathVariable Long id) {
        PagamentoResponse response = pagamentoService.estornar(id);
        return ResponseEntity.ok(response);
    }
}
