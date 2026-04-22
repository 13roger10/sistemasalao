package com.belezza.api.dto.comissao;

import com.belezza.api.entity.FormaPagamento;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConfirmarRecebimentoRequest {

    @NotBlank(message = "Senha obrigatória")
    private String senha;

    @NotNull(message = "Forma de pagamento obrigatória")
    private FormaPagamento formaPagamento;
}
