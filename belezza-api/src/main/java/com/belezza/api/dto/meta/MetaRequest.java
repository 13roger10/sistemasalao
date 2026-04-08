package com.belezza.api.dto.meta;

import com.belezza.api.entity.PeriodoMeta;
import com.belezza.api.entity.TipoMeta;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres")
    private String nome;

    @Size(max = 500)
    private String descricao;

    @NotNull(message = "Tipo é obrigatório")
    private TipoMeta tipo;

    @NotNull(message = "Período é obrigatório")
    private PeriodoMeta periodo;

    @NotNull(message = "Valor da meta é obrigatório")
    @DecimalMin(value = "0.01", message = "Valor da meta deve ser maior que zero")
    private BigDecimal valorMeta;

    @NotNull(message = "Data de início é obrigatória")
    private LocalDate dataInicio;

    @NotNull(message = "Data de fim é obrigatória")
    private LocalDate dataFim;

    private Long profissionalId;

    @Builder.Default
    private boolean notificarProgresso = true;

    @Min(value = 1, message = "Percentual deve ser entre 1 e 100")
    @Max(value = 100, message = "Percentual deve ser entre 1 e 100")
    @Builder.Default
    private int notificarAoAtingir = 80;
}
