package com.belezza.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * REST Controller for salon audit management.
 * Provides endpoints for audit logs and statistics.
 */
@RestController
@RequestMapping("/api/salon/audit")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Auditoria do Salão", description = "Gerenciamento de logs de auditoria")
public class SalonAuditController {

    // ===== AUDIT LOGS =====

    @GetMapping("/logs")
    @Operation(summary = "Listar logs de auditoria", description = "Retorna logs de auditoria com filtros")
    public ResponseEntity<AuditLogListResponse> listLogs(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entity,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        log.debug("Listing audit logs - action: {}, entity: {}, search: {}", action, entity, search);

        List<AuditLogResponse> logs = generateMockLogs(limit != null ? limit : 50, action, entity, search);

        AuditLogListResponse response = new AuditLogListResponse(
            logs,
            logs.size(),
            1,
            limit != null ? limit : 50,
            1
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/logs/{id}")
    @Operation(summary = "Obter log por ID", description = "Retorna um log de auditoria específico")
    public ResponseEntity<AuditLogResponse> getLogById(@PathVariable String id) {
        log.debug("Getting audit log by id: {}", id);

        AuditLogResponse log = new AuditLogResponse(
            id,
            "1",
            "Admin",
            "ADMIN",
            "update",
            "client",
            "123",
            "Maria Silva",
            null,
            null,
            "192.168.1.100",
            "Mozilla/5.0",
            Map.of("telefone", "11999998888"),
            Map.of("telefone", "11999997777"),
            List.of("telefone"),
            null,
            "Alteração de dados do cliente",
            LocalDateTime.now().minusHours(2),
            LocalDateTime.now().minusHours(2)
        );

        return ResponseEntity.ok(log);
    }

    @GetMapping("/logs/entity/{entity}/{entityId}")
    @Operation(summary = "Logs por entidade", description = "Retorna logs de uma entidade específica")
    public ResponseEntity<List<AuditLogResponse>> getLogsByEntity(
            @PathVariable String entity,
            @PathVariable String entityId) {
        log.debug("Getting logs for entity: {} with id: {}", entity, entityId);

        List<AuditLogResponse> logs = List.of(
            createMockLog("1", "create", entity, entityId, "Criação", LocalDateTime.now().minusDays(30)),
            createMockLog("2", "update", entity, entityId, "Atualização de dados", LocalDateTime.now().minusDays(15)),
            createMockLog("3", "update", entity, entityId, "Alteração de telefone", LocalDateTime.now().minusDays(5))
        );

        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/user/{userId}")
    @Operation(summary = "Logs por usuário", description = "Retorna logs de um usuário específico")
    public ResponseEntity<AuditLogListResponse> getLogsByUser(
            @PathVariable String userId,
            @RequestParam(required = false) Integer limit) {
        log.debug("Getting logs for user: {}", userId);

        List<AuditLogResponse> logs = generateMockLogs(limit != null ? limit : 50, null, null, null);

        AuditLogListResponse response = new AuditLogListResponse(
            logs,
            logs.size(),
            1,
            limit != null ? limit : 50,
            1
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/logs/recent")
    @Operation(summary = "Logs recentes", description = "Retorna os logs mais recentes")
    public ResponseEntity<List<AuditLogResponse>> getRecentLogs(
            @RequestParam(required = false) Integer limit) {
        log.debug("Getting recent logs, limit: {}", limit);

        List<AuditLogResponse> logs = generateMockLogs(limit != null ? limit : 10, null, null, null);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/stats")
    @Operation(summary = "Estatísticas de logs", description = "Retorna estatísticas dos logs de auditoria")
    public ResponseEntity<AuditStatsResponse> getStats(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String unitId) {
        log.debug("Getting audit stats");

        Map<String, Integer> byAction = new HashMap<>();
        byAction.put("create", 45);
        byAction.put("update", 128);
        byAction.put("delete", 12);
        byAction.put("login", 89);
        byAction.put("logout", 87);
        byAction.put("view", 234);
        byAction.put("export", 15);

        Map<String, Integer> byEntity = new HashMap<>();
        byEntity.put("appointment", 156);
        byEntity.put("client", 89);
        byEntity.put("professional", 23);
        byEntity.put("service", 45);
        byEntity.put("finance", 67);
        byEntity.put("user", 180);
        byEntity.put("settings", 34);

        List<UserActivityStat> byUser = List.of(
            new UserActivityStat("1", "Admin", 245),
            new UserActivityStat("2", "Carlos Silva", 189),
            new UserActivityStat("3", "Ana Santos", 134)
        );

        List<AuditLogResponse> recentActivity = generateMockLogs(5, null, null, null);

        AuditStatsResponse stats = new AuditStatsResponse(
            610,
            byAction,
            byEntity,
            byUser,
            recentActivity
        );

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/logs/export")
    @Operation(summary = "Exportar logs", description = "Exporta logs em formato CSV, XLSX ou JSON")
    public ResponseEntity<byte[]> exportLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entity,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "xlsx") String format) {
        log.debug("Exporting logs in format: {}", format);

        // Mock export - returns empty file
        String content = "ID,Usuário,Ação,Entidade,Data\n1,Admin,create,client,2024-01-15";

        return ResponseEntity.ok()
            .header("Content-Type", "application/octet-stream")
            .header("Content-Disposition", "attachment; filename=logs." + format)
            .body(content.getBytes());
    }

    @PostMapping("/logs/purge")
    @Operation(summary = "Limpar logs antigos", description = "Remove logs anteriores a uma data")
    public ResponseEntity<PurgeResponse> purgeLogs(@RequestBody PurgeRequest request) {
        log.debug("Purging logs older than: {}", request.olderThan());

        // Mock response
        return ResponseEntity.ok(new PurgeResponse(150));
    }

    // ===== Helper Methods =====

    private List<AuditLogResponse> generateMockLogs(int limit, String actionFilter, String entityFilter, String search) {
        List<AuditLogResponse> logs = new ArrayList<>();

        String[] actions = {"create", "update", "delete", "login", "logout", "view"};
        String[] entities = {"appointment", "client", "professional", "service", "finance", "user"};
        String[] users = {"Admin", "Carlos Silva", "Ana Santos", "Pedro Lima"};
        String[] descriptions = {
            "Criação de novo agendamento",
            "Atualização de dados do cliente",
            "Exclusão de serviço",
            "Login no sistema",
            "Logout do sistema",
            "Visualização de relatório financeiro",
            "Alteração de horário de funcionamento",
            "Cadastro de novo profissional",
            "Atualização de preços",
            "Exportação de dados"
        };

        Random random = new Random();
        for (int i = 0; i < limit; i++) {
            String action = actionFilter != null ? actionFilter : actions[random.nextInt(actions.length)];
            String entity = entityFilter != null ? entityFilter : entities[random.nextInt(entities.length)];
            String user = users[random.nextInt(users.length)];
            String description = descriptions[random.nextInt(descriptions.length)];

            if (search != null && !search.isEmpty()) {
                if (!description.toLowerCase().contains(search.toLowerCase()) &&
                    !user.toLowerCase().contains(search.toLowerCase())) {
                    continue;
                }
            }

            logs.add(createMockLog(
                String.valueOf(i + 1),
                action,
                entity,
                String.valueOf(100 + i),
                description,
                LocalDateTime.now().minusHours(random.nextInt(168))
            ));
        }

        return logs;
    }

    private AuditLogResponse createMockLog(String id, String action, String entity, String entityId,
                                           String description, LocalDateTime createdAt) {
        return new AuditLogResponse(
            id,
            "1",
            "Admin",
            "ADMIN",
            action,
            entity,
            entityId,
            null,
            null,
            null,
            "192.168.1.100",
            "Mozilla/5.0",
            null,
            null,
            null,
            null,
            description,
            createdAt,
            createdAt
        );
    }

    // ===== BACKUPS =====

    @GetMapping("/backups")
    @Operation(summary = "Listar backups", description = "Retorna lista de backups com paginação")
    public ResponseEntity<BackupListResponse> listBackups(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer page) {
        log.debug("Listing backups - limit: {}, page: {}", limit, page);

        List<BackupResponse> backups = generateMockBackups(limit != null ? limit : 10);

        BackupListResponse response = new BackupListResponse(
            backups,
            backups.size(),
            page != null ? page : 1,
            limit != null ? limit : 10,
            1
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/backups/{id}")
    @Operation(summary = "Obter backup por ID", description = "Retorna um backup específico")
    public ResponseEntity<BackupResponse> getBackupById(@PathVariable String id) {
        log.debug("Getting backup by id: {}", id);

        BackupResponse backup = createMockBackup(id, "completed", LocalDateTime.now().minusDays(1));
        return ResponseEntity.ok(backup);
    }

    @PostMapping("/backups")
    @Operation(summary = "Criar backup", description = "Cria um novo backup")
    public ResponseEntity<BackupResponse> createBackup(@RequestBody(required = false) BackupCreateRequest request) {
        log.debug("Creating backup");

        BackupResponse backup = new BackupResponse(
            UUID.randomUUID().toString(),
            request != null && request.name() != null ? request.name() : "Backup " + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")),
            request != null && request.type() != null ? request.type() : "full",
            "in_progress",
            null,
            null,
            request != null && request.entities() != null ? request.entities() : List.of("appointment", "client", "professional", "service", "finance", "user", "settings"),
            null,
            "1",
            "Admin",
            null,
            null,
            null,
            null,
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        return ResponseEntity.ok(backup);
    }

    @DeleteMapping("/backups/{id}")
    @Operation(summary = "Excluir backup", description = "Remove um backup")
    public ResponseEntity<Void> deleteBackup(@PathVariable String id) {
        log.debug("Deleting backup: {}", id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/backups/{id}/download")
    @Operation(summary = "Download backup", description = "Baixa o arquivo de backup")
    public ResponseEntity<byte[]> downloadBackup(@PathVariable String id) {
        log.debug("Downloading backup: {}", id);

        String content = "BACKUP_FILE_CONTENT_" + id;

        return ResponseEntity.ok()
            .header("Content-Type", "application/zip")
            .header("Content-Disposition", "attachment; filename=backup-" + id + ".zip")
            .body(content.getBytes());
    }

    @PostMapping("/backups/{id}/restore")
    @Operation(summary = "Restaurar backup", description = "Restaura o sistema a partir de um backup")
    public ResponseEntity<RestoreResponse> restoreBackup(
            @PathVariable String id,
            @RequestBody(required = false) RestoreRequest request) {
        log.debug("Restoring from backup: {}", id);

        return ResponseEntity.ok(new RestoreResponse(true, "Backup restaurado com sucesso"));
    }

    @GetMapping("/backups/stats")
    @Operation(summary = "Estatísticas de backup", description = "Retorna estatísticas dos backups")
    public ResponseEntity<BackupStatsResponse> getBackupStats() {
        log.debug("Getting backup stats");

        BackupResponse lastBackup = createMockBackup("last", "completed", LocalDateTime.now().minusHours(6));

        Map<String, Integer> byStatus = new HashMap<>();
        byStatus.put("completed", 12);
        byStatus.put("failed", 1);
        byStatus.put("pending", 0);
        byStatus.put("in_progress", 0);

        BackupStatsResponse stats = new BackupStatsResponse(
            13,
            lastBackup,
            LocalDateTime.now().plusDays(1).withHour(3).withMinute(0),
            256 * 1024 * 1024L, // 256 MB
            LocalDateTime.now().minusDays(30),
            byStatus
        );

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/backups/settings")
    @Operation(summary = "Configurações de backup", description = "Retorna configurações de backup automático")
    public ResponseEntity<BackupSettingsResponse> getBackupSettings() {
        log.debug("Getting backup settings");

        BackupSettingsResponse settings = new BackupSettingsResponse(
            true,
            "daily",
            "03:00",
            null,
            null,
            30,
            List.of("appointment", "client", "professional", "service", "finance", "user", "settings"),
            true,
            true,
            List.of("admin@salao.com")
        );

        return ResponseEntity.ok(settings);
    }

    @PatchMapping("/backups/settings")
    @Operation(summary = "Atualizar configurações", description = "Atualiza configurações de backup automático")
    public ResponseEntity<BackupSettingsResponse> updateBackupSettings(@RequestBody BackupSettingsRequest request) {
        log.debug("Updating backup settings");

        BackupSettingsResponse settings = new BackupSettingsResponse(
            request.autoBackupEnabled() != null ? request.autoBackupEnabled() : true,
            request.frequency() != null ? request.frequency() : "daily",
            request.time() != null ? request.time() : "03:00",
            request.dayOfWeek(),
            request.dayOfMonth(),
            request.retentionDays() != null ? request.retentionDays() : 30,
            request.entities() != null ? request.entities() : List.of("appointment", "client", "professional", "service", "finance", "user", "settings"),
            request.notifyOnComplete() != null ? request.notifyOnComplete() : true,
            request.notifyOnFailure() != null ? request.notifyOnFailure() : true,
            request.notifyEmails() != null ? request.notifyEmails() : List.of("admin@salao.com")
        );

        return ResponseEntity.ok(settings);
    }

    @PostMapping("/backups/run-now")
    @Operation(summary = "Executar backup agora", description = "Inicia um backup manual imediatamente")
    public ResponseEntity<BackupResponse> runBackupNow(@RequestBody(required = false) BackupCreateRequest request) {
        log.debug("Running backup now");

        BackupResponse backup = new BackupResponse(
            UUID.randomUUID().toString(),
            "Backup Manual " + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")),
            request != null && request.type() != null ? request.type() : "full",
            "completed",
            45 * 1024 * 1024L, // 45 MB
            "/backups/" + UUID.randomUUID() + ".zip",
            request != null && request.entities() != null ? request.entities() : List.of("appointment", "client", "professional", "service", "finance", "user", "settings"),
            null,
            "1",
            "Admin",
            LocalDateTime.now(),
            null,
            null,
            Map.of(
                "recordCount", Map.of(
                    "appointment", 156,
                    "client", 89,
                    "professional", 12,
                    "service", 45,
                    "finance", 234,
                    "user", 8,
                    "settings", 1
                ),
                "version", "1.0.0"
            ),
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        return ResponseEntity.ok(backup);
    }

    @GetMapping("/backups/latest")
    @Operation(summary = "Último backup", description = "Retorna o backup mais recente")
    public ResponseEntity<BackupResponse> getLatestBackup() {
        log.debug("Getting latest backup");

        BackupResponse backup = createMockBackup("latest", "completed", LocalDateTime.now().minusHours(6));
        return ResponseEntity.ok(backup);
    }

    // ===== Backup Helper Methods =====

    private List<BackupResponse> generateMockBackups(int limit) {
        List<BackupResponse> backups = new ArrayList<>();
        String[] statuses = {"completed", "completed", "completed", "completed", "failed"};

        for (int i = 0; i < limit; i++) {
            String status = statuses[i % statuses.length];
            LocalDateTime createdAt = LocalDateTime.now().minusDays(i).minusHours(i * 2);
            backups.add(createMockBackup(String.valueOf(i + 1), status, createdAt));
        }

        return backups;
    }

    private BackupResponse createMockBackup(String id, String status, LocalDateTime createdAt) {
        Random random = new Random(id.hashCode());
        long size = status.equals("completed") ? (20 + random.nextInt(50)) * 1024 * 1024L : null;

        return new BackupResponse(
            id,
            "Backup " + createdAt.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
            random.nextBoolean() ? "full" : "incremental",
            status,
            size,
            status.equals("completed") ? "/backups/" + id + ".zip" : null,
            List.of("appointment", "client", "professional", "service", "finance", "user", "settings"),
            null,
            "1",
            "Admin",
            status.equals("completed") ? createdAt.plusMinutes(5) : null,
            null,
            status.equals("failed") ? "Erro de conexão com o banco de dados" : null,
            status.equals("completed") ? Map.of(
                "recordCount", Map.of(
                    "appointment", 156,
                    "client", 89,
                    "professional", 12,
                    "service", 45
                ),
                "version", "1.0.0"
            ) : null,
            createdAt,
            createdAt
        );
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

    // ===== Backup Records =====

    public record BackupListResponse(
        List<BackupResponse> data,
        int total,
        int page,
        int limit,
        int totalPages
    ) {}

    public record BackupResponse(
        String id,
        String name,
        String type,
        String status,
        Long size,
        String fileUrl,
        List<String> entities,
        List<String> includedUnits,
        String createdBy,
        String createdByName,
        LocalDateTime completedAt,
        LocalDateTime expiresAt,
        String error,
        Map<String, Object> metadata,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}

    public record BackupCreateRequest(
        String name,
        String type,
        List<String> entities,
        List<String> includedUnits
    ) {}

    public record BackupStatsResponse(
        int totalBackups,
        BackupResponse lastBackup,
        LocalDateTime nextScheduledBackup,
        long totalSize,
        LocalDateTime oldestBackup,
        Map<String, Integer> backupsByStatus
    ) {}

    public record BackupSettingsResponse(
        boolean autoBackupEnabled,
        String frequency,
        String time,
        Integer dayOfWeek,
        Integer dayOfMonth,
        int retentionDays,
        List<String> entities,
        boolean notifyOnComplete,
        boolean notifyOnFailure,
        List<String> notifyEmails
    ) {}

    public record BackupSettingsRequest(
        Boolean autoBackupEnabled,
        String frequency,
        String time,
        Integer dayOfWeek,
        Integer dayOfMonth,
        Integer retentionDays,
        List<String> entities,
        Boolean notifyOnComplete,
        Boolean notifyOnFailure,
        List<String> notifyEmails
    ) {}

    public record RestoreRequest(
        String backupId,
        List<String> entities,
        Boolean overwrite
    ) {}

    public record RestoreResponse(
        boolean restored,
        String message
    ) {}
}
