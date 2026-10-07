package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
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

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-013 (auditoria): Tarefas, Fidelidade, Metas e Estoque procuravam "o salão do admin" pelo
 * e-mail de quem chamava, e a equipe recebia 404. Agora a equipe usa o salão do token, com
 * as ações limitadas por papel.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Módulos da equipe — salão pelo token")
class EquipeModulosIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;

    private Salon salao;
    private String admin;
    private String recep;
    private Usuario func;
    private String funcToken;

    @BeforeEach
    void setUp() {
        salao = fx.salao("Salao Equipe");
        admin = fx.tokenAdmin(salao);
        recep = fx.token(fx.usuario(Role.RECEPCIONISTA, salao), salao.getId());
        func = fx.usuario(Role.PROFISSIONAL, null);
        funcToken = fx.token(func, salao.getId());
    }

    private String criarTarefa(String token, Long atribuidoA) throws Exception {
        String body = mockMvc.perform(post("/api/tarefas").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titulo\":\"Repor toalhas\",\"dataPrevista\":\"" + LocalDate.now().plusDays(1) + "\""
                                + (atribuidoA != null ? ",\"atribuidoAId\":" + atribuidoA : "") + "}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id").toString();
    }

    @Test
    @DisplayName("Funcionário conclui a tarefa atribuída a ele, mas não a dos outros nem cria tarefas")
    void funcionarioETarefas() throws Exception {
        String minha = criarTarefa(recep, func.getId());
        String deOutro = criarTarefa(admin, null);

        mockMvc.perform(get("/api/tarefas/minhas").header("Authorization", "Bearer " + funcToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(Integer.valueOf(minha)));
        mockMvc.perform(patch("/api/tarefas/" + minha + "/concluir").header("Authorization", "Bearer " + funcToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDA"));
        mockMvc.perform(patch("/api/tarefas/" + deOutro + "/concluir").header("Authorization", "Bearer " + funcToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/tarefas").header("Authorization", "Bearer " + funcToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titulo\":\"X\",\"dataPrevista\":\"" + LocalDate.now() + "\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Recepcionista abre Metas e Estoque e cadastra produto; funcionário vê os programas de fidelidade")
    void recepcionistaEFuncionarioAbremOsModulos() throws Exception {
        mockMvc.perform(get("/api/metas").header("Authorization", "Bearer " + recep))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/metas/999999").header("Authorization", "Bearer " + recep))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/salon/stock/products").header("Authorization", "Bearer " + recep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Shampoo\",\"estoqueAtual\":5,\"estoqueMinimo\":1,\"precoCusto\":10}"))
                .andExpect(status().is2xxSuccessful());
        mockMvc.perform(get("/api/salon/stock/products").header("Authorization", "Bearer " + recep))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nome").value("Shampoo"));
        mockMvc.perform(get("/api/fidelidade/programas").header("Authorization", "Bearer " + funcToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Cliente não usa os módulos internos e a equipe não vê as tarefas de outro salão")
    void clienteEOutroSalao() throws Exception {
        String cliente = fx.token(fx.usuario(Role.CLIENTE, salao), salao.getId());
        mockMvc.perform(get("/api/tarefas").header("Authorization", "Bearer " + cliente))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/salon/stock/products").header("Authorization", "Bearer " + cliente))
                .andExpect(status().isForbidden());

        Salon outro = fx.salao("Outro Salao");
        String tarefaDoOutro = criarTarefa(fx.tokenAdmin(outro), null);
        mockMvc.perform(get("/api/tarefas/" + tarefaDoOutro).header("Authorization", "Bearer " + recep))
                .andExpect(status().isNotFound());
    }
}
