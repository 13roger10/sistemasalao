package com.belezza.api.dto.fidelidade;

import com.belezza.api.entity.TipoRecompensa;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FidelidadeProgramaRequest {

    @NotBlank(message = "Nome do programa é obrigatório")
    @Size(max = 100, message = "Nome deve ter no máximo 100 caracteres")
    private String nome;

    @Size(max = 1000, message = "Descrição deve ter no máximo 1000 caracteres")
    private String descricao;

    @NotNull(message = "Número de visitas necessárias é obrigatório")
    @Min(value = 1, message = "Visitas necessárias deve ser pelo menos 1")
    @Max(value = 100, message = "Visitas necessárias deve ser no máximo 100")
    private Integer visitasNecessarias;

    @NotNull(message = "Tipo de recompensa é obrigatório")
    private TipoRecompensa recompensaTipo;

    @DecimalMin(value = "0.01", message = "Valor da recompensa deve ser maior que 0")
    private BigDecimal recompensaValor;

    private Long servicoRecompensaId;
}
