package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.*;
import com.belezza.api.repository.FichaColoracaoRepository;
import com.belezza.api.repository.HistoricoColoracaoRepository;
import com.belezza.api.repository.ProfissionalRepository;
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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-003 (auditoria): coloração só para a equipe e só com clientes do próprio salão.
 * Antes, o admin do Salão A criava ficha para cliente do Salão B (e recebia nome, e-mail e
 * telefone dele) e qualquer perfil lia o histórico de coloração de qualquer cliente.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("ColoracaoController — papel e salão")
class ColoracaoControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private FichaColoracaoRepository fichaRepository;
    @Autowired private HistoricoColoracaoRepository historicoRepository;

    private Salon salaoA;
    private Salon salaoB;
    private Cliente clienteA;
    private Cliente clienteB;
    private HistoricoColoracao historicoB;

    @BeforeEach
    void setUp() {
        salaoA = fx.salao("Salao A");
        salaoB = fx.salao("Salao B");
        clienteA = fx.cliente(salaoA);
        clienteB = fx.cliente(salaoB);

        Profissional profB = profissionalRepository.save(Profissional.builder()
                .usuario(fx.usuario(Role.PROFISSIONAL, null))
                .salon(salaoB)
                .build());
        FichaColoracao fichaB = fichaRepository.save(FichaColoracao.builder()
                .cliente(clienteB)
                .salon(salaoB)
                .build());
        historicoB = historicoRepository.save(HistoricoColoracao.builder()
                .ficha(fichaB)
                .cliente(clienteB)
                .profissional(profB)
                .dataServico(LocalDateTime.now().minusDays(3))
                .tecnica(TecnicaColoracao.GLOBAL)
                .build());
    }

    @Test
    @DisplayName("Admin do Salão A não cria ficha para cliente do Salão B (404, sem dados do cliente)")
    void adminNaoCriaFichaParaClienteDeOutroSalao() throws Exception {
        mockMvc.perform(post("/api/coloracao/ficha")
                        .header("Authorization", "Bearer " + fx.tokenAdmin(salaoA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clienteId\":" + clienteB.getId() + "}"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString(clienteB.getUsuario().getEmail()))));

        assertThat(fichaRepository.existsByClienteIdAndSalonId(clienteB.getId(), salaoA.getId())).isFalse();
    }

    @Test
    @DisplayName("Admin do Salão A não lê o histórico de coloração feito no Salão B")
    void adminNaoLeHistoricoDeOutroSalao() throws Exception {
        String adminA = fx.tokenAdmin(salaoA);

        mockMvc.perform(get("/api/coloracao/historico/cliente/" + clienteB.getId())
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get("/api/coloracao/historico/" + historicoB.getId())
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/coloracao/ficha/cliente/" + clienteB.getId())
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Cliente não acessa a coloração (403)")
    void clienteNaoAcessa() throws Exception {
        String cliente = fx.token(clienteA.getUsuario(), null);

        mockMvc.perform(get("/api/coloracao/historico/cliente/" + clienteB.getId())
                        .header("Authorization", "Bearer " + cliente))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/coloracao/historico/" + historicoB.getId())
                        .header("Authorization", "Bearer " + cliente))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin do Salão B lê o próprio histórico")
    void adminDoProprioSalaoLeHistorico() throws Exception {
        mockMvc.perform(get("/api/coloracao/historico/cliente/" + clienteB.getId())
                        .header("Authorization", "Bearer " + fx.tokenAdmin(salaoB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @DisplayName("Profissional (colorista) cria ficha para cliente do próprio salão")
    void profissionalCriaFicha() throws Exception {
        Usuario colorista = fx.usuario(Role.PROFISSIONAL, null);
        profissionalRepository.save(Profissional.builder().usuario(colorista).salon(salaoA).build());

        mockMvc.perform(post("/api/coloracao/ficha")
                        .header("Authorization", "Bearer " + fx.token(colorista, salaoA.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clienteId\":" + clienteA.getId() + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.salonId").value(salaoA.getId()));
    }
}
