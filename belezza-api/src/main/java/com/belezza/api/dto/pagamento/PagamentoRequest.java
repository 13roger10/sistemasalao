package com.belezza.api.dto.pagamento;

import com.belezza.api.entity.FormaPagamento;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagamentoRequest {

    @NotNull(message = "ID do agendamento é obrigatório")
    private Long agendamentoId;

    @NotNull(message = "Valor é obrigatório")
    @DecimalMin(value = "0.0", message = "Valor deve ser positivo")
    private BigDecimal valor;

    @NotNull(message = "Forma de pagamento é obrigatória")
    private FormaPagamento forma;
}
