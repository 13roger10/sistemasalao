package com.belezza.api.validation;

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
 * CNPJ com dígitos verificadores válidos (BUG-032): antes só havia @Size, e 11.111.111/1111-11 era
 * aceito. Com ou sem pontuação. Nulo e vazio são aceitos — o CNPJ continua opcional.
 */
@Documented
@Constraint(validatedBy = Cnpj.Validador.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface Cnpj {

    String message() default "CNPJ inválido";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validador implements ConstraintValidator<Cnpj, String> {
        private static final int[] PESOS_1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        private static final int[] PESOS_2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

        @Override
        public boolean isValid(String valor, ConstraintValidatorContext context) {
            return valor == null || valor.isBlank() || valido(valor);
        }

        public static boolean valido(String valor) {
            if (!valor.matches("[0-9./\\-\\s]+")) {
                return false;
            }
            String digitos = valor.replaceAll("\\D", "");
            if (digitos.length() != 14 || digitos.chars().distinct().count() == 1) {
                return false;
            }
            return digitos.charAt(12) - '0' == digito(digitos, PESOS_1)
                    && digitos.charAt(13) - '0' == digito(digitos, PESOS_2);
        }

        private static int digito(String digitos, int[] pesos) {
            int soma = 0;
            for (int i = 0; i < pesos.length; i++) {
                soma += (digitos.charAt(i) - '0') * pesos[i];
            }
            int resto = soma % 11;
            return resto < 2 ? 0 : 11 - resto;
        }
    }
}
