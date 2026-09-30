package com.belezza.api.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.http.converter.HttpMessageNotReadableException;
import com.fasterxml.jackson.databind.JsonMappingException;

import jakarta.validation.ConstraintViolationException;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler for the API.
 * Provides consistent error responses across all endpoints.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Handles resource not found exceptions (specific handler for better logging).
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    @SuppressWarnings("null")
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        log.warn("Resource not found: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(ex.getStatus().value())
                .error(ex.getStatus().getReasonPhrase())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .path(extractPath(request))
                .build();

        return ResponseEntity.status(ex.getStatus()).body(error);
    }

    /**
     * Handles business logic exceptions.
     */
    @ExceptionHandler(BusinessException.class)
    @SuppressWarnings("null")
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex, WebRequest request) {
        log.warn("Business exception: {} (errorCode: {})", ex.getMessage(), ex.getErrorCode());

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(ex.getStatus().value())
                .error(ex.getStatus().getReasonPhrase())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .path(extractPath(request))
                .agendamentosAfetados(ex instanceof AgendamentosAfetadosException afetados ? afetados.getAfetados() : null)
                .build();

        return ResponseEntity.status(ex.getStatus()).body(error);
    }

    /**
     * Handles validation errors.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex, WebRequest request) {
        log.warn("Validation exception: {}", ex.getMessage());

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .errorCode("VALIDATION_ERROR")
                // As telas mostram só "message": com o motivo aqui o usuário sabe o que corrigir
                // (antes aparecia só "Erro de validação nos campos informados")
                .message(fieldErrors.isEmpty() ? "Erro de validação nos campos informados"
                        : fieldErrors.values().stream().distinct().sorted().collect(Collectors.joining("; ")))
                .path(extractPath(request))
                .fieldErrors(fieldErrors)
                .build();

        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handles authentication exceptions from Spring Security.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            AuthenticationException ex, WebRequest request) {
        log.warn("Authentication exception: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.UNAUTHORIZED.value())
                .error(HttpStatus.UNAUTHORIZED.getReasonPhrase())
                .errorCode("AUTHENTICATION_ERROR")
                .message("Não autenticado. Por favor, faça login.")
                .path(extractPath(request))
                .build();

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    /**
     * Handles access denied exceptions.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex, WebRequest request) {
        log.warn("Access denied exception: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.FORBIDDEN.value())
                .error(HttpStatus.FORBIDDEN.getReasonPhrase())
                .errorCode("ACCESS_DENIED")
                .message(mensagemDeAcessoNegado(ex))
                .path(extractPath(request))
                .build();

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    /**
     * Handles rate limit exceptions.
     */
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitException(
            RateLimitExceededException ex, WebRequest request) {
        log.warn("Rate limit exceeded: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .error(HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase())
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .path(extractPath(request))
                .build();

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(error);
    }

    /**
     * Handles JSON parsing/deserialization errors.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, WebRequest request) {
        log.error("JSON parsing error: {}", ex.getMessage());

        // Mensagem em português e sem detalhes internos do Jackson (BUG-039: antes saía
        // "Erro no campo 'unknown': Cannot construct instance of ...")
        String message = "Corpo da requisição inválido: envie um JSON válido";
        Throwable cause = ex.getCause();
        if (cause instanceof JsonMappingException jsonEx) {
            String campo = jsonEx.getPath().stream()
                .map(ref -> ref.getFieldName())
                .filter(name -> name != null)
                .reduce((a, b) -> a + "." + b)
                .orElse(null);
            if (campo != null && cause instanceof com.fasterxml.jackson.databind.exc.InvalidFormatException formato) {
                Class<?> alvo = formato.getTargetType();
                String aceitos = alvo != null && alvo.isEnum()
                        ? " (valores aceitos: " + java.util.Arrays.toString(alvo.getEnumConstants()) + ")" : "";
                message = "Valor inválido para o campo '" + campo + "': \"" + formato.getValue() + "\"" + aceitos;
            } else if (campo != null) {
                message = "Valor inválido para o campo '" + campo + "'";
            }
        }

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .errorCode("JSON_PARSE_ERROR")
                .message(message)
                .path(extractPath(request))
                .build();

        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handles constraint violation exceptions (Bean Validation on path/query params).
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, WebRequest request) {
        log.warn("Constraint violation: {}", ex.getMessage());

        Map<String, String> fieldErrors = ex.getConstraintViolations().stream()
            .collect(Collectors.toMap(
                violation -> {
                    String path = violation.getPropertyPath().toString();
                    return path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
                },
                violation -> violation.getMessage(),
                (existing, replacement) -> existing
            ));

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .errorCode("CONSTRAINT_VIOLATION")
                .message("Erro de validação nos parâmetros")
                .path(extractPath(request))
                .fieldErrors(fieldErrors)
                .build();

        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handles illegal argument exceptions.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, WebRequest request) {
        log.warn("Illegal argument: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .errorCode("INVALID_ARGUMENT")
                .message(ex.getMessage())
                .path(extractPath(request))
                .build();

        return ResponseEntity.badRequest().body(error);
    }

    // --- Erros de requisição que antes caíam no genérico e respondiam 500 (BUG-039) ---

    /** Rota inexistente: 404, não 500. */
    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ErrorResponse> handleRotaInexistente(Exception ex, WebRequest request) {
        return erro(HttpStatus.NOT_FOUND, "NOT_FOUND", "Rota não encontrada: " + extractPath(request), request);
    }

    /** Parâmetro em formato errado (data "31-12-2026", id "abc"): 400 dizendo qual e o formato esperado. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleParametroInvalido(MethodArgumentTypeMismatchException ex, WebRequest request) {
        Class<?> tipo = ex.getRequiredType();
        String esperado = tipo == null ? "" : switch (tipo.getSimpleName()) {
            case "LocalDate" -> " (use o formato AAAA-MM-DD, ex.: 2026-12-31)";
            case "LocalDateTime" -> " (use o formato AAAA-MM-DDTHH:MM, ex.: 2026-12-31T14:30)";
            case "LocalTime" -> " (use o formato HH:MM)";
            case "Long", "long", "Integer", "int" -> " (esperado um número)";
            default -> tipo.isEnum() ? " (valores aceitos: " + java.util.Arrays.toString(tipo.getEnumConstants()) + ")" : "";
        };
        return erro(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER",
                "Valor inválido para '" + ex.getName() + "': \"" + ex.getValue() + "\"" + esperado, request);
    }

    /** Data/hora escrita errada fora dos parâmetros tipados: 400. */
    @ExceptionHandler(DateTimeParseException.class)
    public ResponseEntity<ErrorResponse> handleDataInvalida(DateTimeParseException ex, WebRequest request) {
        return erro(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER",
                "Data ou horário inválido: \"" + ex.getParsedString() + "\" (use AAAA-MM-DD e HH:MM)", request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleParametroAusente(MissingServletRequestParameterException ex, WebRequest request) {
        return erro(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER", "Parâmetro obrigatório ausente: " + ex.getParameterName(), request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMetodoNaoSuportado(HttpRequestMethodNotSupportedException ex, WebRequest request) {
        return erro(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED",
                "Método " + ex.getMethod() + " não é aceito nesta rota", request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleTipoNaoSuportado(HttpMediaTypeNotSupportedException ex, WebRequest request) {
        return erro(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                "Tipo de conteúdo não suportado: " + ex.getContentType() + " (envie JSON)", request);
    }

    private ResponseEntity<ErrorResponse> erro(HttpStatus status, String codigo, String mensagem, WebRequest request) {
        log.warn("{} {}: {}", status.value(), codigo, mensagem);
        return ResponseEntity.status(status).body(ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .errorCode(codigo)
                .message(mensagem)
                .path(extractPath(request))
                .build());
    }

    /**
     * Motivo em português quando o código informou um ("Profissional não pertence a este salão");
     * a mensagem interna do Spring ("Access Denied") vira o texto genérico.
     */
    private static String mensagemDeAcessoNegado(AccessDeniedException ex) {
        String msg = ex.getMessage();
        return msg == null || msg.isBlank() || msg.equalsIgnoreCase("Access Denied")
                ? "Você não tem permissão para acessar este recurso"
                : msg;
    }

    /**
     * Handles all other unexpected exceptions.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, WebRequest request) {
        // Log the full stack trace for debugging
        log.error("Unexpected exception of type {}: {}", ex.getClass().getName(), ex.getMessage(), ex);

        // Provide more context in development
        String message = "Ocorreu um erro interno. Por favor, tente novamente mais tarde.";
        String errorCode = "INTERNAL_ERROR";

        // Check for common wrapped exceptions
        Throwable cause = ex.getCause();
        if (cause instanceof BusinessException businessEx) {
            log.warn("Wrapped BusinessException detected, handling...");
            return handleBusinessException(businessEx, request);
        }

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error(HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase())
                .errorCode(errorCode)
                .message(message)
                .path(extractPath(request))
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private String extractPath(WebRequest request) {
        String description = request.getDescription(false);
        return description.replace("uri=", "");
    }
}
