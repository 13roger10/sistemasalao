package com.belezza.api.dto.pagamento;

import com.belezza.api.entity.FormaPagamento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Pagamento de um atendimento. Duas formas de enviar:
 * <ul>
 *   <li>Uma forma só: {@code valor} + {@code forma} (+ {@code valorRecebido} em dinheiro, para troco).
 *       Em dinheiro, um {@code valor} acima do que falta pagar é tratado como valor recebido e gera troco.</li>
 *   <li>Pagamento dividido: {@code partes}, ex.: PIX 50 + dinheiro 50.</li>
 * </ul>
 * A soma das partes precisa ser exatamente o que falta pagar do atendimento.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagamentoRequest {

    @NotNull(message = "ID do agendamento é obrigatório")
    private Long agendamentoId;

    @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
    private BigDecimal valor;

    private FormaPagamento forma;

    /** Em dinheiro: quanto o cliente entregou (para calcular o troco). */
    @DecimalMin(value = "0.01", message = "Valor recebido deve ser maior que zero")
    private BigDecimal valorRecebido;

    /** Pagamento dividido em várias formas. Quando informado, valor/forma são ignorados. */
    @Valid
    private List<Parte> partes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Parte {

        @NotNull(message = "Forma de pagamento é obrigatória")
        private FormaPagamento forma;

        @NotNull(message = "Valor é obrigatório")
        @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
        private BigDecimal valor;

        /** Em dinheiro: quanto o cliente entregou para esta parte. */
        @DecimalMin(value = "0.01", message = "Valor recebido deve ser maior que zero")
        private BigDecimal valorRecebido;
    }
}
