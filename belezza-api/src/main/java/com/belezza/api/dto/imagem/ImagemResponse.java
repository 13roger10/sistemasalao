package com.belezza.api.dto.imagem;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImagemResponse {
    private Long id;
    private Long salonId;
    private Long criadorId;
    private String criadorNome;
    private String urlOriginal;
    private String urlAtual;
    private String thumbnailUrl;
    private String nomeArquivo;
    private Long tamanhoBytes;
    private String tipoMime;
    private int largura;
    private int altura;
    private String descricao;
    private int totalVersoes;
    private List<ImagemVersaoResponse> versoes;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}
