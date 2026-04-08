package com.belezza.api.dto.estoque;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AjusteEstoqueRequest {

    @NotNull(message = "Quantidade é obrigatória")
    private Integer quantidade;

    @NotNull(message = "Motivo é obrigatório")
    @Size(max = 500)
    private String motivo;

    @Size(max = 500)
    private String observacoes;
}
