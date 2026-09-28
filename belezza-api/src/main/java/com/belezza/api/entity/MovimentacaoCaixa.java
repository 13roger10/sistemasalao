package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Movimentação manual de um caixa aberto: sangria, suprimento, despesa, receita avulsa ou
 * estorno de pagamento de caixa já fechado.
 */
@Entity
@Table(name = "movimentacoes_caixa", indexes = {
    @Index(name = "idx_mov_caixa_caixa", columnList = "caixa_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovimentacaoCaixa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "caixa_id", nullable = false)
    private Caixa caixa;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimentacaoCaixa tipo;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    /** Forma do dinheiro movimentado. Sangria e suprimento são sempre em dinheiro. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FormaPagamento forma;

    @Column(nullable = false, length = 300)
    private String descricao;

    @Column(length = 50)
    private String categoria;

    /** Pagamento estornado (apenas para tipo ESTORNO). */
    @Column(name = "pagamento_id")
    private Long pagamentoId;

    @Column(name = "registrado_por_id")
    private Long registradoPorId;

    @Column(name = "registrado_por_nome", length = 150)
    private String registradoPorNome;

    @CreatedDate
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
