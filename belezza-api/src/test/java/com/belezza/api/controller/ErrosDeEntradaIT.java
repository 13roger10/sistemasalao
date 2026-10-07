package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
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

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-017, BUG-018 e BUG-019 (auditoria): entradas que davam erro 500 passam a ter resposta clara.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Erros de entrada com resposta clara")
class ErrosDeEntradaIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private TenantFixture fx;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("BUG-017: e-mail já cadastrado, em maiúsculas, dá 409; o login aceita o e-mail em maiúsculas")
    void emailEmMaiusculas() throws Exception {
        Salon salao = fx.salao("Salao Email");
        Usuario existente = fx.usuario(Role.CLIENTE, null);
        existente.setPassword(passwordEncoder.encode("Senha1234"));
        existente.setEmailVerificado(true);
        usuarioRepository.saveAndFlush(existente);

        mockMvc.perform(post("/api/usuarios")
                        .header("Authorization", "Bearer " + fx.tokenAdmin(salao))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nome", "Duplicado",
                                "email", " " + existente.getEmail().toUpperCase() + " ",
                                "password", "Senha1234",
                                "telefone", "11987650001",
                                "whatsapp", "11987650001",
                                "dataNascimento", "1990-01-01",
                                "role", "CLIENTE"))))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", existente.getEmail().toUpperCase(), "password", "Senha1234"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("BUG-018: observação do cliente com mais de 500 caracteres dá 400")
    void observacaoLonga() throws Exception {
        Salon salao = fx.salao("Salao Notes");
        mockMvc.perform(post("/api/clientes")
                        .header("Authorization", "Bearer " + fx.tokenAdmin(salao))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Cliente Notes",
                                "phone", "11987650002",
                                "notes", "x".repeat(5000)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("500 caracteres")));
    }

    @Test
    @DisplayName("BUG-019: envio de WhatsApp sem a integração configurada dá 503 com mensagem clara")
    void whatsappNaoConfigurado() throws Exception {
        Salon salao = fx.salao("Salao Wpp");
        mockMvc.perform(post("/api/whatsapp/messages/send")
                        .header("Authorization", "Bearer " + fx.tokenAdmin(salao))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "telefone", "11987650003", "mensagem", "Oi"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("não está configurada")));
    }
}
