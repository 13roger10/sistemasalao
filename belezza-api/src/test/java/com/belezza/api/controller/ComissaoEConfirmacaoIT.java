package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.TipoComissao;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.support.TenantFixture;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-021: a comissão dos profissionais (e a padrão do salão) só para o admin e o próprio profissional.
 * BUG-023: conta de auto-cadastro só entra depois de confirmar o e-mail.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Comissão visível só para quem deve e confirmação de e-mail")
class ComissaoEConfirmacaoIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private TenantFixture fx;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private Profissional profissionalCom40PorCento(Salon salao) {
        return profissionalRepository.saveAndFlush(Profissional.builder()
                .usuario(fx.usuario(Role.PROFISSIONAL, null))
                .salon(salao)
                .tipoComissao(TipoComissao.PORCENTAGEM)
                .valorComissao(new BigDecimal("40.00"))
                .build());
    }

    @Test
    @DisplayName("BUG-021: o cliente não vê a comissão; o admin vê")
    void clienteNaoVeComissao() throws Exception {
        Salon salao = fx.salao("Salao Comissao");
        Profissional prof = profissionalCom40PorCento(salao);
        String tokenCliente = fx.token(fx.cliente(salao).getUsuario(), null);

        mockMvc.perform(get("/api/profissionais/salon/" + salao.getId())
                        .header("Authorization", "Bearer " + tokenCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(prof.getId()))
                .andExpect(jsonPath("$[0].valorComissao").doesNotExist())
                .andExpect(jsonPath("$[0].tipoComissao").doesNotExist());

        mockMvc.perform(get("/api/profissionais/" + prof.getId())
                        .header("Authorization", "Bearer " + tokenCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorComissao").doesNotExist());

        mockMvc.perform(get("/api/salons/" + salao.getId())
                        .header("Authorization", "Bearer " + tokenCliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorComissaoPadrao").doesNotExist());

        mockMvc.perform(get("/api/profissionais/salon/" + salao.getId())
                        .header("Authorization", "Bearer " + fx.tokenAdmin(salao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].valorComissao").value(40.0));
    }

    @Test
    @DisplayName("BUG-021: o profissional vê a própria comissão, mas não a do colega")
    void profissionalVeSoAPropria() throws Exception {
        Salon salao = fx.salao("Salao Colegas");
        Profissional eu = profissionalCom40PorCento(salao);
        Profissional colega = profissionalCom40PorCento(salao);
        String meuToken = fx.token(eu.getUsuario(), salao.getId());

        mockMvc.perform(get("/api/profissionais/" + eu.getId())
                        .header("Authorization", "Bearer " + meuToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorComissao").value(40.0));

        mockMvc.perform(get("/api/profissionais/" + colega.getId())
                        .header("Authorization", "Bearer " + meuToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorComissao").doesNotExist());
    }

    @Test
    @DisplayName("BUG-023: auto-cadastro sem confirmar o e-mail não entra; depois de confirmar, entra")
    void autoCadastroPrecisaConfirmar() throws Exception {
        Usuario usuario = fx.usuario(Role.CLIENTE, null);
        usuario.setPassword(passwordEncoder.encode("Senha1234"));
        usuario.setEmailVerificado(false);
        usuario.setEmailVerificationToken("token-de-confirmacao-it");
        usuarioRepository.saveAndFlush(usuario);
        String login = objectMapper.writeValueAsString(Map.of("email", usuario.getEmail(), "password", "Senha1234"));

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("EMAIL_NAO_VERIFICADO"));

        mockMvc.perform(get("/api/auth/verify-email").param("token", "token-de-confirmacao-it"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());
    }
}
