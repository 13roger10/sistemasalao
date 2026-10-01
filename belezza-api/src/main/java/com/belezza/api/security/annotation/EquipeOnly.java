package com.belezza.api.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Só a equipe do salão (ADMIN, RECEPCIONISTA ou PROFISSIONAL) — nunca o CLIENTE. Usado nos
 * recursos de IA, que consomem créditos pagos do salão (OpenAI/Replicate).
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('ADMIN', 'RECEPCIONISTA', 'PROFISSIONAL')")
public @interface EquipeOnly {
}
