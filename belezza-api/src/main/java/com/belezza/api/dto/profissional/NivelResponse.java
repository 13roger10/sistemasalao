package com.belezza.api.dto.profissional;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NivelResponse {
    private String codigo;
    private String descricao;
    private String detalhes;
}
