package com.belezza.api.dto.comissao;

import com.belezza.api.entity.PagamentoProfissional;
import com.belezza.api.entity.StatusPagamentoProfissional;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagamentoProfissionalResponse {

    private Long id;
    private Long salonId;
    private Long profissionalId;
    private String profissionalNome;
    private LocalDate periodoInicio;
    private LocalDate periodoFim;
    private int totalServicos;
    private BigDecimal valorTotalServicos;
    private BigDecimal valorTotalComissoes;
    private StatusPagamentoProfissional status;
    private String statusDescricao;
    private String observacoes;
    private String referenciaTransacao;
    private LocalDateTime pagoEm;
    private LocalDateTime criadoEm;

    public static PagamentoProfissionalResponse fromEntity(PagamentoProfissional pagamento) {
        String profissionalNome = null;
        if (pagamento.getProfissional() != null && pagamento.getProfissional().getUsuario() != null) {
            profissionalNome = pagamento.getProfissional().getUsuario().getNome();
        }

        return PagamentoProfissionalResponse.builder()
                .id(pagamento.getId())
                .salonId(pagamento.getSalon().getId())
                .profissionalId(pagamento.getProfissional().getId())
                .profissionalNome(profissionalNome)
                .periodoInicio(pagamento.getPeriodoInicio())
                .periodoFim(pagamento.getPeriodoFim())
                .totalServicos(pagamento.getTotalServicos())
                .valorTotalServicos(pagamento.getValorTotalServicos())
                .valorTotalComissoes(pagamento.getValorTotalComissoes())
                .status(pagamento.getStatus())
                .statusDescricao(pagamento.getStatus().getDescription())
                .observacoes(pagamento.getObservacoes())
                .referenciaTransacao(pagamento.getReferenciaTransacao())
                .pagoEm(pagamento.getPagoEm())
                .criadoEm(pagamento.getCriadoEm())
                .build();
    }
}
