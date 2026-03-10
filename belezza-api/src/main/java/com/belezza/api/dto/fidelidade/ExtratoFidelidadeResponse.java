package com.belezza.api.dto.fidelidade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtratoFidelidadeResponse {

    private FidelidadeClienteResponse fidelidadeCliente;
    private List<FidelidadeTransacaoResponse> transacoes;
    private ResumoExtratoDTO resumo;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResumoExtratoDTO {
        private int totalVisitasPeriodo;
        private int totalCreditosGanhos;
        private int totalCreditosResgatados;
        private int saldoCreditos;
        private int pontosGanhos;
    }
}
