package com.belezza.api.dto.comissao;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmarPagamentoRequest {

    @NotBlank(message = "Referencia da transacao e obrigatoria")
    private String referenciaTransacao;

    private String observacoes;
}
