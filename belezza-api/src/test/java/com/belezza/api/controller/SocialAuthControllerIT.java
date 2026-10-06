package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.ContaSocial;
import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.repository.ContaSocialRepository;
import com.belezza.api.support.TenantFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-002 (auditoria): contas de Instagram/Facebook só para o ADMIN do próprio salão.
 * Antes, um cliente do Salão A listava e desconectava o Instagram do Salão B.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("SocialAuthController — papel e salão")
class SocialAuthControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;
    @Autowired private ContaSocialRepository contaSocialRepository;

    private Salon salaoA;
    private Salon salaoB;
    private ContaSocial contaB;

    @BeforeEach
    void setUp() {
        salaoA = fx.salao("Salao A");
        salaoB = fx.salao("Salao B");
        contaB = contaSocialRepository.save(ContaSocial.builder()
                .salon(salaoB)
                .plataforma(PlataformaSocial.INSTAGRAM)
                .accountId("ig-b")
                .accountName("salao_b_oficial")
                .accessToken("token-cifrado")
                .ativa(true)
                .build());
    }

    @Test
    @DisplayName("Cliente do Salão A não lista nem desconecta a conta do Salão B")
    void clienteNaoMexeEmContaDeOutroSalao() throws Exception {
        String cliente = fx.token(fx.cliente(salaoA).getUsuario(), null);

        mockMvc.perform(get("/api/social/accounts").param("salonId", salaoB.getId().toString())
                        .header("Authorization", "Bearer " + cliente))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/social/accounts/" + contaB.getId()).param("salonId", salaoB.getId().toString())
                        .header("Authorization", "Bearer " + cliente))
                .andExpect(status().isForbidden());

        assertThat(contaSocialRepository.findById(contaB.getId()).orElseThrow().isAtiva()).isTrue();
    }

    @Test
    @DisplayName("Admin do Salão A não lê, desconecta nem renova a conta do Salão B")
    void adminNaoMexeEmContaDeOutroSalao() throws Exception {
        String adminA = fx.tokenAdmin(salaoA);
        String b = salaoB.getId().toString();

        mockMvc.perform(get("/api/social/accounts").param("salonId", b)
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/social/accounts/" + contaB.getId()).param("salonId", b)
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/social/accounts/" + contaB.getId()).param("salonId", b)
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/social/accounts/" + contaB.getId() + "/refresh").param("salonId", b)
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/social/instagram/auth").param("salonId", b)
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isForbidden());

        assertThat(contaSocialRepository.findById(contaB.getId()).orElseThrow().isAtiva()).isTrue();
    }

    @Test
    @DisplayName("Recepcionista e profissional do próprio salão não gerenciam as contas")
    void equipeNaoGerenciaContas() throws Exception {
        String b = salaoB.getId().toString();
        for (Role role : new Role[]{Role.RECEPCIONISTA, Role.PROFISSIONAL}) {
            String token = fx.token(fx.usuario(role, salaoB), salaoB.getId());
            mockMvc.perform(get("/api/social/accounts").param("salonId", b)
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    @DisplayName("Admin do Salão B lista e desconecta a própria conta")
    void adminDoProprioSalaoGerencia() throws Exception {
        String adminB = fx.tokenAdmin(salaoB);
        String b = salaoB.getId().toString();

        mockMvc.perform(get("/api/social/accounts").param("salonId", b)
                        .header("Authorization", "Bearer " + adminB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].accountName").value("salao_b_oficial"));
        mockMvc.perform(delete("/api/social/accounts/" + contaB.getId()).param("salonId", b)
                        .header("Authorization", "Bearer " + adminB))
                .andExpect(status().isNoContent());

        assertThat(contaSocialRepository.findById(contaB.getId()).orElseThrow().isAtiva()).isFalse();
    }
}
