package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.entity.Post;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.StatusPost;
import com.belezza.api.repository.PostRepository;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-005 (auditoria): o ADMIN só passa direto no Estúdio (posts) do salão do próprio token.
 * Antes, o admin do Salão A listava e apagava os posts do Salão B.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Posts — isolamento entre salões")
class PostIsolamentoIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;
    @Autowired private PostRepository postRepository;

    private Salon salaoA;
    private Salon salaoB;
    private Post postB;

    @BeforeEach
    void setUp() {
        salaoA = fx.salao("Salao A");
        salaoB = fx.salao("Salao B");
        postB = postRepository.save(Post.builder()
                .salon(salaoB)
                .criador(salaoB.getAdmin())
                .imagemUrl("https://example.com/b.jpg")
                .legenda("Rascunho privado do Salao B")
                .status(StatusPost.RASCUNHO)
                .plataformas(new java.util.ArrayList<>(List.of(PlataformaSocial.INSTAGRAM)))
                .build());
    }

    @Test
    @DisplayName("Admin do Salão A não lista, lê, edita nem apaga posts do Salão B")
    void adminNaoMexeEmPostDeOutroSalao() throws Exception {
        String adminA = fx.tokenAdmin(salaoA);
        String b = salaoB.getId().toString();

        mockMvc.perform(get("/api/posts").param("salonId", b)
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(get("/api/posts/" + postB.getId()).param("salonId", b)
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(put("/api/posts/" + postB.getId()).param("salonId", b)
                        .header("Authorization", "Bearer " + adminA)
                        .contentType("application/json")
                        .content("{\"legenda\":\"alterado pelo Salao A\"}"))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(delete("/api/posts/" + postB.getId()).param("salonId", b)
                        .header("Authorization", "Bearer " + adminA))
                .andExpect(status().is4xxClientError());

        assertThat(postRepository.findById(postB.getId())).isPresent();
    }

    @Test
    @DisplayName("BUG-030: equipe sem função no Studio recebe 403, e não 400")
    void semFuncaoNoStudioRecebe403() throws Exception {
        Usuario recepcionista = fx.usuario(Role.RECEPCIONISTA, salaoB);

        mockMvc.perform(get("/api/posts").param("salonId", salaoB.getId().toString())
                        .header("Authorization", "Bearer " + fx.token(recepcionista, salaoB.getId())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Usar o próprio salonId com o ID de um post do Salão B também não apaga (404)")
    void adminNaoApagaPostDeOutroSalaoPeloProprioSalonId() throws Exception {
        mockMvc.perform(delete("/api/posts/" + postB.getId()).param("salonId", salaoA.getId().toString())
                        .header("Authorization", "Bearer " + fx.tokenAdmin(salaoA)))
                .andExpect(status().isNotFound());

        assertThat(postRepository.findById(postB.getId())).isPresent();
    }

    @Test
    @DisplayName("BUG-010: dono lista, abre e edita o próprio post sem erro 500")
    void donoListaAbreEEditaOProprioPost() throws Exception {
        String adminB = fx.tokenAdmin(salaoB);
        String b = salaoB.getId().toString();

        mockMvc.perform(get("/api/posts").param("salonId", b)
                        .header("Authorization", "Bearer " + adminB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].criadorNome").value(salaoB.getAdmin().getNome()))
                .andExpect(jsonPath("$.content[0].plataformas[0]").value("INSTAGRAM"));
        mockMvc.perform(get("/api/posts/" + postB.getId()).param("salonId", b)
                        .header("Authorization", "Bearer " + adminB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.legenda").value("Rascunho privado do Salao B"));
        mockMvc.perform(put("/api/posts/" + postB.getId()).param("salonId", b)
                        .header("Authorization", "Bearer " + adminB)
                        .contentType("application/json")
                        .content("{\"legenda\":\"Legenda revisada\",\"hashtags\":[\"#salao\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.legenda").value("Legenda revisada"))
                .andExpect(jsonPath("$.hashtags[0]").value("#salao"));
    }

    @Test
    @DisplayName("Admin do Salão B apaga o próprio post")
    void adminDoProprioSalaoApaga() throws Exception {
        mockMvc.perform(delete("/api/posts/" + postB.getId()).param("salonId", salaoB.getId().toString())
                        .header("Authorization", "Bearer " + fx.tokenAdmin(salaoB)))
                .andExpect(status().is2xxSuccessful());

        assertThat(postRepository.findById(postB.getId())).isEmpty();
    }
}
