package com.belezza.api.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Aniversários")
class AniversariosTest {

    @Test
    @DisplayName("Aniversário hoje: mesmo dia e mês, qualquer ano")
    void ehHoje() {
        LocalDate hoje = LocalDate.of(2026, 10, 1);
        assertThat(Aniversarios.ehHoje(LocalDate.of(1990, 10, 1), hoje)).isTrue();
        assertThat(Aniversarios.ehHoje(LocalDate.of(1990, 10, 2), hoje)).isFalse();
        assertThat(Aniversarios.ehHoje(null, hoje)).isFalse();
    }

    @Test
    @DisplayName("Quem nasceu em 29/02 comemora em 28/02 fora do ano bissexto")
    void bissexto() {
        LocalDate nascimento = LocalDate.of(2000, 2, 29);
        assertThat(Aniversarios.ehHoje(nascimento, LocalDate.of(2026, 2, 28))).isTrue();
        assertThat(Aniversarios.ehHoje(nascimento, LocalDate.of(2028, 2, 28))).isFalse();
        assertThat(Aniversarios.ehHoje(nascimento, LocalDate.of(2028, 2, 29))).isTrue();
    }

    @Test
    @DisplayName("Idade que completa no aniversário deste ano")
    void idade() {
        assertThat(Aniversarios.idadeQueCompleta(LocalDate.of(1990, 12, 25), LocalDate.of(2026, 10, 1))).isEqualTo(36);
    }
}
