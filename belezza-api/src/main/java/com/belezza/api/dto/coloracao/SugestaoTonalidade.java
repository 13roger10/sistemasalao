package com.belezza.api.dto.coloracao;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SugestaoTonalidade {

    private String tomPele;
    private String subtomPele;
    private List<SugestaoCorResponse> coresRecomendadas;
    private List<String> coresEvitar;
    private List<String> dicasGerais;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SugestaoCorResponse {
        private String categoria;
        private List<String> tons;
        private String descricao;
        private String nivel; // Claro, Médio, Escuro
    }
}
