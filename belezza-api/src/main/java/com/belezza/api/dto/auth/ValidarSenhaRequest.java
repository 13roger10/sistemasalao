package com.belezza.api.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ValidarSenhaRequest {

    @NotBlank(message = "Senha obrigatória")
    private String senha;
}
