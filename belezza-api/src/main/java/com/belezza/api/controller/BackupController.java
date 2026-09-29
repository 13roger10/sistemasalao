package com.belezza.api.controller;

import com.belezza.api.dto.backup.BackupInfo;
import com.belezza.api.dto.backup.BackupResponse;
import com.belezza.api.dto.backup.RestoreRequest;
import com.belezza.api.entity.Usuario;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.BackupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Backup do banco INTEIRO (todos os salões). Antes bastava o papel ADMIN — que é o dono de cada
 * salão —, então qualquer salão podia baixar a lista, apagar backups ou restaurar um backup antigo
 * por cima dos dados de todos. Agora só os operadores da plataforma listados em
 * {@code belezza.backup.operadores} (e-mails separados por vírgula) acessam; vazio = ninguém pela API.
 * O backup automático diário (BackupScheduler) não depende destas rotas.
 */
@RestController
@RequestMapping("/api/backup")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Backup", description = "Gerenciamento de backups do banco de dados (operadores da plataforma)")
public class BackupController {

    private final BackupService backupService;

    @Value("${belezza.backup.operadores:}")
    private String operadores;

    @ModelAttribute
    void exigirOperadorDaPlataforma(@AuthenticationPrincipal Usuario usuario) {
        Set<String> permitidos = Arrays.stream(operadores.split(","))
                .map(String::trim).map(String::toLowerCase).filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
        if (usuario == null || !permitidos.contains(usuario.getEmail().toLowerCase())) {
            log.warn("Acesso negado ao backup do banco: {}", usuario != null ? usuario.getEmail() : "anonimo");
            throw new AccessDeniedException("Acesso negado: backup do banco é restrito aos operadores da plataforma");
        }
    }

    @PostMapping
    @AdminOnly
    @Operation(summary = "Executar backup", description = "Executa um backup manual do banco de dados")
    public ResponseEntity<BackupResponse> executarBackup() {
        log.info("Requisicao de backup manual recebida");
        BackupResponse response = backupService.executarBackup();

        if (response.isSuccess()) {
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping
    @AdminOnly
    @Operation(summary = "Listar backups", description = "Lista todos os backups disponiveis")
    public ResponseEntity<List<BackupInfo>> listarBackups() {
        List<BackupInfo> backups = backupService.listarBackups();
        return ResponseEntity.ok(backups);
    }

    @GetMapping("/stats")
    @AdminOnly
    @Operation(summary = "Estatisticas de backup", description = "Retorna estatisticas do sistema de backup")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = backupService.getBackupStats();
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/restore")
    @AdminOnly
    @Operation(summary = "Restaurar backup", description = "Restaura o banco de dados a partir de um backup")
    public ResponseEntity<BackupResponse> restaurarBackup(@Valid @RequestBody RestoreRequest request) {
        log.warn("Requisicao de restauracao de backup recebida: {}", request.getFilename());
        BackupResponse response = backupService.restaurarBackup(request.getFilename());

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{filename}")
    @AdminOnly
    @Operation(summary = "Deletar backup", description = "Remove um arquivo de backup")
    public ResponseEntity<Map<String, Object>> deletarBackup(@PathVariable String filename) {
        log.info("Requisicao de delecao de backup: {}", filename);
        boolean deleted = backupService.deletarBackup(filename);

        if (deleted) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Backup deletado com sucesso",
                    "filename", filename
            ));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Erro ao deletar backup",
                    "filename", filename
            ));
        }
    }

    @PostMapping("/cleanup")
    @AdminOnly
    @Operation(summary = "Limpar backups antigos", description = "Remove backups que excedem o periodo de retencao")
    public ResponseEntity<Map<String, Object>> limparBackupsAntigos() {
        int deleted = backupService.limparBackupsAntigos();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Limpeza executada com sucesso",
                "deletedCount", deleted
        ));
    }
}
