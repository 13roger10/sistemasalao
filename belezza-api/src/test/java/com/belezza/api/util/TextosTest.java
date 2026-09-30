package com.belezza.api.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Busca sem acentos (BUG-040)")
class TextosTest {

    @Test
    @DisplayName("\"jose cao\" encontra \"José Ção\", com maiúsculas e espaços repetidos")
    void ignoraAcentosMaiusculasEEspacos() {
        assertThat(Textos.contem("José  Ção", "jose cao")).isTrue();
        assertThat(Textos.contem("JOÃO DA CONCEIÇÃO", "joao da conceicao")).isTrue();
        assertThat(Textos.contem("Maria", "  MARÍA ")).isTrue();
        assertThat(Textos.contem("José Ção", "joana")).isFalse();
        assertThat(Textos.contem(null, "jose")).isFalse();
    }
}
