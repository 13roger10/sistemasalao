package com.belezza.api.dto.estoque;

import com.belezza.api.entity.Produto;
import com.belezza.api.entity.UnidadeMedida;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProdutoResponse {

    private Long id;
    private String nome;
    private String descricao;
    private String sku;
    private String codigoBarras;
    private String imagemUrl;
    private Long categoriaId;
    private String categoriaNome;
    private Long fornecedorId;
    private String fornecedorNome;
    private Long salonId;
    private int estoqueAtual;
    private int estoqueMinimo;
    private Integer estoqueMaximo;
    private UnidadeMedida unidadeMedida;
    private String unidadeMedidaSigla;
    private BigDecimal precoCusto;
    private BigDecimal precoVenda;
    private boolean vendavel;
    private String statusEstoque;
    private LocalDateTime ultimaCompra;
    private LocalDateTime ultimaMovimentacao;
    private BigDecimal consumoMedioMensal;
    private boolean ativo;
    private LocalDateTime criadoEm;

    public static ProdutoResponse fromEntity(Produto produto) {
        return ProdutoResponse.builder()
                .id(produto.getId())
                .nome(produto.getNome())
                .descricao(produto.getDescricao())
                .sku(produto.getSku())
                .codigoBarras(produto.getCodigoBarras())
                .imagemUrl(produto.getImagemUrl())
                .categoriaId(produto.getCategoria() != null ? produto.getCategoria().getId() : null)
                .categoriaNome(produto.getCategoria() != null ? produto.getCategoria().getNome() : null)
                .fornecedorId(produto.getFornecedor() != null ? produto.getFornecedor().getId() : null)
                .fornecedorNome(produto.getFornecedor() != null ? produto.getFornecedor().getNome() : null)
                .salonId(produto.getSalon().getId())
                .estoqueAtual(produto.getEstoqueAtual())
                .estoqueMinimo(produto.getEstoqueMinimo())
                .estoqueMaximo(produto.getEstoqueMaximo())
                .unidadeMedida(produto.getUnidadeMedida())
                .unidadeMedidaSigla(produto.getUnidadeMedida().getSigla())
                .precoCusto(produto.getPrecoCusto())
                .precoVenda(produto.getPrecoVenda())
                .vendavel(produto.isVendavel())
                .statusEstoque(produto.getStatusEstoque())
                .ultimaCompra(produto.getUltimaCompra())
                .ultimaMovimentacao(produto.getUltimaMovimentacao())
                .consumoMedioMensal(produto.getConsumoMedioMensal())
                .ativo(produto.isAtivo())
                .criadoEm(produto.getCriadoEm())
                .build();
    }
}
