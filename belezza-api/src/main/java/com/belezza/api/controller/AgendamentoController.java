package com.belezza.api.controller;

import com.belezza.api.dto.agendamento.AgendamentoRequest;
import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.agendamento.CancelamentoRequest;
import com.belezza.api.dto.agendamento.ReagendamentoRequest;
import com.belezza.api.dto.disponibilidade.DisponibilidadeRequest;
import com.belezza.api.dto.disponibilidade.DisponibilidadeResponse;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.AgendamentoService;
import org.springframework.security.access.prepost.PreAuthorize;
import com.belezza.api.service.DisponibilidadeService;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/agendamentos")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Agendamentos", description = "Gerenciamento de agendamentos")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;
    private final DisponibilidadeService disponibilidadeService;
    private final UsuarioRepository usuarioRepository;
    private final ProfissionalRepository profissionalRepository;

    private boolean shouldRestrictSensitiveData(UserDetails userDetails) {
        if (userDetails == null) return true;
        // ADMIN and RECEPCIONISTA can see client phone and appointment notes
        return userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .noneMatch(auth -> auth.equals("ROLE_ADMIN") || auth.equals("ROLE_RECEPCIONISTA"));
    }

    private boolean isProfissional(UserDetails userDetails) {
        if (userDetails == null) return false;
        return userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(auth -> auth.equals("ROLE_PROFISSIONAL"));
    }

    /**
     * Internal notes (notasInternas) must be visible to staff (ADMIN, PROFISSIONAL, RECEPCIONISTA)
     * and NEVER to a CLIENTE or an unauthenticated caller. This is intentionally independent from
     * shouldRestrictSensitiveData, which also governs clienteTelefone/observacoes and hides those
     * from PROFISSIONAL — internal notes must stay visible to PROFISSIONAL regardless.
     */
    private boolean shouldHideInternalNotes(UserDetails userDetails) {
        if (userDetails == null) return true;
        return userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .noneMatch(auth -> auth.equals("ROLE_ADMIN") || auth.equals("ROLE_PROFISSIONAL") || auth.equals("ROLE_RECEPCIONISTA"));
    }

    /**
     * Enforces that a PROFISSIONAL can only access their own data.
     * Throws AuthorizationException if the authenticated user is a PROFISSIONAL
     * trying to access a different professional's resource.
     */
    private void enforceOwnership(Long profissionalId, UserDetails userDetails) {
        if (!isProfissional(userDetails)) return; // ADMIN can access any
        usuarioRepository.findByEmailAndAtivoTrue(userDetails.getUsername()).ifPresent(usuario -> {
            profissionalRepository.findByUsuarioId(usuario.getId()).ifPresent(profissional -> {
                if (!profissional.getId().equals(profissionalId)) {
                    throw new AccessDeniedException("Acesso negado: profissional não pode visualizar agenda de outro profissional");
                }
            });
        });
    }

    @PostMapping
    @Operation(summary = "Criar agendamento", description = "Cria um novo agendamento")
    public ResponseEntity<AgendamentoResponse> criar(
            @Valid @RequestBody AgendamentoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Debug logging
        log.info("=== POST /api/agendamentos - Request received ===");
        log.info("Request body: profissionalId={}, servicoId={}, servicoIds={}, dataHora={}, clienteId={}",
            request.getProfissionalId(), request.getServicoId(), request.getServicoIds(),
            request.getDataHora(), request.getClienteId());
        log.info("Request valid: {}, validation error: {}", request.isValid(), request.getValidationError());
        log.info("Authenticated user: {}", userDetails != null ? userDetails.getUsername() : "ANONYMOUS");

        if (userDetails != null) {
            log.info("User authorities: {}", userDetails.getAuthorities());
        }

        // Se não há usuário autenticado, usar null (clienteId deve estar no request)
        String emailUsuario = userDetails != null ? userDetails.getUsername() : null;

        try {
            AgendamentoResponse response = agendamentoService.criar(request, emailUsuario);
            log.info("=== Agendamento created successfully: id={} ===", response.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("=== Error creating agendamento: {} ===", e.getMessage(), e);
            throw e; // Re-throw to be handled by GlobalExceptionHandler
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar agendamento", description = "Busca um agendamento por ID")
    public ResponseEntity<AgendamentoResponse> buscarPorId(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        boolean hideInternalNotes = shouldHideInternalNotes(userDetails);
        AgendamentoResponse response = agendamentoService.buscarPorId(id, restrictData, hideInternalNotes);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA')")
    @Operation(summary = "Listar por salão", description = "Lista agendamentos de um salão com paginação. Restrito à equipe do salão.")
    public ResponseEntity<Page<AgendamentoResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @PageableDefault(size = 100, sort = "dataHora") Pageable pageable,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        Page<AgendamentoResponse> response = agendamentoService.listarPorSalon(salonId, pageable, restrictData);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/cliente/{clienteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA')")
    @Operation(summary = "Listar por cliente", description = "Lista agendamentos de um cliente. Restrito à equipe do salão — o próprio cliente usa /api/salon/appointments/my.")
    public ResponseEntity<Page<AgendamentoResponse>> listarPorCliente(
            @PathVariable Long clienteId,
            @PageableDefault(size = 20, sort = "dataHora") Pageable pageable,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        Page<AgendamentoResponse> response = agendamentoService.listarPorCliente(clienteId, pageable, restrictData);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar por profissional", description = "Lista agendamentos de um profissional")
    public ResponseEntity<Page<AgendamentoResponse>> listarPorProfissional(
            @PathVariable Long profissionalId,
            @PageableDefault(size = 20, sort = "dataHora") Pageable pageable,
            @AuthenticationPrincipal UserDetails userDetails) {
        enforceOwnership(profissionalId, userDetails);
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        Page<AgendamentoResponse> response = agendamentoService.listarPorProfissional(profissionalId, pageable, restrictData);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}/agenda-diaria")
    @ProfissionalOrAdmin
    @Operation(summary = "Agenda diária", description = "Lista agendamentos do dia de um profissional")
    public ResponseEntity<List<AgendamentoResponse>> agendaDiaria(
            @PathVariable Long profissionalId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime data,
            @AuthenticationPrincipal UserDetails userDetails) {
        enforceOwnership(profissionalId, userDetails);
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        List<AgendamentoResponse> response = agendamentoService.listarAgendaDiaria(profissionalId, data, restrictData);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/confirmar")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA')")
    @Operation(summary = "Confirmar agendamento", description = "Confirma um agendamento pendente")
    public ResponseEntity<AgendamentoResponse> confirmar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        AgendamentoResponse response = agendamentoService.confirmar(id, restrictData);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/iniciar")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA')")
    @Operation(summary = "Iniciar atendimento", description = "Marca agendamento como em andamento")
    public ResponseEntity<AgendamentoResponse> iniciar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        AgendamentoResponse response = agendamentoService.iniciar(id, restrictData);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/concluir")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA')")
    @Operation(summary = "Concluir atendimento", description = "Marca agendamento como concluído")
    public ResponseEntity<AgendamentoResponse> concluir(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        AgendamentoResponse response = agendamentoService.concluir(id, restrictData);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancelar")
    @Operation(summary = "Cancelar agendamento", description = "Cancela um agendamento com motivo")
    public ResponseEntity<AgendamentoResponse> cancelar(
            @PathVariable Long id,
            @Valid @RequestBody CancelamentoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        boolean hideInternalNotes = shouldHideInternalNotes(userDetails);
        AgendamentoResponse response = agendamentoService.cancelar(id, request, restrictData, hideInternalNotes);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reagendar")
    @Operation(summary = "Reagendar", description = "Reagenda um agendamento para nova data/hora")
    public ResponseEntity<AgendamentoResponse> reagendar(
            @PathVariable Long id,
            @Valid @RequestBody ReagendamentoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        boolean hideInternalNotes = shouldHideInternalNotes(userDetails);
        AgendamentoResponse response = agendamentoService.reagendar(id, request, restrictData, hideInternalNotes);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/no-show")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA')")
    @Operation(summary = "Marcar no-show", description = "Marca cliente como não compareceu")
    public ResponseEntity<AgendamentoResponse> marcarNoShow(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        AgendamentoResponse response = agendamentoService.marcarNoShow(id, restrictData);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/disponibilidade")
    @Operation(summary = "Consultar disponibilidade",
               description = "Consulta horários disponíveis para agendamento considerando horário de trabalho, bloqueios e agendamentos existentes")
    public ResponseEntity<DisponibilidadeResponse> consultarDisponibilidade(
            @RequestParam Long salonId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
            @RequestParam List<Long> servicoIds,
            @RequestParam(required = false) Long profissionalId,
            @RequestParam(required = false) Integer intervaloMinutos) {

        DisponibilidadeRequest request = DisponibilidadeRequest.builder()
                .salonId(salonId)
                .data(data)
                .servicoIds(servicoIds)
                .profissionalId(profissionalId)
                .intervaloMinutos(intervaloMinutos)
                .build();

        DisponibilidadeResponse response = disponibilidadeService.consultarDisponibilidade(request);
        return ResponseEntity.ok(response);
    }
}
