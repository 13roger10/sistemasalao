package com.belezza.api.controller;

import com.belezza.api.entity.AuditLog;
import com.belezza.api.repository.AuditLogRepository;
import com.belezza.api.security.TenantContext;
import com.belezza.api.security.annotation.AdminOnly;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

import static com.belezza.api.repository.AuditLogRepository.*;

/**
 * Auditoria do salão (telas Configurações → Logs de alteração e Backup).
 *
 * <p>BUG-006 (auditoria): este controller devolvia dados inventados (logs aleatórios, backups
 * "concluídos" que não existiam) e não tinha restrição de papel — cliente executava purge,
 * restore e run-now. Agora:
 * <ul>
 *   <li>só o ADMIN, e só o salão do próprio token;</li>
 *   <li>os logs vêm da tabela audit_logs, filtrados pelo salão;</li>
 *   <li>os logs não podem ser apagados pelo salão (purge recusado);</li>
 *   <li>backup por salão ainda não existe: os endpoints respondem 501 com mensagem clara, em vez
 *       de fingir que o backup foi feito. O backup do banco inteiro é da plataforma
 *       ({@code /api/backup}, restrito aos operadores).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/salon/audit")
@RequiredArgsConstructor
@Slf4j
@AdminOnly
@Tag(name = "Auditoria do Salão", description = "Logs de auditoria do salão")
public class SalonAuditController {

    static final String BACKUP_INDISPONIVEL =
            "O backup por salão ainda não está disponível. O banco de dados é copiado diariamente pela plataforma; "
                    + "para recuperar dados, fale com o suporte.";

    private static final Sort MAIS_RECENTES = Sort.by(Sort.Direction.DESC, "criadoEm");
    private static final int LIMITE_ESTATISTICA = 5000;

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    // ===== AUDIT LOGS =====

    @GetMapping("/logs")
    @Operation(summary = "Listar logs de auditoria", description = "Logs de auditoria do salão com filtros")
    public ResponseEntity<AuditLogListResponse> listLogs(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entity,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        int tamanho = limite(limit, 50);
        int pagina = page != null && page > 0 ? page : 1;
        Page<AuditLog> logs = auditLogRepository.findAll(
                filtros(action, entity, search, dateFrom, dateTo),
                PageRequest.of(pagina - 1, tamanho, MAIS_RECENTES));
        return ResponseEntity.ok(new AuditLogListResponse(
                logs.map(this::toResponse).getContent(),
                (int) logs.getTotalElements(), pagina, tamanho, logs.getTotalPages()));
    }

    @GetMapping("/logs/{id}")
    @Operation(summary = "Obter log por ID")
    @SuppressWarnings("null")
    public ResponseEntity<AuditLogResponse> getLogById(@PathVariable Long id) {
        Long salonId = salaoDoToken();
        return auditLogRepository.findById(id)
                .filter(a -> salonId.equals(a.getSalonId()))
                .map(a -> ResponseEntity.ok(toResponse(a)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/logs/entity/{entity}/{entityId}")
    @Operation(summary = "Histórico de uma entidade")
    public ResponseEntity<List<AuditLogResponse>> getLogsByEntity(
            @PathVariable String entity, @PathVariable Long entityId) {
        return ResponseEntity.ok(listar(Specification.where(entidade(entity)).and(entidadeId(entityId)), 100));
    }

    @GetMapping("/logs/user/{userId}")
    @Operation(summary = "Logs de um usuário")
    public ResponseEntity<AuditLogListResponse> getLogsByUser(
            @PathVariable Long userId,
            @RequestParam(required = false) Integer limit) {
        int tamanho = limite(limit, 50);
        List<AuditLogResponse> logs = listar(usuario(userId), tamanho);
        return ResponseEntity.ok(new AuditLogListResponse(logs, logs.size(), 1, tamanho, 1));
    }

    @GetMapping("/logs/recent")
    @Operation(summary = "Logs recentes")
    public ResponseEntity<List<AuditLogResponse>> getRecentLogs(@RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(listar(null, limite(limit, 10)));
    }

    @GetMapping("/logs/stats")
    @Operation(summary = "Estatísticas de auditoria", description = "Totais por ação, entidade e usuário no período")
    public ResponseEntity<AuditStatsResponse> getStats(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String unitId) {
        Specification<AuditLog> spec = Specification.where(doSalao(salaoDoToken()))
                .and(desde(inicioDoDia(dateFrom)))
                .and(ate(fimDoDia(dateTo)));
        Page<AuditLog> pagina = auditLogRepository.findAll(spec, PageRequest.of(0, LIMITE_ESTATISTICA, MAIS_RECENTES));
        List<AuditLog> logs = pagina.getContent();

        Map<String, Integer> porAcao = contar(logs, a -> minusculo(a.getAcao()));
        Map<String, Integer> porEntidade = contar(logs, a -> minusculo(a.getEntidade()));
        List<UserActivityStat> porUsuario = logs.stream()
                .filter(a -> a.getUsuarioId() != null)
                .collect(Collectors.groupingBy(AuditLog::getUsuarioId, LinkedHashMap::new, Collectors.toList()))
                .entrySet().stream()
                .map(e -> new UserActivityStat(String.valueOf(e.getKey()), e.getValue().get(0).getUsuarioNome(), e.getValue().size()))
                .sorted(Comparator.comparingInt(UserActivityStat::count).reversed())
                .limit(10)
                .toList();
        List<AuditLogResponse> recentes = logs.stream().limit(5).map(this::toResponse).toList();

        return ResponseEntity.ok(new AuditStatsResponse((int) pagina.getTotalElements(), porAcao, porEntidade, porUsuario, recentes));
    }

    @GetMapping("/logs/export")
    @Operation(summary = "Exportar logs (CSV)")
    public ResponseEntity<byte[]> exportLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entity,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "csv") String format) {
        Page<AuditLog> logs = auditLogRepository.findAll(
                filtros(action, entity, search, dateFrom, dateTo), PageRequest.of(0, LIMITE_ESTATISTICA, MAIS_RECENTES));

        StringBuilder csv = new StringBuilder("ID;Data;Usuário;Ação;Entidade;ID da entidade;Sucesso;Detalhes\n");
        for (AuditLog a : logs) {
            csv.append(a.getId()).append(';')
                    .append(a.getCriadoEm()).append(';')
                    .append(celula(a.getUsuarioNome())).append(';')
                    .append(celula(a.getAcao())).append(';')
                    .append(celula(a.getEntidade())).append(';')
                    .append(a.getEntidadeId()).append(';')
                    .append(a.isSucesso() ? "sim" : "não").append(';')
                    .append(celula(a.getDetalhes())).append('\n');
        }
        // BOM para o Excel abrir os acentos corretamente
        byte[] corpo = ("﻿" + csv).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"auditoria.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(corpo);
    }

    @PostMapping("/logs/purge")
    @Operation(summary = "Apagar logs (não permitido)", description = "Os logs de auditoria não podem ser apagados pelo salão")
    public ResponseEntity<PurgeResponse> purgeLogs(@RequestBody(required = false) PurgeRequest request) {
        // Quem é auditado não pode apagar a própria trilha de auditoria
        throw new AccessDeniedException("Os logs de auditoria não podem ser apagados pelo salão");
    }

    // ===== BACKUPS (não disponíveis por salão) =====

    @GetMapping({"/backups", "/backups/stats", "/backups/settings", "/backups/latest", "/backups/{id}", "/backups/{id}/download"})
    @Operation(summary = "Backup por salão (indisponível)", description = "Responde 501: o backup por salão ainda não existe")
    public ResponseEntity<Map<String, Object>> backupsLeitura() {
        return backupIndisponivel();
    }

    @RequestMapping(value = {"/backups", "/backups/run-now", "/backups/{id}/restore", "/backups/settings", "/backups/{id}"},
            method = {RequestMethod.POST, RequestMethod.PATCH, RequestMethod.DELETE})
    @Operation(summary = "Backup por salão (indisponível)", description = "Responde 501: o backup por salão ainda não existe")
    public ResponseEntity<Map<String, Object>> backupsEscrita() {
        return backupIndisponivel();
    }

    private ResponseEntity<Map<String, Object>> backupIndisponivel() {
        salaoDoToken();
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("timestamp", LocalDateTime.now());
        corpo.put("status", HttpStatus.NOT_IMPLEMENTED.value());
        corpo.put("error", "Not Implemented");
        corpo.put("errorCode", "BACKUP_SALAO_INDISPONIVEL");
        corpo.put("message", BACKUP_INDISPONIVEL);
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(corpo);
    }

    // ===== Helpers =====

    private Specification<AuditLog> filtros(String action, String entity, String search, String dateFrom, String dateTo) {
        return Specification.where(doSalao(salaoDoToken()))
                .and(acao(action))
                .and(entidade(entity))
                .and(texto(search))
                .and(desde(inicioDoDia(dateFrom)))
                .and(ate(fimDoDia(dateTo)));
    }

    private List<AuditLogResponse> listar(Specification<AuditLog> filtros, int limite) {
        return auditLogRepository.findAll(Specification.where(doSalao(salaoDoToken())).and(filtros),
                        PageRequest.of(0, limite, MAIS_RECENTES))
                .map(this::toResponse).getContent();
    }

    private AuditLogResponse toResponse(AuditLog a) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("sucesso", a.isSucesso());
        if (a.getMensagemErro() != null) {
            metadata.put("erro", a.getMensagemErro());
        }
        return new AuditLogResponse(
                String.valueOf(a.getId()),
                a.getUsuarioId() != null ? String.valueOf(a.getUsuarioId()) : null,
                a.getUsuarioNome(),
                null,
                minusculo(a.getAcao()),
                a.getEntidade(),
                String.valueOf(a.getEntidadeId()),
                null,
                a.getSalonId() != null ? String.valueOf(a.getSalonId()) : null,
                null,
                a.getIpAddress(),
                a.getUserAgent(),
                json(a.getDadosAntigos()),
                json(a.getDadosNovos()),
                null,
                metadata,
                a.getDetalhes(),
                a.getCriadoEm(),
                a.getCriadoEm());
    }

    /** Dados antigos/novos gravados como JSON; outro formato (lista, texto) vai como "valor". */
    private Map<String, Object> json(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(texto, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of("valor", texto);
        }
    }

    private static Long salaoDoToken() {
        Long salonId = TenantContext.getCurrentTenant();
        if (salonId == null) {
            throw new AccessDeniedException("Acesso negado: usuário sem estabelecimento vinculado");
        }
        return salonId;
    }

    private static int limite(Integer pedido, int padrao) {
        return pedido == null || pedido < 1 ? padrao : Math.min(pedido, 500);
    }

    private static LocalDateTime inicioDoDia(String data) {
        LocalDate d = data(data);
        return d != null ? d.atStartOfDay() : null;
    }

    private static LocalDateTime fimDoDia(String data) {
        LocalDate d = data(data);
        return d != null ? d.atTime(LocalTime.MAX) : null;
    }

    /** Aceita "2026-10-06" ou "2026-10-06T10:00:00" (o front manda ISO completo). */
    private static LocalDate data(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(texto.length() > 10 ? texto.substring(0, 10) : texto);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static Map<String, Integer> contar(List<AuditLog> logs, java.util.function.Function<AuditLog, String> chave) {
        Map<String, Integer> mapa = new LinkedHashMap<>();
        for (AuditLog a : logs) {
            mapa.merge(chave.apply(a), 1, Integer::sum);
        }
        return mapa;
    }

    private static String minusculo(String s) {
        return s == null ? null : s.toLowerCase(Locale.ROOT);
    }

    private static String celula(String s) {
        return s == null ? "" : s.replace(';', ',').replace('\n', ' ');
    }

    // ===== Records =====

    public record AuditLogListResponse(
        List<AuditLogResponse> data,
        int total,
        int page,
        int limit,
        int totalPages
    ) {}

    public record AuditLogResponse(
        String id,
        String userId,
        String userName,
        String userRole,
        String action,
        String entity,
        String entityId,
        String entityName,
        String unitId,
        String unitName,
        String ipAddress,
        String userAgent,
        Map<String, Object> oldValues,
        Map<String, Object> newValues,
        List<String> changedFields,
        Map<String, Object> metadata,
        String description,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}

    public record AuditStatsResponse(
        int totalLogs,
        Map<String, Integer> byAction,
        Map<String, Integer> byEntity,
        List<UserActivityStat> byUser,
        List<AuditLogResponse> recentActivity
    ) {}

    public record UserActivityStat(
        String userId,
        String userName,
        int count
    ) {}

    public record PurgeRequest(String olderThan) {}

    public record PurgeResponse(int deleted) {}
}
