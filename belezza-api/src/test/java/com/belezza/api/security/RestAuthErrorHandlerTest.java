package com.belezza.api.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("RestAuthErrorHandler (BUG-015)")
class RestAuthErrorHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final RestAuthErrorHandler handler = new RestAuthErrorHandler(objectMapper);

    @Test
    @DisplayName("Sem autenticação válida (token ausente, expirado ou inválido) responde 401 com JSON")
    void semAutenticacaoResponde401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/agendamentos/salon/1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.commence(request, response, new InsufficientAuthenticationException("token expirado"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).startsWith("application/json");
        JsonNode body = objectMapper.readTree(response.getContentAsByteArray());
        assertThat(body.get("errorCode").asText()).isEqualTo("AUTHENTICATION_ERROR");
        assertThat(body.get("path").asText()).isEqualTo("/api/agendamentos/salon/1");
    }

    @Test
    @DisplayName("Autenticado sem permissão responde 403 com JSON")
    void semPermissaoResponde403() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/usuarios");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(request, response, new AccessDeniedException("sem permissão"));

        assertThat(response.getStatus()).isEqualTo(403);
        JsonNode body = objectMapper.readTree(response.getContentAsByteArray());
        assertThat(body.get("errorCode").asText()).isEqualTo("ACCESS_DENIED");
    }
}
