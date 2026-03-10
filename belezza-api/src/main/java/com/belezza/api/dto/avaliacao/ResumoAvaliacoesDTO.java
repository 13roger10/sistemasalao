package com.belezza.api.dto.avaliacao;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumoAvaliacoesDTO {

    private BigDecimal mediaGeral;
    private String mediaGeralFormatada;
    private long totalAvaliacoes;
    private long avaliacoesComComentario;
    private Map<Integer, Long> distribuicaoPorNota;
    private double percentualSatisfacao;
    private List<RankingAvaliacaoDTO> rankingProfissionais;
    private List<AvaliacaoResponse> ultimasAvaliacoes;
}
