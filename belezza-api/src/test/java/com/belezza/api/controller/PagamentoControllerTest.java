package com.belezza.api.controller;

import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.entity.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PagamentoController")
class PagamentoControllerTest {

    @Test
    @DisplayName("Estorno é exclusivo do ADMIN (BUG-013)")
    void estornoExclusivoDoAdmin() throws NoSuchMethodException {
        var estornar = PagamentoController.class.getMethod("estornar", Long.class, Usuario.class);

        assertThat(estornar.isAnnotationPresent(AdminOnly.class)).isTrue();
        assertThat(estornar.isAnnotationPresent(ProfissionalOrAdmin.class)).isFalse();
    }
}
