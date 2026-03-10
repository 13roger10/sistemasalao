package com.belezza.api.dto.agendamento;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelamentoRequest {

    @NotBlank(message = "Motivo do cancelamento é obrigatório")
    @Size(max = 300, message = "Motivo deve ter no máximo 300 caracteres")
    private String motivo;
}
