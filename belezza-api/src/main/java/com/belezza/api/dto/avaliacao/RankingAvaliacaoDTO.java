package com.belezza.api.dto.avaliacao;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RankingAvaliacaoDTO {

    private int posicao;
    private Long profissionalId;
    private String profissionalNome;
    private String profissionalFotoUrl;
    private BigDecimal mediaNotas;
    private String mediaNotasFormatada;
    private long totalAvaliacoes;
    private long notas5Estrelas;
    private long notas4Estrelas;
    private long notas3Estrelas;
    private long notas2Estrelas;
    private long notas1Estrela;
    private double percentualRecomendacao;
    private String trend;

    public static RankingAvaliacaoDTO create(
            int posicao,
            Long profissionalId,
            String nome,
            String fotoUrl,
            BigDecimal media,
            long total,
            long n5,
            long n4,
            long n3,
            long n2,
            long n1) {

        double percentualRecomendacao = total > 0 ? ((double) (n5 + n4) / total) * 100 : 0;

        String trend = "stable";
        if (media != null && media.compareTo(BigDecimal.valueOf(4.5)) >= 0) {
            trend = "up";
        } else if (media != null && media.compareTo(BigDecimal.valueOf(3.0)) < 0) {
            trend = "down";
        }

        return RankingAvaliacaoDTO.builder()
                .posicao(posicao)
                .profissionalId(profissionalId)
                .profissionalNome(nome)
                .profissionalFotoUrl(fotoUrl)
                .mediaNotas(media != null ? media.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO)
                .mediaNotasFormatada(media != null ? media.setScale(1, RoundingMode.HALF_UP).toString() : "0.0")
                .totalAvaliacoes(total)
                .notas5Estrelas(n5)
                .notas4Estrelas(n4)
                .notas3Estrelas(n3)
                .notas2Estrelas(n2)
                .notas1Estrela(n1)
                .percentualRecomendacao(Math.round(percentualRecomendacao * 10) / 10.0)
                .trend(trend)
                .build();
    }
}
