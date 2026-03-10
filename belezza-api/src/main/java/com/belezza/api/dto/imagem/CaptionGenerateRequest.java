package com.belezza.api.dto.imagem;

import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.TipoServico;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CaptionGenerateRequest {

    @NotBlank(message = "Image description is required")
    private String imageDescription;

    private TipoServico tipoServico;

    private String estiloSalao;

    @NotNull(message = "Platform is required")
    private PlataformaSocial plataforma;

    @Builder.Default
    private String tom = "profissional";

    @Builder.Default
    private String idioma = "português";

    @Builder.Default
    private int variations = 1;
}
