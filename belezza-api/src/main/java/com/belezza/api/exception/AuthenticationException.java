package com.belezza.api.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception for authentication-related errors.
 */
public class AuthenticationException extends BusinessException {

    public AuthenticationException(String message) {
        super(message, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_ERROR");
    }

    public static AuthenticationException invalidCredentials() {
        return new AuthenticationException("Email ou senha inválidos");
    }

    public static AuthenticationException invalidToken() {
        return new AuthenticationException("Token inválido ou expirado");
    }

    public static AuthenticationException accountDisabled() {
        return new AuthenticationException("Conta desativada. Entre em contato com o suporte.");
    }

    public static AuthenticationException emailNotVerified() {
        return new AuthenticationException("Email não verificado. Por favor, verifique seu email.");
    }
}
