package com.belezza.api.dto.coloracao;

import com.belezza.api.entity.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FichaColoracaoResponse {

    private Long id;
    private Long clienteId;
    private String clienteNome;
    private String clienteEmail;
    private String clienteTelefone;
    private Long salonId;

    private TomPele tomPele;
    private String tomPeleDescricao;
    private SubtomPele subtomPele;
    private String subtomPeleDescricao;
    private TipoCabelo tipoCabelo;
    private String tipoCabeloDescricao;

    private String corNatural;
    private String corAtual;
    private String porcentagemBrancos;
    private String texturaCabelo;
    private String porosidade;
    private String elasticidade;

    private boolean temQuimica;
    private String historicoQuimico;
    private LocalDateTime ultimaQuimica;

    private boolean temAlergia;
    private String alergias;
    private boolean sensibilidadeCouro;

    private String preferenciaCores;
    private String coresEvitar;
    private String observacoes;

    private String fotoReferencia1;
    private String fotoReferencia2;
    private String fotoReferencia3;

    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    public static FichaColoracaoResponse fromEntity(FichaColoracao ficha) {
        return FichaColoracaoResponse.builder()
                .id(ficha.getId())
                .clienteId(ficha.getCliente().getId())
                .clienteNome(ficha.getCliente().getUsuario().getNome())
                .clienteEmail(ficha.getCliente().getUsuario().getEmail())
                .clienteTelefone(ficha.getCliente().getUsuario().getTelefone())
                .salonId(ficha.getSalon().getId())
                .tomPele(ficha.getTomPele())
                .tomPeleDescricao(ficha.getTomPele() != null ? ficha.getTomPele().getDescricao() : null)
                .subtomPele(ficha.getSubtomPele())
                .subtomPeleDescricao(ficha.getSubtomPele() != null ? ficha.getSubtomPele().getDescricao() : null)
                .tipoCabelo(ficha.getTipoCabelo())
                .tipoCabeloDescricao(ficha.getTipoCabelo() != null ? ficha.getTipoCabelo().getDescricao() : null)
                .corNatural(ficha.getCorNatural())
                .corAtual(ficha.getCorAtual())
                .porcentagemBrancos(ficha.getPorcentagemBrancos())
                .texturaCabelo(ficha.getTexturaCabelo())
                .porosidade(ficha.getPorosidade())
                .elasticidade(ficha.getElasticidade())
                .temQuimica(ficha.isTemQuimica())
                .historicoQuimico(ficha.getHistoricoQuimico())
                .ultimaQuimica(ficha.getUltimaQuimica())
                .temAlergia(ficha.isTemAlergia())
                .alergias(ficha.getAlergias())
                .sensibilidadeCouro(ficha.isSensibilidadeCouro())
                .preferenciaCores(ficha.getPreferenciaCores())
                .coresEvitar(ficha.getCoresEvitar())
                .observacoes(ficha.getObservacoes())
                .fotoReferencia1(ficha.getFotoReferencia1())
                .fotoReferencia2(ficha.getFotoReferencia2())
                .fotoReferencia3(ficha.getFotoReferencia3())
                .criadoEm(ficha.getCriadoEm())
                .atualizadoEm(ficha.getAtualizadoEm())
                .build();
    }
}
