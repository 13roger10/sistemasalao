package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.Salon;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.support.TenantFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-014 (auditoria): a página pública /book/{id} passa a usar a vitrine real do salão.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Vitrine pública do salão")
class PublicSalonIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;
    @Autowired private SalonRepository salonRepository;

    @Test
    @DisplayName("Sem login devolve os dados públicos do salão ativo e 404 para inativo ou inexistente")
    void vitrine() throws Exception {
        Salon salao = fx.salao("Salao Vitrine");
        mockMvc.perform(get("/api/public/salons/" + salao.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Salao Vitrine"))
                .andExpect(jsonPath("$.cnpj").doesNotExist())
                .andExpect(jsonPath("$.admin").doesNotExist());

        salao.setAtivo(false);
        salonRepository.saveAndFlush(salao);
        mockMvc.perform(get("/api/public/salons/" + salao.getId())).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/salons/999999")).andExpect(status().isNotFound());
    }
}
