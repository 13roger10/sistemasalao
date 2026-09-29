package com.belezza.api.security;

import com.belezza.api.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Respostas de erro de autenticação/autorização barradas nos filtros do Spring Security.
 * Sem isto, o padrão (Http403ForbiddenEntryPoint) devolvia 403 sem corpo também para token
 * ausente, expirado ou inválido — e o frontend, que só renova a sessão ao receber 401,
 * mostrava "acesso negado" em todas as telas depois que o access token expirava.
 *
 * <ul>
 *   <li>Sem autenticação válida → 401 (o cliente deve renovar o token ou logar de novo).</li>
 *   <li>Autenticado, mas sem permissão → 403.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class RestAuthErrorHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        escrever(request, response, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_ERROR",
                "Sessão expirada ou inválida. Faça login novamente.");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        escrever(request, response, HttpStatus.FORBIDDEN, "ACCESS_DENIED",
                "Você não tem permissão para acessar este recurso");
    }

    private void escrever(HttpServletRequest request, HttpServletResponse response, HttpStatus status,
                          String codigo, String mensagem) throws IOException {
        ErrorResponse erro = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .errorCode(codigo)
                .message(mensagem)
                .path(request.getRequestURI())
                .build();
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getOutputStream(), erro);
    }
}
