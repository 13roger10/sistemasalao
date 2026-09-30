package com.belezza.api.dto.profissional;

import jakarta.validation.constraints.Size;

/**
 * O que o próprio profissional altera no seu cadastro: especialidade e bio (BUG-041). Serviços,
 * comissão e expediente continuam com o admin.
 */
public record MeuPerfilProfissionalRequest(
        @Size(max = 300, message = "Especialidade deve ter no máximo 300 caracteres")
        String especialidade,

        @Size(max = 500, message = "Bio deve ter no máximo 500 caracteres")
        String bio
) {
}
