package com.belezza.api.dto.meta;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaDashboardResponse {

    private long totalMetas;
    private long metasAtingidas;
    private long metasEmAndamento;
    private BigDecimal percentualGeralProgresso;
    private List<MetaResponse> metasAtuais;
    private List<MetaResumoResponse> resumoPorTipo;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetaResumoResponse {
        private String tipo;
        private String tipoDescricao;
        private long quantidade;
        private long atingidas;
        private BigDecimal percentualMedio;
    }
}
