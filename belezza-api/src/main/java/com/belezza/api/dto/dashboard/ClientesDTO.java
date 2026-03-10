package com.belezza.api.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Métricas de clientes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientesDTO {

    // Total de clientes cadastrados
    private int totalCadastrados;

    // Novos clientes no período
    private int novosNoPeriodo;

    // Clientes atendidos no período
    private int atendidosNoPeriodo;

    // Clientes recorrentes (mais de um agendamento)
    private int recorrentes;

    // Taxa de retorno
    private BigDecimal taxaRetorno;

    // Aniversariantes do dia/período
    private int aniversariantes;

    // Clientes em fidelidade
    private int emProgramaFidelidade;

    // Clientes que completaram fidelidade
    private int fidelidadeCompleta;
}
