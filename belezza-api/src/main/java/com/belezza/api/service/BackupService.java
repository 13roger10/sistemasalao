package com.belezza.api.service;

import com.belezza.api.dto.backup.BackupInfo;
import com.belezza.api.dto.backup.BackupResponse;
import com.belezza.api.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;

@Service
@Slf4j
public class BackupService {

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${spring.datasource.username}")
    private String dbUsername;

    @Value("${spring.datasource.password}")
    private String dbPassword;

    @Value("${belezza.backup.directory:./backups}")
    private String backupDirectory;

    @Value("${belezza.backup.retention-days:30}")
    private int retentionDays;

    @Value("${belezza.backup.compress:true}")
    private boolean compressBackups;

    @Value("${belezza.backup.pg-dump-path:pg_dump}")
    private String pgDumpPath;

    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    @PostConstruct
    public void init() {
        try {
            Path backupPath = Paths.get(backupDirectory);
            if (!Files.exists(backupPath)) {
                Files.createDirectories(backupPath);
                log.info("Diretorio de backup criado: {}", backupPath.toAbsolutePath());
            }
        } catch (IOException e) {
            log.error("Erro ao criar diretorio de backup: {}", e.getMessage());
        }
    }

    /**
     * Execute a full database backup.
     */
    public BackupResponse executarBackup() {
        log.info("Iniciando backup do banco de dados...");
        long startTime = System.currentTimeMillis();

        try {
            // Parse database connection info
            DatabaseInfo dbInfo = parseDatabaseUrl(dbUrl);

            // Generate backup filename
            String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMAT);
            String baseFilename = String.format("belezza_backup_%s.sql", timestamp);
            String filename = compressBackups ? baseFilename + ".gz" : baseFilename;
            Path backupPath = Paths.get(backupDirectory, filename);

            // Build pg_dump command
            List<String> command = buildPgDumpCommand(dbInfo, backupPath.toString());

            // Execute pg_dump
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.environment().put("PGPASSWORD", dbPassword);
            pb.redirectErrorStream(true);

            Process process = pb.start();

            // Capture output for logging
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean completed = process.waitFor(30, TimeUnit.MINUTES);
            int exitCode = process.exitValue();

            if (!completed || exitCode != 0) {
                log.error("Erro no pg_dump. Exit code: {}. Output: {}", exitCode, output);
                throw new BusinessException("Falha ao executar backup: " + output);
            }

            // Compress if needed and pg_dump didn't compress
            if (compressBackups && !filename.endsWith(".gz")) {
                compressFile(backupPath);
                filename = filename + ".gz";
                backupPath = Paths.get(backupDirectory, filename);
            }

            // Get file info
            File backupFile = backupPath.toFile();
            long sizeBytes = backupFile.length();
            long durationMs = System.currentTimeMillis() - startTime;

            log.info("Backup concluido com sucesso: {} ({}) em {}ms",
                    filename, BackupInfo.formatSize(sizeBytes), durationMs);

            // Cleanup old backups
            limparBackupsAntigos();

            return BackupResponse.builder()
                    .success(true)
                    .message("Backup realizado com sucesso")
                    .filename(filename)
                    .filepath(backupPath.toAbsolutePath().toString())
                    .sizeBytes(sizeBytes)
                    .sizeFormatted(BackupInfo.formatSize(sizeBytes))
                    .createdAt(LocalDateTime.now())
                    .durationMs(durationMs)
                    .build();

        } catch (Exception e) {
            log.error("Erro ao executar backup: {}", e.getMessage(), e);
            long durationMs = System.currentTimeMillis() - startTime;
            return BackupResponse.builder()
                    .success(false)
                    .message("Erro ao executar backup: " + e.getMessage())
                    .durationMs(durationMs)
                    .build();
        }
    }

    /**
     * Restore database from a backup file.
     */
    public BackupResponse restaurarBackup(String filename) {
        log.info("Iniciando restauracao do backup: {}", filename);
        long startTime = System.currentTimeMillis();

        try {
            Path backupPath = Paths.get(backupDirectory, filename);

            if (!Files.exists(backupPath)) {
                throw new BusinessException("Arquivo de backup nao encontrado: " + filename);
            }

            // Parse database connection info
            DatabaseInfo dbInfo = parseDatabaseUrl(dbUrl);

            // Decompress if needed
            Path sqlFile = backupPath;
            boolean needsCleanup = false;
            if (filename.endsWith(".gz")) {
                sqlFile = decompressFile(backupPath);
                needsCleanup = true;
            }

            // Build psql command for restore
            List<String> command = buildPsqlCommand(dbInfo, sqlFile.toString());

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.environment().put("PGPASSWORD", dbPassword);
            pb.redirectErrorStream(true);

            Process process = pb.start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean completed = process.waitFor(60, TimeUnit.MINUTES);
            int exitCode = process.exitValue();

            // Cleanup temp decompressed file
            if (needsCleanup) {
                Files.deleteIfExists(sqlFile);
            }

            if (!completed || exitCode != 0) {
                log.error("Erro na restauracao. Exit code: {}. Output: {}", exitCode, output);
                throw new BusinessException("Falha ao restaurar backup: " + output);
            }

            long durationMs = System.currentTimeMillis() - startTime;
            log.info("Restauracao concluida com sucesso em {}ms", durationMs);

            return BackupResponse.builder()
                    .success(true)
                    .message("Restauracao realizada com sucesso")
                    .filename(filename)
                    .durationMs(durationMs)
                    .build();

        } catch (Exception e) {
            log.error("Erro ao restaurar backup: {}", e.getMessage(), e);
            long durationMs = System.currentTimeMillis() - startTime;
            return BackupResponse.builder()
                    .success(false)
                    .message("Erro ao restaurar backup: " + e.getMessage())
                    .durationMs(durationMs)
                    .build();
        }
    }

    /**
     * List all available backups.
     */
    public List<BackupInfo> listarBackups() {
        try {
            Path backupPath = Paths.get(backupDirectory);

            if (!Files.exists(backupPath)) {
                return Collections.emptyList();
            }

            return Files.list(backupPath)
                    .filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().startsWith("belezza_backup_"))
                    .map(this::createBackupInfo)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(BackupInfo::getCreatedAt).reversed())
                    .collect(Collectors.toList());

        } catch (IOException e) {
            log.error("Erro ao listar backups: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Delete a backup file.
     */
    public boolean deletarBackup(String filename) {
        try {
            Path backupPath = Paths.get(backupDirectory, filename);

            if (!Files.exists(backupPath)) {
                throw new BusinessException("Arquivo de backup nao encontrado: " + filename);
            }

            Files.delete(backupPath);
            log.info("Backup deletado: {}", filename);
            return true;

        } catch (IOException e) {
            log.error("Erro ao deletar backup {}: {}", filename, e.getMessage());
            return false;
        }
    }

    /**
     * Cleanup old backups based on retention policy.
     */
    public int limparBackupsAntigos() {
        log.info("Limpando backups com mais de {} dias...", retentionDays);
        int deleted = 0;

        try {
            Path backupPath = Paths.get(backupDirectory);
            LocalDateTime cutoffDate = LocalDateTime.now().minus(retentionDays, ChronoUnit.DAYS);

            List<Path> oldBackups = Files.list(backupPath)
                    .filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().startsWith("belezza_backup_"))
                    .filter(p -> {
                        BackupInfo info = createBackupInfo(p);
                        return info != null && info.getCreatedAt().isBefore(cutoffDate);
                    })
                    .collect(Collectors.toList());

            for (Path file : oldBackups) {
                Files.delete(file);
                deleted++;
                log.info("Backup antigo removido: {}", file.getFileName());
            }

            if (deleted > 0) {
                log.info("{} backups antigos removidos", deleted);
            }

        } catch (IOException e) {
            log.error("Erro ao limpar backups antigos: {}", e.getMessage());
        }

        return deleted;
    }

    /**
     * Get backup directory info.
     */
    public Map<String, Object> getBackupStats() {
        Map<String, Object> stats = new HashMap<>();
        List<BackupInfo> backups = listarBackups();

        stats.put("totalBackups", backups.size());
        stats.put("backupDirectory", Paths.get(backupDirectory).toAbsolutePath().toString());
        stats.put("retentionDays", retentionDays);
        stats.put("compressionEnabled", compressBackups);

        long totalSize = backups.stream().mapToLong(BackupInfo::getSizeBytes).sum();
        stats.put("totalSizeBytes", totalSize);
        stats.put("totalSizeFormatted", BackupInfo.formatSize(totalSize));

        if (!backups.isEmpty()) {
            stats.put("latestBackup", backups.get(0).getFilename());
            stats.put("latestBackupDate", backups.get(0).getCreatedAt());
            stats.put("oldestBackup", backups.get(backups.size() - 1).getFilename());
        }

        return stats;
    }

    // --- Private Helper Methods ---

    private List<String> buildPgDumpCommand(DatabaseInfo dbInfo, String outputPath) {
        List<String> command = new ArrayList<>();
        command.add(pgDumpPath);
        command.add("-h");
        command.add(dbInfo.host);
        command.add("-p");
        command.add(String.valueOf(dbInfo.port));
        command.add("-U");
        command.add(dbUsername);
        command.add("-d");
        command.add(dbInfo.database);
        command.add("-F");
        command.add("p"); // plain text format
        command.add("--no-owner");
        command.add("--no-acl");
        command.add("-f");
        command.add(outputPath.replace(".gz", "")); // pg_dump doesn't compress directly
        return command;
    }

    private List<String> buildPsqlCommand(DatabaseInfo dbInfo, String inputPath) {
        List<String> command = new ArrayList<>();
        command.add("psql");
        command.add("-h");
        command.add(dbInfo.host);
        command.add("-p");
        command.add(String.valueOf(dbInfo.port));
        command.add("-U");
        command.add(dbUsername);
        command.add("-d");
        command.add(dbInfo.database);
        command.add("-f");
        command.add(inputPath);
        return command;
    }

    private DatabaseInfo parseDatabaseUrl(String url) {
        // Format: jdbc:postgresql://host:port/database
        String cleanUrl = url.replace("jdbc:postgresql://", "");
        String[] parts = cleanUrl.split("/");
        String[] hostPort = parts[0].split(":");

        DatabaseInfo info = new DatabaseInfo();
        info.host = hostPort[0];
        info.port = hostPort.length > 1 ? Integer.parseInt(hostPort[1]) : 5432;
        info.database = parts.length > 1 ? parts[1].split("\\?")[0] : "belezza";

        return info;
    }

    private void compressFile(Path source) throws IOException {
        Path target = Paths.get(source.toString() + ".gz");

        try (InputStream fis = Files.newInputStream(source);
             OutputStream fos = Files.newOutputStream(target);
             GZIPOutputStream gzos = new GZIPOutputStream(fos)) {

            byte[] buffer = new byte[8192];
            int len;
            while ((len = fis.read(buffer)) > 0) {
                gzos.write(buffer, 0, len);
            }
        }

        // Delete original uncompressed file
        Files.delete(source);
    }

    private Path decompressFile(Path source) throws IOException {
        String targetName = source.getFileName().toString().replace(".gz", "");
        Path target = source.resolveSibling(targetName + ".tmp");

        try (InputStream fis = Files.newInputStream(source);
             java.util.zip.GZIPInputStream gzis = new java.util.zip.GZIPInputStream(fis);
             OutputStream fos = Files.newOutputStream(target)) {

            byte[] buffer = new byte[8192];
            int len;
            while ((len = gzis.read(buffer)) > 0) {
                fos.write(buffer, 0, len);
            }
        }

        return target;
    }

    private BackupInfo createBackupInfo(Path path) {
        try {
            String filename = path.getFileName().toString();
            File file = path.toFile();

            // Parse timestamp from filename: belezza_backup_20240123_143052.sql.gz
            String timestampPart = filename
                    .replace("belezza_backup_", "")
                    .replace(".sql.gz", "")
                    .replace(".sql", "");

            LocalDateTime createdAt;
            try {
                createdAt = LocalDateTime.parse(timestampPart, TIMESTAMP_FORMAT);
            } catch (Exception e) {
                createdAt = LocalDateTime.ofInstant(
                        java.time.Instant.ofEpochMilli(file.lastModified()),
                        java.time.ZoneId.systemDefault());
            }

            return BackupInfo.builder()
                    .filename(filename)
                    .filepath(path.toAbsolutePath().toString())
                    .sizeBytes(file.length())
                    .sizeFormatted(BackupInfo.formatSize(file.length()))
                    .createdAt(createdAt)
                    .compressed(filename.endsWith(".gz"))
                    .type(filename.endsWith(".gz") ? "SQL (Comprimido)" : "SQL")
                    .build();

        } catch (Exception e) {
            log.warn("Erro ao processar arquivo de backup {}: {}", path, e.getMessage());
            return null;
        }
    }

    private static class DatabaseInfo {
        String host;
        int port;
        String database;
    }
}
