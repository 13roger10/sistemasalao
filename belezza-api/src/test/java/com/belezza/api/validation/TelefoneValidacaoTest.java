package com.belezza.api.validation;

import com.belezza.api.dto.cliente.ClienteRequest;
import com.belezza.api.dto.user.UpdateMeuPerfilRequest;
import com.belezza.api.util.Telefones;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Validação de telefone e nascimento (BUG-031)")
class TelefoneValidacaoTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private ClienteRequest cliente(String telefone) {
        return ClienteRequest.builder().name("Cliente Teste").phone(telefone).build();
    }

    private Set<String> camposInvalidos(Object request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath).map(Object::toString)
                .collect(java.util.stream.Collectors.toSet());
    }

    @ParameterizedTest
    @ValueSource(strings = {"abcdefghijk", "abc", "11 9620", "123456789012345", "(11) 9620-35710a", "5511"})
    @DisplayName("Telefone com letras ou sem DDD + número é recusado")
    void recusaTelefoneInvalido(String telefone) {
        assertThat(camposInvalidos(cliente(telefone))).contains("phone");
        assertThat(camposInvalidos(UpdateMeuPerfilRequest.builder().telefone(telefone).build())).contains("telefone");
    }

    @ParameterizedTest
    @ValueSource(strings = {"11962035710", "(11) 96203-5710", "(11) 3203-5710", "+55 11 96203-5710", "5511962035710"})
    @DisplayName("Telefone com DDD em qualquer formato é aceito")
    void aceitaTelefoneValido(String telefone) {
        assertThat(camposInvalidos(cliente(telefone))).doesNotContain("phone");
    }

    @Test
    @DisplayName("Perfil sem telefone continua válido")
    void perfilSemTelefone() {
        assertThat(camposInvalidos(UpdateMeuPerfilRequest.builder().nome("Fulano").build())).isEmpty();
    }

    @Test
    @DisplayName("Nascimento no futuro é recusado")
    void nascimentoNoFuturo() {
        ClienteRequest request = cliente("11962035710");
        request.setBirthDate(LocalDate.of(2099, 1, 1));
        assertThat(camposInvalidos(request)).contains("birthDate");

        request.setBirthDate(LocalDate.of(1990, 5, 20));
        assertThat(camposInvalidos(request)).isEmpty();
    }

    @Test
    @DisplayName("Formatos diferentes do mesmo número dão os mesmos dígitos")
    void mesmosDigitos() {
        assertThat(Telefones.digitos("(11) 96203-5710"))
                .isEqualTo(Telefones.digitos("11962035710"))
                .isEqualTo(Telefones.digitos("+55 11 96203-5710"))
                .isEqualTo("11962035710");
    }
}
