package com.belezza.api.validation;

import com.belezza.api.dto.imagem.CaptionGenerateRequest;
import com.belezza.api.entity.PlataformaSocial;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Legenda com IA - limites de tamanho do que vai para o prompt")
class CaptionLimitesTest {

    private java.util.Set<String> invalidos(CaptionGenerateRequest r) {
        return Validation.buildDefaultValidatorFactory().getValidator().validate(r).stream()
                .map(ConstraintViolation::getPropertyPath).map(Object::toString).collect(Collectors.toSet());
    }

    @Test
    @DisplayName("Descrição de 50 mil caracteres, estilo longo e 50 variações são recusados")
    void limites() {
        CaptionGenerateRequest abuso = CaptionGenerateRequest.builder()
                .imageDescription("A".repeat(50_000)).estiloSalao("B".repeat(201))
                .plataforma(PlataformaSocial.INSTAGRAM).tom("T".repeat(31)).variations(50).build();
        assertThat(invalidos(abuso)).containsExactlyInAnyOrder("imageDescription", "estiloSalao", "tom", "variations");

        CaptionGenerateRequest normal = CaptionGenerateRequest.builder()
                .imageDescription("Corte degradê com barba desenhada").plataforma(PlataformaSocial.INSTAGRAM).build();
        assertThat(invalidos(normal)).isEmpty();
    }
}
