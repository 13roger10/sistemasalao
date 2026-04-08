package com.belezza.api.security.annotation;

import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to restrict access to ADMIN role or professionals with RECEPCIONISTA, GERENTE or PROPRIETARIO category.
 * Used for appointment management and reception operations.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasRole('ADMIN') or @categoriaProfissionalChecker.isRecepcionistaOrHigher(authentication)")
public @interface RecepcionistaOrAdmin {
}
