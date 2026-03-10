package com.belezza.api.dto.fidelidade;

import com.belezza.api.entity.NivelFidelidade;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FidelidadeResumoResponse {

    private long totalClientesInscritos;
    private long totalClientesBronze;
    private long totalClientesPrata;
    private long totalClientesOuro;
    private long totalCreditosDisponiveis;
    private long totalResgatesRealizados;
    private long totalVisitasRegistradas;
    private List<FidelidadeClienteResponse> topClientes;
    private Map<NivelFidelidade, Long> distribuicaoPorNivel;
}
