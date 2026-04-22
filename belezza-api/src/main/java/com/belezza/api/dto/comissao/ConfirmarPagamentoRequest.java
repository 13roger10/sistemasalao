package com.belezza.api.dto.comissao;

import com.belezza.api.entity.FormaPagamento;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmarPagamentoRequest {

    @NotNull(message = "Forma de pagamento e obrigatoria")
    private FormaPagamento formaPagamento;

    @NotBlank(message = "Referencia da transacao e obrigatoria")
    private String referenciaTransacao;

    private String observacoes;
}
