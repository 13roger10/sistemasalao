package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.Produto;
import com.belezza.api.entity.Salon;
import com.belezza.api.repository.ProdutoRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-031 (preço), BUG-032 (CNPJ), BUG-033 (saldo de estoque) e BUG-035 (média pública).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Validações finais da auditoria")
class ValidacoesFinaisIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;
    @Autowired private ProdutoRepository produtoRepository;

    private static String servico(String preco) {
        return "{\"nome\":\"Corte\",\"preco\":" + preco + ",\"duracaoMinutos\":30,\"tipo\":\"CABELO\"}";
    }

    @Test
    @DisplayName("BUG-031: preço com 3 casas ou gigante dá 400; com 2 casas é aceito")
    void precoDoServico() throws Exception {
        Salon salao = fx.salao("Salao Preco");
        String admin = "Bearer " + fx.tokenAdmin(salao);

        for (String invalido : new String[]{"10.999", "1e12"}) {
            mockMvc.perform(post("/api/servicos").header("Authorization", admin)
                            .contentType(MediaType.APPLICATION_JSON).content(servico(invalido)))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(post("/api/servicos").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(servico("10.99")))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("BUG-032: CNPJ com dígitos verificadores errados dá 400; o válido é aceito")
    void cnpjDoSalao() throws Exception {
        Salon salao = fx.salao("Salao CNPJ");
        String admin = "Bearer " + fx.tokenAdmin(salao);

        mockMvc.perform(put("/api/salons/" + salao.getId()).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Salao CNPJ\",\"cnpj\":\"11.111.111/1111-11\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/salons/" + salao.getId()).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Salao CNPJ\",\"cnpj\":\"11.222.333/0001-81\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("BUG-033: ajuste maior que o saldo dá 400 e não mexe no estoque")
    void ajusteAlemDoSaldo() throws Exception {
        Salon salao = fx.salao("Salao Estoque");
        Produto produto = produtoRepository.saveAndFlush(Produto.builder()
                .nome("Shampoo").salon(salao).estoqueAtual(10).build());

        mockMvc.perform(post("/api/salon/stock/products/" + produto.getId() + "/adjust")
                        .header("Authorization", "Bearer " + fx.tokenAdmin(salao))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"quantidade\":-50,\"motivo\":\"Contagem\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Saldo insuficiente")));

        assertThat(produtoRepository.findById(produto.getId()).orElseThrow().getEstoqueAtual()).isEqualTo(10);
    }

    @Test
    @DisplayName("BUG-035: a média do salão abre sem login; a lista de avaliações não")
    void mediaPublica() throws Exception {
        Salon salao = fx.salao("Salao Vitrine");

        mockMvc.perform(get("/api/avaliacoes/salon/" + salao.getId() + "/media"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mediaNotas").value(0.0));
        mockMvc.perform(get("/api/avaliacoes/salon/" + salao.getId() + "/ranking"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/avaliacoes/salon/" + salao.getId()))
                .andExpect(status().isUnauthorized());
    }
}
