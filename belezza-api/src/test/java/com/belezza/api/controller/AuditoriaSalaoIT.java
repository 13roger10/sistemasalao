package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.AuditLog;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.repository.AuditLogRepository;
import com.belezza.api.support.TenantFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-006 (auditoria) e BUG-020: auditoria do salão real, só do próprio salão e só para o ADMIN;
 * backup por salão responde 501 em vez de fingir; a busca de logs não dá mais 500.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Auditoria do salão — dados reais, papel e salão")
class AuditoriaSalaoIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;
    @Autowired private AuditLogRepository auditLogRepository;

    private Salon salaoA;
    private Salon salaoB;

    @BeforeEach
    void setUp() {
        salaoA = fx.salao("Salao A");
        salaoB = fx.salao("Salao B");
        log(salaoA, "CREATE", "Agendamento", "acao-do-salao-a");
        log(salaoA, "CANCEL", "Agendamento", "cancelamento-do-salao-a");
        log(salaoB, "CREATE", "Agendamento", "acao-do-salao-b");
    }

    private void log(Salon salon, String acao, String entidade, String detalhes) {
        auditLogRepository.save(AuditLog.builder()
                .acao(acao)
                .entidade(entidade)
                .entidadeId(1L)
                .usuarioId(salon.getAdmin().getId())
                .usuarioNome(salon.getAdmin().getEmail())
                .salonId(salon.getId())
                .detalhes(detalhes)
                .sucesso(true)
                .criadoEm(LocalDateTime.now())
                .build());
    }

    @Test
    @DisplayName("Admin vê só os logs reais do próprio salão")
    void adminVeSoOsLogsDoProprioSalao() throws Exception {
        String adminA = fx.tokenAdmin(salaoA);

        mockMvc.perform(get("/api/salon/audit/logs").header("Authorization", "Bearer " + adminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(content().string(containsString("acao-do-salao-a")))
                .andExpect(content().string(not(containsString("acao-do-salao-b"))));

        mockMvc.perform(get("/api/salon/audit/logs").param("action", "cancel")
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(jsonPath("$.total").value(1));

        mockMvc.perform(get("/api/salon/audit/logs/stats").header("Authorization", "Bearer " + adminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLogs").value(2))
                .andExpect(jsonPath("$.byAction.create").value(1));
    }

    @Test
    @DisplayName("/api/audit-logs (lista e busca) só mostra o próprio salão e a busca não dá 500")
    void auditLogsGlobaisFiltramOSalao() throws Exception {
        String adminA = fx.tokenAdmin(salaoA);

        mockMvc.perform(get("/api/audit-logs").header("Authorization", "Bearer " + adminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/audit-logs/search").header("Authorization", "Bearer " + adminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
        mockMvc.perform(get("/api/audit-logs/search").param("acao", "CREATE").param("dataInicio", "2020-01-01")
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        Long idDoB = auditLogRepository.findAll().stream()
                .filter(a -> salaoB.getId().equals(a.getSalonId())).findFirst().orElseThrow().getId();
        mockMvc.perform(get("/api/audit-logs/" + idDoB).header("Authorization", "Bearer " + adminA))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/salon/audit/logs/" + idDoB).header("Authorization", "Bearer " + adminA))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Cliente, recepcionista e profissional não acessam a auditoria")
    void naoAdminNaoAcessa() throws Exception {
        String cliente = fx.token(fx.cliente(salaoA).getUsuario(), null);
        String recep = fx.token(fx.usuario(Role.RECEPCIONISTA, salaoA), salaoA.getId());
        String prof = fx.token(fx.usuario(Role.PROFISSIONAL, null), salaoA.getId());

        for (String token : new String[]{cliente, recep, prof}) {
            mockMvc.perform(get("/api/salon/audit/logs").header("Authorization", "Bearer " + token))
                    .andExpect(status().isForbidden());
            mockMvc.perform(post("/api/salon/audit/logs/purge").header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isForbidden());
            mockMvc.perform(post("/api/salon/audit/backups/run-now").header("Authorization", "Bearer " + token))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    @DisplayName("Admin não apaga os logs (purge recusado) e os logs continuam lá")
    void purgeRecusado() throws Exception {
        mockMvc.perform(post("/api/salon/audit/logs/purge").header("Authorization", "Bearer " + fx.tokenAdmin(salaoA))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"olderThan\":\"2999-01-01\"}"))
                .andExpect(status().isForbidden());

        assertThat(auditLogRepository.findAll().stream().filter(a -> salaoA.getId().equals(a.getSalonId()))).hasSize(2);
    }

    @Test
    @DisplayName("Backup por salão responde 501 com mensagem clara (não finge backup)")
    void backupIndisponivel() throws Exception {
        String adminA = fx.tokenAdmin(salaoA);

        mockMvc.perform(get("/api/salon/audit/backups").header("Authorization", "Bearer " + adminA))
                .andExpect(status().isNotImplemented())
                .andExpect(jsonPath("$.errorCode").value("BACKUP_SALAO_INDISPONIVEL"));
        mockMvc.perform(post("/api/salon/audit/backups/run-now").header("Authorization", "Bearer " + adminA))
                .andExpect(status().isNotImplemented());
        mockMvc.perform(post("/api/salon/audit/backups/1/restore").header("Authorization", "Bearer " + adminA)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotImplemented());
    }
}
