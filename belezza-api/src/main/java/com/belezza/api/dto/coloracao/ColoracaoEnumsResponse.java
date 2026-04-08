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
public class ColoracaoEnumsResponse {

    private List<EnumItem> tonsPele;
    private List<EnumItem> subtomsPele;
    private List<EnumItem> tiposCabelo;
    private List<EnumItem> tecnicas;

    @Data
    @AllArgsConstructor
    public static class EnumItem {
        private String value;
        private String label;
    }
}
