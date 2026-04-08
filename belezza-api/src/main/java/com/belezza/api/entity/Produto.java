package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Produto do estoque do salão.
 */
@Entity
@Table(name = "produtos", indexes = {
    @Index(name = "idx_produto_salon", columnList = "salon_id"),
    @Index(name = "idx_produto_categoria", columnList = "categoria_id"),
    @Index(name = "idx_produto_fornecedor", columnList = "fornecedor_id"),
    @Index(name = "idx_produto_sku", columnList = "sku"),
    @Index(name = "idx_produto_ativo", columnList = "ativo")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(length = 500)
    private String descricao;

    @Column(length = 50)
    private String sku;

    @Column(length = 50)
    private String codigoBarras;

    @Column(length = 500)
    private String imagemUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id")
    private CategoriaProduto categoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fornecedor_id")
    private Fornecedor fornecedor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Column(nullable = false)
    @Builder.Default
    private int estoqueAtual = 0;

    @Column(nullable = false)
    @Builder.Default
    private int estoqueMinimo = 5;

    private Integer estoqueMaximo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UnidadeMedida unidadeMedida = UnidadeMedida.UNIDADE;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal precoCusto = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal precoVenda;

    @Column(nullable = false)
    @Builder.Default
    private boolean vendavel = false;

    private LocalDateTime ultimaCompra;

    private LocalDateTime ultimaMovimentacao;

    @Column(precision = 10, scale = 2)
    private BigDecimal consumoMedioMensal;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;

    // Verifica status do estoque
    public String getStatusEstoque() {
        if (estoqueAtual <= 0) return "SEM_ESTOQUE";
        if (estoqueAtual <= estoqueMinimo) return "ESTOQUE_BAIXO";
        if (estoqueMaximo != null && estoqueAtual >= estoqueMaximo) return "ESTOQUE_ALTO";
        return "NORMAL";
    }
}
