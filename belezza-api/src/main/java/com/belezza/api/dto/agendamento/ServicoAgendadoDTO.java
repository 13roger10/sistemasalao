package com.belezza.api.dto.agendamento;

import com.belezza.api.entity.AgendamentoServico;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO representing a service within an appointment.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServicoAgendadoDTO {

    private Long servicoId;
    private String servicoNome;
    private String servicoDescricao;
    private BigDecimal servicoPreco;
    private int ordem;
    private int duracaoPrevistaMinutos;
    private int tempoPreparacaoMinutos;

    public static ServicoAgendadoDTO fromEntity(AgendamentoServico as) {
        return ServicoAgendadoDTO.builder()
            .servicoId(as.getServico().getId())
            .servicoNome(as.getServico().getNome())
            .servicoDescricao(as.getServico().getDescricao())
            .servicoPreco(as.getServico().getPreco())
            .ordem(as.getOrdem())
            .duracaoPrevistaMinutos(as.getDuracaoPrevistaMinutos())
            .tempoPreparacaoMinutos(as.getTempoPreparacaoMinutos())
            .build();
    }
}
