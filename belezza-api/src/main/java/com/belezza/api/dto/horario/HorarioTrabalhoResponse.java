package com.belezza.api.dto.horario;

import com.belezza.api.entity.DiaSemana;
import com.belezza.api.entity.HorarioTrabalho;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HorarioTrabalhoResponse {

    private Long id;
    private Long profissionalId;
    private DiaSemana diaSemana;
    private String diaSemanaDescricao;
    private LocalTime horaInicio;
    private LocalTime horaFim;
    private LocalTime intervaloInicio;
    private LocalTime intervaloFim;
    private boolean ativo;

    public static HorarioTrabalhoResponse fromEntity(HorarioTrabalho h) {
        return HorarioTrabalhoResponse.builder()
                .id(h.getId())
                .profissionalId(h.getProfissional().getId())
                .diaSemana(h.getDiaSemana())
                .diaSemanaDescricao(h.getDiaSemana().getDescription())
                .horaInicio(h.getHoraInicio())
                .horaFim(h.getHoraFim())
                .intervaloInicio(h.getIntervaloInicio())
                .intervaloFim(h.getIntervaloFim())
                .ativo(h.isAtivo())
                .build();
    }
}
