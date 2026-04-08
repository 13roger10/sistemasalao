package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Registro de movimentação de estoque.
 */
@Entity
@Table(name = "movimentacoes_estoque", indexes = {
    @Index(name = "idx_mov_produto", columnList = "produto_id"),
    @Index(name = "idx_mov_tipo", columnList = "tipo"),
    @Index(name = "idx_mov_data", columnList = "criado_em"),
    @Index(name = "idx_mov_salon", columnList = "salon_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovimentacaoEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimentacao tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MotivoMovimentacao motivo;

    @Column(nullable = false)
    private int quantidade;

    @Column(nullable = false)
    private int estoqueAnterior;

    @Column(nullable = false)
    private int estoqueNovo;

    @Column(precision = 10, scale = 2)
    private BigDecimal custoUnitario;

    @Column(precision = 10, scale = 2)
    private BigDecimal custoTotal;

    private Long agendamentoId;

    private Long compraId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(length = 500)
    private String observacoes;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
