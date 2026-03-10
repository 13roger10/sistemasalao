package com.belezza.api.dto.pagamento;

import com.belezza.api.entity.FormaPagamento;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.StatusPagamento;
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
public class PagamentoResponse {

    private Long id;
    private Long agendamentoId;
    private Long salonId;
    private BigDecimal valor;
    private FormaPagamento forma;
    private String formaDescricao;
    private StatusPagamento status;
    private String statusDescricao;
    private String transacaoId;
    private LocalDateTime processadoEm;
    private LocalDateTime criadoEm;

    public static PagamentoResponse fromEntity(Pagamento pagamento) {
        return PagamentoResponse.builder()
                .id(pagamento.getId())
                .agendamentoId(pagamento.getAgendamento().getId())
                .salonId(pagamento.getSalon().getId())
                .valor(pagamento.getValor())
                .forma(pagamento.getForma())
                .formaDescricao(pagamento.getForma().getDescription())
                .status(pagamento.getStatus())
                .statusDescricao(pagamento.getStatus().getDescription())
                .transacaoId(pagamento.getTransacaoId())
                .processadoEm(pagamento.getProcessadoEm())
                .criadoEm(pagamento.getCriadoEm())
                .build();
    }
}
