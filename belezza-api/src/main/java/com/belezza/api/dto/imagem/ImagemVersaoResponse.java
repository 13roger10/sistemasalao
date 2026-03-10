package com.belezza.api.dto.imagem;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImagemVersaoResponse {
    private Long id;
    private String url;
    private String operacao;
    private String parametros;
    private Long tamanhoBytes;
    private int largura;
    private int altura;
    private int numeroVersao;
    private LocalDateTime criadoEm;
}
