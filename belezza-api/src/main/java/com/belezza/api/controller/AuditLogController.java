package com.belezza.api.controller;

import com.belezza.api.entity.AuditLog;
import com.belezza.api.repository.AuditLogRepository;
import com.belezza.api.security.annotation.Authenticated;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * REST Controller for audit log management.
 * Provides endpoints to query and view audit logs.
 * Admin-only access.
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Audit Logs", description = "Sistema de auditoria e logs de ações")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    /**
     * List all audit logs with pagination.
     * Admin only.
     */
    @GetMapping
    @Authenticated
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Listar logs de auditoria",
        description = "Retorna todos os logs de auditoria com paginação. " +
                     "Acesso restrito a administradores."
    )
    public ResponseEntity<Page<AuditLog>> listAuditLogs(
        @PageableDefault(size = 50, sort = "criadoEm") Pageable pageable
    ) {
        log.info("List all audit logs");
        Page<AuditLog> logs = auditLogRepository.findAllByOrderByCriadoEmDesc(pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * Get audit log by ID.
     * Admin only.
     */
    @GetMapping("/{id}")
    @Authenticated
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Obter log de auditoria por ID",
        description = "Retorna detalhes de um log de auditoria específico."
    )
    public ResponseEntity<AuditLog> getAuditLog(
        @Parameter(description = "ID do log de auditoria") @PathVariable Long id
    ) {
        log.info("Get audit log: {}", id);
        return auditLogRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * List audit logs for a specific entity.
     * Admin only.
     */
    @GetMapping("/entity/{entityType}/{entityId}")
    @Authenticated
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Listar logs por entidade",
        description = "Retorna todos os logs de auditoria para uma entidade específica."
    )
    public ResponseEntity<Page<AuditLog>> listAuditLogsByEntity(
        @Parameter(description = "Tipo da entidade (ex: Agendamento, Usuario)") @PathVariable String entityType,
        @Parameter(description = "ID da entidade") @PathVariable Long entityId,
        @PageableDefault(size = 50, sort = "criadoEm") Pageable pageable
    ) {
        log.info("List audit logs for entity: {} with ID: {}", entityType, entityId);
        Page<AuditLog> logs = auditLogRepository.findByEntidadeAndEntidadeId(entityType, entityId, pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * List audit logs by user.
     * Admin only.
     */
    @GetMapping("/user/{userId}")
    @Authenticated
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Listar logs por usuário",
        description = "Retorna todos os logs de auditoria de um usuário específico."
    )
    public ResponseEntity<Page<AuditLog>> listAuditLogsByUser(
        @Parameter(description = "ID do usuário") @PathVariable Long userId,
        @PageableDefault(size = 50, sort = "criadoEm") Pageable pageable
    ) {
        log.info("List audit logs for user: {}", userId);
        Page<AuditLog> logs = auditLogRepository.findByUsuarioId(userId, pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * List audit logs by action type.
     * Admin only.
     */
    @GetMapping("/action/{action}")
    @Authenticated
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Listar logs por tipo de ação",
        description = "Retorna todos os logs de auditoria de um tipo de ação específico (CREATE, UPDATE, DELETE, etc)."
    )
    public ResponseEntity<Page<AuditLog>> listAuditLogsByAction(
        @Parameter(description = "Tipo de ação (CREATE, UPDATE, DELETE, etc)") @PathVariable String action,
        @PageableDefault(size = 50, sort = "criadoEm") Pageable pageable
    ) {
        log.info("List audit logs for action: {}", action);
        Page<AuditLog> logs = auditLogRepository.findByAcao(action, pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * List audit logs within a date range.
     * Admin only.
     */
    @GetMapping("/date-range")
    @Authenticated
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Listar logs por período",
        description = "Retorna logs de auditoria dentro de um período específico."
    )
    public ResponseEntity<Page<AuditLog>> listAuditLogsByDateRange(
        @Parameter(description = "Data de início (formato: yyyy-MM-dd)")
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
        @Parameter(description = "Data de fim (formato: yyyy-MM-dd)")
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
        @PageableDefault(size = 50, sort = "criadoEm") Pageable pageable
    ) {
        log.info("List audit logs from {} to {}", dataInicio, dataFim);

        LocalDateTime inicio = dataInicio.atStartOfDay();
        LocalDateTime fim = dataFim.atTime(LocalTime.MAX);

        Page<AuditLog> logs = auditLogRepository.findByCriadoEmBetween(inicio, fim, pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * List failed operations (sucesso = false).
     * Admin only.
     */
    @GetMapping("/failed")
    @Authenticated
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Listar operações falhadas",
        description = "Retorna todos os logs de auditoria de operações que falharam."
    )
    public ResponseEntity<Page<AuditLog>> listFailedAuditLogs(
        @PageableDefault(size = 50, sort = "criadoEm") Pageable pageable
    ) {
        log.info("List failed audit logs");
        Page<AuditLog> logs = auditLogRepository.findBySucessoFalse(pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * Search audit logs with multiple filters.
     * Admin only.
     */
    @GetMapping("/search")
    @Authenticated
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Buscar logs com filtros",
        description = "Busca logs de auditoria com múltiplos filtros opcionais."
    )
    public ResponseEntity<Page<AuditLog>> searchAuditLogs(
        @Parameter(description = "ID do usuário") @RequestParam(required = false) Long usuarioId,
        @Parameter(description = "Tipo da entidade") @RequestParam(required = false) String entidade,
        @Parameter(description = "Tipo de ação") @RequestParam(required = false) String acao,
        @Parameter(description = "Data de início (formato: yyyy-MM-dd)")
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
        @Parameter(description = "Data de fim (formato: yyyy-MM-dd)")
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
        @PageableDefault(size = 50, sort = "criadoEm") Pageable pageable
    ) {
        log.info("Search audit logs with filters - user: {}, entity: {}, action: {}",
                usuarioId, entidade, acao);

        LocalDateTime inicio = dataInicio != null ? dataInicio.atStartOfDay() : null;
        LocalDateTime fim = dataFim != null ? dataFim.atTime(LocalTime.MAX) : null;

        Page<AuditLog> logs = auditLogRepository.searchWithFilters(
                usuarioId, entidade, acao, inicio, fim, pageable);

        return ResponseEntity.ok(logs);
    }
}
