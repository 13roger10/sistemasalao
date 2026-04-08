package com.belezza.api.dto.coloracao;

import com.belezza.api.entity.SubtomPele;
import com.belezza.api.entity.TipoCabelo;
import com.belezza.api.entity.TomPele;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FichaColoracaoRequest {

    @NotNull(message = "Cliente é obrigatório")
    private Long clienteId;

    private TomPele tomPele;
    private SubtomPele subtomPele;
    private TipoCabelo tipoCabelo;

    @Size(max = 50)
    private String corNatural;

    @Size(max = 50)
    private String corAtual;

    @Size(max = 20)
    private String porcentagemBrancos;

    @Size(max = 50)
    private String texturaCabelo;

    @Size(max = 50)
    private String porosidade;

    @Size(max = 50)
    private String elasticidade;

    @Builder.Default
    private boolean temQuimica = false;

    @Size(max = 500)
    private String historicoQuimico;

    private LocalDateTime ultimaQuimica;

    @Builder.Default
    private boolean temAlergia = false;

    @Size(max = 500)
    private String alergias;

    @Builder.Default
    private boolean sensibilidadeCouro = false;

    @Size(max = 500)
    private String preferenciaCores;

    @Size(max = 500)
    private String coresEvitar;

    @Size(max = 1000)
    private String observacoes;

    private String fotoReferencia1;
    private String fotoReferencia2;
    private String fotoReferencia3;
}
