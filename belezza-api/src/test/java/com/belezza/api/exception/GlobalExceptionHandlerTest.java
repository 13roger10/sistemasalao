package com.belezza.api.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GlobalExceptionHandler - códigos e mensagens (BUG-039)")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final ServletWebRequest request = new ServletWebRequest(new MockHttpServletRequest("GET", "/api/x"));

    @SuppressWarnings("unused")
    private void metodo(LocalDate date) {
    }

    @Test
    @DisplayName("Rota inexistente responde 404, não 500")
    void rotaInexistente() {
        var r = handler.handleRotaInexistente(new NoResourceFoundException(HttpMethod.GET, "api/nao-existe"), request);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(r.getBody().getMessage()).contains("Rota não encontrada");
    }

    @Test
    @DisplayName("Data em formato inválido responde 400 dizendo o formato esperado")
    void dataInvalida() throws Exception {
        var parametro = new MethodParameter(getClass().getDeclaredMethod("metodo", LocalDate.class), 0);
        var ex = new MethodArgumentTypeMismatchException("31-12-2026", LocalDate.class, "date", parametro, null);

        var r = handler.handleParametroInvalido(ex, request);

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(r.getBody().getMessage()).contains("'date'").contains("31-12-2026").contains("AAAA-MM-DD");
    }

    @Test
    @DisplayName("Acesso negado mostra o motivo em português; o 'Access Denied' interno vira texto genérico")
    void acessoNegado() {
        var comMotivo = handler.handleAccessDeniedException(new AccessDeniedException("Profissional não pertence a este salão"), request);
        assertThat(comMotivo.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(comMotivo.getBody().getMessage()).isEqualTo("Profissional não pertence a este salão");

        var doSpring = handler.handleAccessDeniedException(new AccessDeniedException("Access Denied"), request);
        assertThat(doSpring.getBody().getMessage()).isEqualTo("Você não tem permissão para acessar este recurso");
    }
}
