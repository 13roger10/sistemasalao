package com.belezza.api.dto.servico;

import com.belezza.api.entity.TipoServico;
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
public class ServicoRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres")
    private String nome;

    @Size(max = 500)
    private String descricao;

    @NotNull(message = "Preço é obrigatório")
    @DecimalMin(value = "0.0", message = "Preço deve ser positivo")
    private BigDecimal preco;

    @NotNull(message = "Duração é obrigatória")
    @Min(value = 1, message = "Duração mínima é 1 minuto")
    private Integer duracaoMinutos;

    @NotNull(message = "Tipo é obrigatório")
    private TipoServico tipo;
}
