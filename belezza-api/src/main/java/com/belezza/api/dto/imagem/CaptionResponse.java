package com.belezza.api.dto.imagem;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaptionResponse {
    private String legenda;
    private List<String> hashtags;
    private String callToAction;
    private int engajamentoEstimado;
}
