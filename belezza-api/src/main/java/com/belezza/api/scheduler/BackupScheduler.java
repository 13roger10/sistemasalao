package com.belezza.api.scheduler;

import com.belezza.api.dto.backup.BackupResponse;
import com.belezza.api.service.BackupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "belezza.backup.enabled", havingValue = "true", matchIfMissing = false)
public class BackupScheduler {

    private final BackupService backupService;

    @Value("${belezza.backup.schedule:0 0 3 * * ?}")
    private String cronSchedule;

    @PostConstruct
    public void init() {
        log.info("BackupScheduler inicializado. Cron: {}", cronSchedule);
    }

    /**
     * Execute automatic backup based on cron schedule.
     * Default: every day at 3:00 AM
     */
    @Scheduled(cron = "${belezza.backup.schedule:0 0 3 * * ?}")
    public void executarBackupAgendado() {
        log.info("=== Iniciando backup automatico agendado ===");

        try {
            BackupResponse response = backupService.executarBackup();

            if (response.isSuccess()) {
                log.info("Backup automatico concluido com sucesso: {} ({}) em {}ms",
                        response.getFilename(),
                        response.getSizeFormatted(),
                        response.getDurationMs());
            } else {
                log.error("Backup automatico falhou: {}", response.getMessage());
            }

        } catch (Exception e) {
            log.error("Erro inesperado no backup automatico: {}", e.getMessage(), e);
        }

        log.info("=== Fim do backup automatico agendado ===");
    }

    /**
     * Execute weekly cleanup of old backups.
     * Runs every Sunday at 4:00 AM
     */
    @Scheduled(cron = "${belezza.backup.cleanup-schedule:0 0 4 ? * SUN}")
    public void executarLimpezaAgendada() {
        log.info("=== Iniciando limpeza de backups antigos ===");

        try {
            int deleted = backupService.limparBackupsAntigos();
            log.info("Limpeza concluida. {} backups removidos.", deleted);

        } catch (Exception e) {
            log.error("Erro na limpeza de backups: {}", e.getMessage(), e);
        }

        log.info("=== Fim da limpeza de backups ===");
    }
}
