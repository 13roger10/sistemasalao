package com.belezza.api.dto.coloracao;

import com.belezza.api.entity.TecnicaColoracao;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricoColoracaoRequest {

    @NotNull(message = "Ficha é obrigatória")
    private Long fichaId;

    @NotNull(message = "Profissional é obrigatório")
    private Long profissionalId;

    private Long agendamentoId;

    @NotNull(message = "Data do serviço é obrigatória")
    private LocalDateTime dataServico;

    @NotNull(message = "Técnica é obrigatória")
    private TecnicaColoracao tecnica;

    @Size(max = 100)
    private String marcaTinta;

    @Size(max = 100)
    private String nomeCor;

    @Size(max = 50)
    private String numeroCor;

    @Size(max = 100)
    private String oxidante;

    @Size(max = 200)
    private String formulacao;

    @Min(value = 1)
    private Integer tempoAplicacao;

    @Min(value = 1)
    private Integer tempoPausa;

    @Size(max = 50)
    private String corAntes;

    @Size(max = 50)
    private String corDepois;

    @Size(max = 50)
    private String resultadoObtido;

    @Min(value = 1)
    @Max(value = 5)
    @Builder.Default
    private int satisfacaoCliente = 5;

    private String fotoAntes;
    private String fotoDepois;

    @Size(max = 1000)
    private String observacoes;

    @Size(max = 500)
    private String recomendacoes;

    private LocalDateTime proximaManutencao;
}
