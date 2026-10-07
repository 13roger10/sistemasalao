package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.support.TenantFixture;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-026: a configuração dos lembretes automáticos é gravada por salão (antes a rota dava 404).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Configuração dos lembretes do salão")
class LembretesSalonIT {

    private static final String ROTA = "/api/salon/reminders/settings";

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;

    @Test
    @DisplayName("Sem configuração vem tudo ligado; o que o admin salva fica gravado só no salão dele")
    void gravaPorSalao() throws Exception {
        Salon salaoA = fx.salao("Salao Lembretes A");
        Salon salaoB = fx.salao("Salao Lembretes B");
        String adminA = "Bearer " + fx.tokenAdmin(salaoA);

        mockMvc.perform(get(ROTA).header("Authorization", adminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.dayBefore").value(true))
                .andExpect(jsonPath("$.hoursBefore").value(true));

        mockMvc.perform(put(ROTA).header("Authorization", adminA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":true,\"dayBefore\":true,\"hoursBefore\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hoursBefore").value(false));

        mockMvc.perform(get(ROTA).header("Authorization", adminA))
                .andExpect(jsonPath("$.hoursBefore").value(false));

        mockMvc.perform(get(ROTA).header("Authorization", "Bearer " + fx.tokenAdmin(salaoB)))
                .andExpect(jsonPath("$.hoursBefore").value(true));
    }

    @Test
    @DisplayName("Só o admin mexe nos lembretes")
    void soAdmin() throws Exception {
        Salon salao = fx.salao("Salao Lembretes Equipe");
        String recepcionista = "Bearer " + fx.token(fx.usuario(Role.RECEPCIONISTA, salao), salao.getId());

        mockMvc.perform(get(ROTA).header("Authorization", recepcionista))
                .andExpect(status().isForbidden());
        mockMvc.perform(put(ROTA).header("Authorization", recepcionista)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false,\"dayBefore\":false,\"hoursBefore\":false}"))
                .andExpect(status().isForbidden());
    }
}
