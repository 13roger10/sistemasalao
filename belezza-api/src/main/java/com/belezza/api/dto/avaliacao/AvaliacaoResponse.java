package com.belezza.api.dto.avaliacao;

import com.belezza.api.entity.Avaliacao;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvaliacaoResponse {

    private Long id;
    private Long agendamentoId;
    private Long profissionalId;
    private String profissionalNome;
    private Long salonId;
    private int nota;
    private String comentario;
    private LocalDateTime criadoEm;

    public static AvaliacaoResponse fromEntity(Avaliacao avaliacao) {
        return AvaliacaoResponse.builder()
                .id(avaliacao.getId())
                .agendamentoId(avaliacao.getAgendamento().getId())
                .profissionalId(avaliacao.getProfissional().getId())
                .profissionalNome(avaliacao.getProfissional().getUsuario().getNome())
                .salonId(avaliacao.getSalon().getId())
                .nota(avaliacao.getNota())
                .comentario(avaliacao.getComentario())
                .criadoEm(avaliacao.getCriadoEm())
                .build();
    }
}
