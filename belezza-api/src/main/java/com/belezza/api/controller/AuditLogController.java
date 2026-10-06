package com.belezza.api.controller;

import com.belezza.api.entity.AuditLog;
import com.belezza.api.repository.AuditLogRepository;
import com.belezza.api.security.TenantContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;

import static com.belezza.api.repository.AuditLogRepository.*;

/**
 * REST Controller for audit log management.
 * Provides endpoints to query and view audit logs — sempre só do salão do token: antes as
 * consultas não filtravam o salão e o admin de um salão via as ações de todos (BUG-006).
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Audit Logs", description = "Sistema de auditoria e logs de ações")
public class AuditLogController {

    private static final Sort MAIS_RECENTES = Sort.by(Sort.Direction.DESC, "criadoEm");

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    @Operation(summary = "Listar logs de auditoria", description = "Logs de auditoria do salão, mais recentes primeiro.")
    public ResponseEntity<Page<AuditLog>> listAuditLogs(@PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(buscar(null, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obter log de auditoria por ID", description = "Detalhes de um log de auditoria do salão.")
    @SuppressWarnings("null")
    public ResponseEntity<AuditLog> getAuditLog(@Parameter(description = "ID do log de auditoria") @PathVariable Long id) {
        Long salonId = salaoDoToken();
        return auditLogRepository.findById(id)
                .filter(a -> salonId.equals(a.getSalonId()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @Operation(summary = "Listar logs por entidade", description = "Logs de auditoria de uma entidade específica.")
    public ResponseEntity<Page<AuditLog>> listAuditLogsByEntity(
            @Parameter(description = "Tipo da entidade (ex: Agendamento, Usuario)") @PathVariable String entityType,
            @Parameter(description = "ID da entidade") @PathVariable Long entityId,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(buscar(Specification.where(entidade(entityType)).and(entidadeId(entityId)), pageable));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Listar logs por usuário", description = "Logs de auditoria de um usuário específico.")
    public ResponseEntity<Page<AuditLog>> listAuditLogsByUser(
            @Parameter(description = "ID do usuário") @PathVariable Long userId,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(buscar(usuario(userId), pageable));
    }

    @GetMapping("/action/{action}")
    @Operation(summary = "Listar logs por tipo de ação",
            description = "Logs de auditoria de um tipo de ação (CREATE, UPDATE, DELETE, etc).")
    public ResponseEntity<Page<AuditLog>> listAuditLogsByAction(
            @Parameter(description = "Tipo de ação (CREATE, UPDATE, DELETE, etc)") @PathVariable String action,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(buscar(acao(action), pageable));
    }

    @GetMapping("/date-range")
    @Operation(summary = "Listar logs por período", description = "Logs de auditoria dentro de um período.")
    public ResponseEntity<Page<AuditLog>> listAuditLogsByDateRange(
            @Parameter(description = "Data de início (formato: yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @Parameter(description = "Data de fim (formato: yyyy-MM-dd)")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(buscar(
                Specification.where(desde(dataInicio.atStartOfDay())).and(ate(dataFim.atTime(LocalTime.MAX))), pageable));
    }

    @GetMapping("/failed")
    @Operation(summary = "Listar operações falhadas", description = "Logs de auditoria de operações que falharam.")
    public ResponseEntity<Page<AuditLog>> listFailedAuditLogs(@PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(buscar(falhas(), pageable));
    }

    @GetMapping("/search")
    @Operation(summary = "Buscar logs com filtros", description = "Busca logs de auditoria com múltiplos filtros opcionais.")
    public ResponseEntity<Page<AuditLog>> searchAuditLogs(
            @Parameter(description = "ID do usuário") @RequestParam(required = false) Long usuarioId,
            @Parameter(description = "Tipo da entidade") @RequestParam(required = false) String entidade,
            @Parameter(description = "Tipo de ação") @RequestParam(required = false) String acao,
            @Parameter(description = "Data de início (formato: yyyy-MM-dd)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @Parameter(description = "Data de fim (formato: yyyy-MM-dd)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @Parameter(description = "Texto livre (usuário, entidade, detalhes)") @RequestParam(required = false) String termo,
            @PageableDefault(size = 50) Pageable pageable) {
        Specification<AuditLog> filtros = Specification.where(usuario(usuarioId))
                .and(entidade(entidade))
                .and(acao(acao))
                .and(desde(dataInicio != null ? dataInicio.atStartOfDay() : null))
                .and(ate(dataFim != null ? dataFim.atTime(LocalTime.MAX) : null))
                .and(texto(termo));
        return ResponseEntity.ok(buscar(filtros, pageable));
    }

    /** Consulta sempre restrita ao salão do token, mais recentes primeiro. */
    private Page<AuditLog> buscar(Specification<AuditLog> filtros, Pageable pageable) {
        Specification<AuditLog> spec = Specification.where(doSalao(salaoDoToken())).and(filtros);
        Pageable ordenado = pageable.getSort().isSorted() ? pageable
                : org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), MAIS_RECENTES);
        return auditLogRepository.findAll(spec, ordenado);
    }

    private static Long salaoDoToken() {
        Long salonId = TenantContext.getCurrentTenant();
        if (salonId == null) {
            throw new AccessDeniedException("Acesso negado: usuário sem estabelecimento vinculado");
        }
        return salonId;
    }
}
