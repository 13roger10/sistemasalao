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
    // A coluna é numeric(10,2): antes 10.999 era aceito e 1e12 estourava no banco como 409 (BUG-031)
    @Digits(integer = 8, fraction = 2, message = "Preço deve ter no máximo 2 casas decimais e ser menor que R$ 100.000.000")
    private BigDecimal preco;

    @NotNull(message = "Duração é obrigatória")
    @Min(value = 1, message = "Duração mínima é 1 minuto")
    @Max(value = 720, message = "Duração máxima é 720 minutos (12 horas)")
    private Integer duracaoMinutos;

    @NotNull(message = "Tipo é obrigatório")
    private TipoServico tipo;
}
