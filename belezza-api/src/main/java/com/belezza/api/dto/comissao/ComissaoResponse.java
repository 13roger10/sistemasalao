package com.belezza.api.dto.comissao;

import com.belezza.api.entity.Comissao;
import com.belezza.api.entity.StatusComissao;
import com.belezza.api.entity.TipoComissao;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissaoResponse {

    private Long id;
    private Long salonId;
    private Long profissionalId;
    private String profissionalNome;
    private Long agendamentoId;
    private LocalDateTime dataAgendamento;
    private BigDecimal valorServico;
    private TipoComissao tipoComissao;
    private String tipoComissaoDescricao;
    private BigDecimal taxaComissao;
    private BigDecimal valorComissao;
    private StatusComissao status;
    private String statusDescricao;
    private Long pagamentoProfissionalId;
    private LocalDateTime criadoEm;

    public static ComissaoResponse fromEntity(Comissao comissao) {
        String profissionalNome = null;
        if (comissao.getProfissional() != null && comissao.getProfissional().getUsuario() != null) {
            profissionalNome = comissao.getProfissional().getUsuario().getNome();
        }

        LocalDateTime dataAgendamento = null;
        if (comissao.getAgendamento() != null) {
            dataAgendamento = comissao.getAgendamento().getDataHora();
        }

        return ComissaoResponse.builder()
                .id(comissao.getId())
                .salonId(comissao.getSalon().getId())
                .profissionalId(comissao.getProfissional().getId())
                .profissionalNome(profissionalNome)
                .agendamentoId(comissao.getAgendamento().getId())
                .dataAgendamento(dataAgendamento)
                .valorServico(comissao.getValorServico())
                .tipoComissao(comissao.getTipoComissao())
                .tipoComissaoDescricao(comissao.getTipoComissao().getDescription())
                .taxaComissao(comissao.getTaxaComissao())
                .valorComissao(comissao.getValorComissao())
                .status(comissao.getStatus())
                .statusDescricao(comissao.getStatus().getDescription())
                .pagamentoProfissionalId(comissao.getPagamentoProfissional() != null ?
                        comissao.getPagamentoProfissional().getId() : null)
                .criadoEm(comissao.getCriadoEm())
                .build();
    }
}
