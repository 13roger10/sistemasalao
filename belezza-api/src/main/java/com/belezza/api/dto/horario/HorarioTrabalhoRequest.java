package com.belezza.api.dto.horario;

import com.belezza.api.entity.DiaSemana;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HorarioTrabalhoRequest {

    @NotNull(message = "Dia da semana é obrigatório")
    private DiaSemana diaSemana;

    @NotNull(message = "Hora de início é obrigatória")
    private String horaInicio;

    @NotNull(message = "Hora de fim é obrigatória")
    private String horaFim;

    @NotNull(message = "Hora de início do intervalo é obrigatória")
    private String intervaloInicio;

    @NotNull(message = "Hora de fim do intervalo é obrigatória")
    private String intervaloFim;
}
