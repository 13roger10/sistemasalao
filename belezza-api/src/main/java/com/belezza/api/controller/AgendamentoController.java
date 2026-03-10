package com.belezza.api.controller;

import com.belezza.api.dto.agendamento.AgendamentoRequest;
import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.agendamento.CancelamentoRequest;
import com.belezza.api.dto.agendamento.ReagendamentoRequest;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.AgendamentoService;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/agendamentos")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Agendamentos", description = "Gerenciamento de agendamentos")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;

    @PostMapping
    @Operation(summary = "Criar agendamento", description = "Cria um novo agendamento")
    public ResponseEntity<AgendamentoResponse> criar(
            @Valid @RequestBody AgendamentoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        AgendamentoResponse response = agendamentoService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar agendamento", description = "Busca um agendamento por ID")
    public ResponseEntity<AgendamentoResponse> buscarPorId(@PathVariable Long id) {
        AgendamentoResponse response = agendamentoService.buscarPorId(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar por salão", description = "Lista agendamentos de um salão com paginação")
    public ResponseEntity<Page<AgendamentoResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @PageableDefault(size = 20, sort = "dataHora") Pageable pageable) {
        Page<AgendamentoResponse> response = agendamentoService.listarPorSalon(salonId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/cliente/{clienteId}")
    @Operation(summary = "Listar por cliente", description = "Lista agendamentos de um cliente")
    public ResponseEntity<Page<AgendamentoResponse>> listarPorCliente(
            @PathVariable Long clienteId,
            @PageableDefault(size = 20, sort = "dataHora") Pageable pageable) {
        Page<AgendamentoResponse> response = agendamentoService.listarPorCliente(clienteId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar por profissional", description = "Lista agendamentos de um profissional")
    public ResponseEntity<Page<AgendamentoResponse>> listarPorProfissional(
            @PathVariable Long profissionalId,
            @PageableDefault(size = 20, sort = "dataHora") Pageable pageable) {
        Page<AgendamentoResponse> response = agendamentoService.listarPorProfissional(profissionalId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}/agenda-diaria")
    @ProfissionalOrAdmin
    @Operation(summary = "Agenda diária", description = "Lista agendamentos do dia de um profissional")
    public ResponseEntity<List<AgendamentoResponse>> agendaDiaria(
            @PathVariable Long profissionalId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime data) {
        List<AgendamentoResponse> response = agendamentoService.listarAgendaDiaria(profissionalId, data);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/confirmar")
    @ProfissionalOrAdmin
    @Operation(summary = "Confirmar agendamento", description = "Confirma um agendamento pendente")
    public ResponseEntity<AgendamentoResponse> confirmar(@PathVariable Long id) {
        AgendamentoResponse response = agendamentoService.confirmar(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/iniciar")
    @ProfissionalOrAdmin
    @Operation(summary = "Iniciar atendimento", description = "Marca agendamento como em andamento")
    public ResponseEntity<AgendamentoResponse> iniciar(@PathVariable Long id) {
        AgendamentoResponse response = agendamentoService.iniciar(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/concluir")
    @ProfissionalOrAdmin
    @Operation(summary = "Concluir atendimento", description = "Marca agendamento como concluído")
    public ResponseEntity<AgendamentoResponse> concluir(@PathVariable Long id) {
        AgendamentoResponse response = agendamentoService.concluir(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancelar")
    @Operation(summary = "Cancelar agendamento", description = "Cancela um agendamento com motivo")
    public ResponseEntity<AgendamentoResponse> cancelar(
            @PathVariable Long id,
            @Valid @RequestBody CancelamentoRequest request) {
        AgendamentoResponse response = agendamentoService.cancelar(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reagendar")
    @Operation(summary = "Reagendar", description = "Reagenda um agendamento para nova data/hora")
    public ResponseEntity<AgendamentoResponse> reagendar(
            @PathVariable Long id,
            @Valid @RequestBody ReagendamentoRequest request) {
        AgendamentoResponse response = agendamentoService.reagendar(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/no-show")
    @ProfissionalOrAdmin
    @Operation(summary = "Marcar no-show", description = "Marca cliente como não compareceu")
    public ResponseEntity<AgendamentoResponse> marcarNoShow(@PathVariable Long id) {
        AgendamentoResponse response = agendamentoService.marcarNoShow(id);
        return ResponseEntity.ok(response);
    }
}
