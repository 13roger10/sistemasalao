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

    // Intervalo é opcional - se não fornecido, profissional trabalha sem pausa
    private String intervaloInicio;

    // Intervalo é opcional - se não fornecido, profissional trabalha sem pausa
    private String intervaloFim;
}
