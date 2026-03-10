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
public class ImagemUploadResponse {
    private Long id;
    private String urlOriginal;
    private String urlAtual;
    private String thumbnailUrl;
    private String nomeArquivo;
    private Long tamanhoBytes;
    private String tipoMime;
    private int largura;
    private int altura;
    private LocalDateTime criadoEm;
}
