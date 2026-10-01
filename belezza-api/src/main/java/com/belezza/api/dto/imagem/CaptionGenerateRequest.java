package com.belezza.api.dto.imagem;

import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.TipoServico;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaptionGenerateRequest {

    // Limites de tamanho: tudo isto entra no prompt da IA, e cada caractere custa (antes não havia
    // limite e uma descrição de 50 mil caracteres era aceita)
    @NotBlank(message = "Descreva a imagem")
    @Size(max = 1000, message = "Descrição da imagem deve ter no máximo 1000 caracteres")
    private String imageDescription;

    private TipoServico tipoServico;

    @Size(max = 200, message = "Estilo do salão deve ter no máximo 200 caracteres")
    private String estiloSalao;

    @NotNull(message = "Platform is required")
    private PlataformaSocial plataforma;

    @Size(max = 30, message = "Tom de voz deve ter no máximo 30 caracteres")
    @Builder.Default
    private String tom = "profissional";

    @Size(max = 30, message = "Idioma deve ter no máximo 30 caracteres")
    @Builder.Default
    private String idioma = "português";

    @Min(value = 1, message = "Peça pelo menos 1 variação")
    @Max(value = 5, message = "No máximo 5 variações")
    @Builder.Default
    private int variations = 1;
}
