package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.support.TenantFixture;
import com.fasterxml.jackson.databind.JsonNode;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-016 (auditoria): depois da troca de senha, os tokens emitidos antes dela deixam de valer.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Troca de senha encerra as sessões abertas")
class TrocaSenhaSessaoIT {

    private static final String SENHA = "SenhaAntiga1";
    private static final String NOVA = "SenhaNova123";

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private TenantFixture fx;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private JsonNode login(String email, String senha) throws Exception {
        String corpo = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("email", email, "password", senha))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(corpo);
    }

    @Test
    @DisplayName("Access e refresh token de antes da troca são recusados; o login novo funciona")
    void trocaDeSenhaDerrubaTokensAntigos() throws Exception {
        Usuario usuario = fx.usuario(Role.CLIENTE, null);
        usuario.setPassword(passwordEncoder.encode(SENHA));
        usuario.setEmailVerificado(true);
        usuarioRepository.saveAndFlush(usuario);

        JsonNode sessao = login(usuario.getEmail(), SENHA);
        String access = sessao.get("accessToken").asText();
        String refresh = sessao.get("refreshToken").asText();
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isOk());

        // O iat do JWT é em segundos: a troca precisa cair num segundo depois da emissão
        Thread.sleep(1100);

        mockMvc.perform(put("/api/usuarios/me")
                        .header("Authorization", "Bearer " + access)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("password", NOVA, "senhaAtual", SENHA))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("refreshToken", refresh))))
                .andExpect(status().isUnauthorized());

        String novoAccess = login(usuario.getEmail(), NOVA).get("accessToken").asText();
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + novoAccess))
                .andExpect(status().isOk());
    }
}
