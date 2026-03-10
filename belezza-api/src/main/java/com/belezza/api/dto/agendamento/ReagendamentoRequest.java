package com.belezza.api.dto.agendamento;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReagendamentoRequest {

    @NotNull(message = "Nova data e hora são obrigatórios")
    @Future(message = "Nova data e hora devem ser no futuro")
    private LocalDateTime novaDataHora;

    private Long novoProfissionalId;
}
