package com.belezza.api.validation;

import com.belezza.api.dto.auth.LoginRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("E-mail com espaços nas pontas (BUG-041)")
class EmailComEspacosTest {

    @Test
    @DisplayName("Login com \"  ana@teste.com  \" chega sem os espaços e passa na validação")
    void loginSemEspacos() throws Exception {
        LoginRequest req = new ObjectMapper()
                .readValue("{\"email\":\"  ana@teste.com  \",\"password\":\"Teste@1234\"}", LoginRequest.class);

        assertThat(req.getEmail()).isEqualTo("ana@teste.com");
        assertThat(Validation.buildDefaultValidatorFactory().getValidator().validate(req)).isEmpty();
    }
}
