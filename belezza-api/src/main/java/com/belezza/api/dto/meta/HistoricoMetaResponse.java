package com.belezza.api.dto.meta;

import com.belezza.api.entity.HistoricoMeta;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricoMetaResponse {

    private Long id;
    private Long metaId;
    private LocalDate dataRegistro;
    private BigDecimal valorAnterior;
    private BigDecimal valorNovo;
    private BigDecimal variacao;
    private BigDecimal percentualProgresso;
    private LocalDateTime criadoEm;

    public static HistoricoMetaResponse fromEntity(HistoricoMeta historico) {
        return HistoricoMetaResponse.builder()
                .id(historico.getId())
                .metaId(historico.getMeta().getId())
                .dataRegistro(historico.getDataRegistro())
                .valorAnterior(historico.getValorAnterior())
                .valorNovo(historico.getValorNovo())
                .variacao(historico.getVariacao())
                .percentualProgresso(historico.getPercentualProgresso())
                .criadoEm(historico.getCriadoEm())
                .build();
    }
}
