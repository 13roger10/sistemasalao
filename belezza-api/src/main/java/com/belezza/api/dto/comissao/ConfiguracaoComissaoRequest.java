package com.belezza.api.dto.comissao;

import com.belezza.api.entity.TipoComissao;
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
public class ConfiguracaoComissaoRequest {

    @NotNull(message = "Tipo de comissao e obrigatorio")
    private TipoComissao tipoComissao;

    @NotNull(message = "Valor da comissao e obrigatorio")
    @DecimalMin(value = "0.01", message = "Valor da comissao deve ser maior que zero")
    private BigDecimal valorComissao;
}
