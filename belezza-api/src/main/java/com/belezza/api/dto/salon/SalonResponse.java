package com.belezza.api.dto.salon;

import com.belezza.api.entity.Salon;
import com.belezza.api.entity.TipoComissao;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalonResponse {

    private Long id;
    private String nome;
    private String descricao;
    private String endereco;
    private String cidade;
    private String estado;
    private String cep;
    private String telefone;
    private String logoUrl;
    private String bannerUrl;
    private String cnpj;
    private LocalTime horarioAbertura;
    private LocalTime horarioFechamento;
    private int intervaloAgendamentoMinutos;
    private int antecedenciaMinimaHoras;
    private int cancelamentoMinimoHoras;
    private int maxNoShowsPermitidos;
    private boolean aceitaAgendamentoOnline;
    private boolean ativo;
    private TipoComissao tipoComissaoPadrao;
    private String tipoComissaoPadraoDescricao;
    private BigDecimal valorComissaoPadrao;
    private Long adminId;
    private String adminNome;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    public static SalonResponse fromEntity(Salon salon) {
        return SalonResponse.builder()
                .id(salon.getId())
                .nome(salon.getNome())
                .descricao(salon.getDescricao())
                .endereco(salon.getEndereco())
                .cidade(salon.getCidade())
                .estado(salon.getEstado())
                .cep(salon.getCep())
                .telefone(salon.getTelefone())
                .logoUrl(salon.getLogoUrl())
                .bannerUrl(salon.getBannerUrl())
                .cnpj(salon.getCnpj())
                .horarioAbertura(salon.getHorarioAbertura())
                .horarioFechamento(salon.getHorarioFechamento())
                .intervaloAgendamentoMinutos(salon.getIntervaloAgendamentoMinutos())
                .antecedenciaMinimaHoras(salon.getAntecedenciaMinimaHoras())
                .cancelamentoMinimoHoras(salon.getCancelamentoMinimoHoras())
                .maxNoShowsPermitidos(salon.getMaxNoShowsPermitidos())
                .aceitaAgendamentoOnline(salon.isAceitaAgendamentoOnline())
                .ativo(salon.isAtivo())
                .tipoComissaoPadrao(salon.getTipoComissaoPadrao())
                .tipoComissaoPadraoDescricao(salon.getTipoComissaoPadrao() != null ? salon.getTipoComissaoPadrao().getDescription() : null)
                .valorComissaoPadrao(salon.getValorComissaoPadrao())
                .adminId(salon.getAdmin().getId())
                .adminNome(salon.getAdmin().getNome())
                .criadoEm(salon.getCriadoEm())
                .atualizadoEm(salon.getAtualizadoEm())
                .build();
    }
}
