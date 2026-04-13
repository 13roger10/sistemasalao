package com.belezza.api.dto.equipe;

import com.belezza.api.entity.FuncaoStudio;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MembroStudioRequest {

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;

    @NotNull(message = "Função é obrigatória")
    private FuncaoStudio funcao;
}
