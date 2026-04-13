package com.belezza.api.dto.equipe;

import com.belezza.api.entity.FuncaoStudio;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AlterarFuncaoRequest {

    @NotNull(message = "Função é obrigatória")
    private FuncaoStudio funcao;
}
