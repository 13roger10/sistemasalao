package com.belezza.api.validation;

import com.belezza.api.util.Telefones;
import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Telefone com DDD (BUG-031): antes só havia @Size, e "abcdefghijk" ou "abc" eram aceitos. Nulo e
 * vazio são aceitos — campos opcionais continuam opcionais (use {@code @NotBlank} junto quando for
 * obrigatório).
 */
@Documented
@Constraint(validatedBy = Telefone.Validador.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface Telefone {

    String message() default "Telefone inválido: informe o DDD e o número (10 ou 11 dígitos)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validador implements ConstraintValidator<Telefone, String> {
        @Override
        public boolean isValid(String valor, ConstraintValidatorContext context) {
            return valor == null || valor.isBlank() || Telefones.valido(valor);
        }
    }
}
