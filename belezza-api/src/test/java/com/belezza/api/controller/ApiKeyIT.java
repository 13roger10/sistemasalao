package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.Salon;
import com.belezza.api.support.TenantFixture;
import com.jayway.jsonpath.JsonPath;
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

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-011 (auditoria): criar API key dava 500 sempre (prefixo de 16 caracteres numa coluna de 10).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("API keys — criação e uso")
class ApiKeyIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;

    private Salon salao;
    private String admin;

    @BeforeEach
    void setUp() {
        salao = fx.salao("Salao API");
        admin = fx.tokenAdmin(salao);
    }

    private String url() {
        return "/api/salons/" + salao.getId() + "/api-keys";
    }

    @Test
    @DisplayName("Admin cria a chave (201), ela aparece na lista e autentica a API pública")
    void criaListaEUsa() throws Exception {
        String body = mockMvc.perform(post(url()).header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Site\",\"escopos\":[\"read\"]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.keyPrefix").value(startsWith("bz_live_")))
                .andReturn().getResponse().getContentAsString();
        String chave = JsonPath.read(body, "$.rawKey");

        mockMvc.perform(get(url()).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Site"));

        mockMvc.perform(get("/api/v1/salons/" + salao.getId() + "/info").header("X-API-Key", chave))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Salao API"));
        mockMvc.perform(get("/api/v1/salons/" + salao.getId() + "/info").header("X-API-Key", chave + "x"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Escopo desconhecido ou validade no passado dão 400")
    void validacao() throws Exception {
        mockMvc.perform(post(url()).header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"X\",\"escopos\":[\"admin\"]}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post(url()).header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"X\",\"expiraEm\":\"2020-01-01T00:00:00\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Admin de outro salão não cria chave aqui")
    void outroSalao() throws Exception {
        mockMvc.perform(post(url()).header("Authorization", "Bearer " + fx.tokenAdmin(fx.salao("Outro")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Invasor\"}"))
                .andExpect(status().isForbidden());
    }
}
