package com.belezza.api.dto.tarefa;

import com.belezza.api.entity.StatusTarefa;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaStatusRequest {

    @NotNull(message = "Status é obrigatório")
    private StatusTarefa status;

    private String observacao;

    private Integer tempoRealMinutos;
}
