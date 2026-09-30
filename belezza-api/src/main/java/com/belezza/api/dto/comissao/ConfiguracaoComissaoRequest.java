package com.belezza.api.dto.comissao;

import com.belezza.api.entity.TipoComissao;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
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

    /** Porcentagem acima de 100% pagaria ao profissional mais do que o atendimento rendeu (BUG-032). */
    @JsonIgnore
    @AssertTrue(message = "Comissao em porcentagem deve ser de no maximo 100%")
    public boolean isPorcentagemAte100() {
        return tipoComissao != TipoComissao.PORCENTAGEM || valorComissao == null
                || valorComissao.compareTo(BigDecimal.valueOf(100)) <= 0;
    }
}
