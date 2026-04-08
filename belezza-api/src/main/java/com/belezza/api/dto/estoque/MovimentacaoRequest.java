package com.belezza.api.dto.estoque;

import com.belezza.api.entity.MotivoMovimentacao;
import com.belezza.api.entity.TipoMovimentacao;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovimentacaoRequest {

    @NotNull(message = "Produto é obrigatório")
    private Long produtoId;

    @NotNull(message = "Tipo é obrigatório")
    private TipoMovimentacao tipo;

    @NotNull(message = "Motivo é obrigatório")
    private MotivoMovimentacao motivo;

    @NotNull(message = "Quantidade é obrigatória")
    @Min(value = 1, message = "Quantidade deve ser maior que zero")
    private Integer quantidade;

    private BigDecimal custoUnitario;

    @Size(max = 500)
    private String observacoes;
}
