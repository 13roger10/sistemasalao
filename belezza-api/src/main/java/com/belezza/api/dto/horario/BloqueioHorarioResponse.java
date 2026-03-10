package com.belezza.api.dto.horario;

import com.belezza.api.entity.BloqueioHorario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BloqueioHorarioResponse {

    private Long id;
    private Long profissionalId;
    private LocalDateTime dataInicio;
    private LocalDateTime dataFim;
    private String motivo;
    private boolean recorrente;
    private LocalDateTime criadoEm;

    public static BloqueioHorarioResponse fromEntity(BloqueioHorario b) {
        return BloqueioHorarioResponse.builder()
                .id(b.getId())
                .profissionalId(b.getProfissional().getId())
                .dataInicio(b.getDataInicio())
                .dataFim(b.getDataFim())
                .motivo(b.getMotivo())
                .recorrente(b.isRecorrente())
                .criadoEm(b.getCriadoEm())
                .build();
    }
}
