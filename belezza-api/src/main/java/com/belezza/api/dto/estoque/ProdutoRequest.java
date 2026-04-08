package com.belezza.api.dto.estoque;

import com.belezza.api.entity.UnidadeMedida;
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
public class ProdutoRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres")
    private String nome;

    @Size(max = 500)
    private String descricao;

    @Size(max = 50)
    private String sku;

    @Size(max = 50)
    private String codigoBarras;

    private String imagemUrl;

    private Long categoriaId;

    private Long fornecedorId;

    @NotNull(message = "Estoque atual é obrigatório")
    @Min(value = 0, message = "Estoque atual deve ser maior ou igual a zero")
    private Integer estoqueAtual;

    @NotNull(message = "Estoque mínimo é obrigatório")
    @Min(value = 0, message = "Estoque mínimo deve ser maior ou igual a zero")
    private Integer estoqueMinimo;

    @Min(value = 0)
    private Integer estoqueMaximo;

    @Builder.Default
    private UnidadeMedida unidadeMedida = UnidadeMedida.UNIDADE;

    @NotNull(message = "Preço de custo é obrigatório")
    @DecimalMin(value = "0.0", message = "Preço de custo deve ser positivo")
    private BigDecimal precoCusto;

    @DecimalMin(value = "0.0")
    private BigDecimal precoVenda;

    @Builder.Default
    private boolean vendavel = false;
}
