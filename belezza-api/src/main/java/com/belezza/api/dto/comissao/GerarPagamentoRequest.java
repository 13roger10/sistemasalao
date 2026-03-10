package com.belezza.api.dto.comissao;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GerarPagamentoRequest {

    @NotNull(message = "ID do profissional e obrigatorio")
    private Long profissionalId;

    @NotNull(message = "Data de inicio do periodo e obrigatoria")
    private LocalDate periodoInicio;

    @NotNull(message = "Data de fim do periodo e obrigatoria")
    private LocalDate periodoFim;

    private String observacoes;
}
