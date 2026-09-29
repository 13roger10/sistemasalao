package com.belezza.api.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Política única de senha (BUG-030): 8 a 100 caracteres, com letra maiúscula, minúscula e número.
 * Antes o cadastro e a redefinição exigiam isso, mas criar usuário, editar usuário e trocar a senha
 * no perfil aceitavam qualquer senha de 6 caracteres. Nulo é aceito: campos de senha opcionais
 * continuam opcionais (use {@code @NotBlank} junto quando for obrigatória).
 */
@Documented
@Constraint(validatedBy = {})
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Size(min = 8, max = 100, message = "Senha deve ter entre 8 e 100 caracteres")
@Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
        message = "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número")
public @interface SenhaForte {
    String message() default "Senha fora da política de segurança";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
