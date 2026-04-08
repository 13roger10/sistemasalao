package com.belezza.api.dto.coloracao;

import com.belezza.api.entity.HistoricoColoracao;
import com.belezza.api.entity.TecnicaColoracao;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricoColoracaoResponse {

    private Long id;
    private Long fichaId;
    private Long clienteId;
    private String clienteNome;
    private Long profissionalId;
    private String profissionalNome;
    private Long agendamentoId;
    private LocalDateTime dataServico;

    private TecnicaColoracao tecnica;
    private String tecnicaNome;
    private String tecnicaDescricao;

    private String marcaTinta;
    private String nomeCor;
    private String numeroCor;
    private String oxidante;
    private String formulacao;

    private Integer tempoAplicacao;
    private Integer tempoPausa;

    private String corAntes;
    private String corDepois;
    private String resultadoObtido;
    private int satisfacaoCliente;

    private String fotoAntes;
    private String fotoDepois;

    private String observacoes;
    private String recomendacoes;
    private LocalDateTime proximaManutencao;

    private LocalDateTime criadoEm;

    public static HistoricoColoracaoResponse fromEntity(HistoricoColoracao historico) {
        return HistoricoColoracaoResponse.builder()
                .id(historico.getId())
                .fichaId(historico.getFicha().getId())
                .clienteId(historico.getCliente().getId())
                .clienteNome(historico.getCliente().getUsuario().getNome())
                .profissionalId(historico.getProfissional().getId())
                .profissionalNome(historico.getProfissional().getUsuario().getNome())
                .agendamentoId(historico.getAgendamento() != null ? historico.getAgendamento().getId() : null)
                .dataServico(historico.getDataServico())
                .tecnica(historico.getTecnica())
                .tecnicaNome(historico.getTecnica().getNome())
                .tecnicaDescricao(historico.getTecnica().getDescricao())
                .marcaTinta(historico.getMarcaTinta())
                .nomeCor(historico.getNomeCor())
                .numeroCor(historico.getNumeroCor())
                .oxidante(historico.getOxidante())
                .formulacao(historico.getFormulacao())
                .tempoAplicacao(historico.getTempoAplicacao())
                .tempoPausa(historico.getTempoPausa())
                .corAntes(historico.getCorAntes())
                .corDepois(historico.getCorDepois())
                .resultadoObtido(historico.getResultadoObtido())
                .satisfacaoCliente(historico.getSatisfacaoCliente())
                .fotoAntes(historico.getFotoAntes())
                .fotoDepois(historico.getFotoDepois())
                .observacoes(historico.getObservacoes())
                .recomendacoes(historico.getRecomendacoes())
                .proximaManutencao(historico.getProximaManutencao())
                .criadoEm(historico.getCriadoEm())
                .build();
    }
}
