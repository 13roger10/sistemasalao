package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Caixa do salão: abertura com saldo inicial, pagamentos e movimentações enquanto aberto, e
 * fechamento com conferência do dinheiro. No fechamento os totais são congelados nas colunas
 * total_*, para o histórico não mudar depois (ex.: estorno posterior entra no caixa seguinte).
 */
@Entity
@Table(name = "caixas", indexes = {
    @Index(name = "idx_caixa_salon_aberto_em", columnList = "salon_id, aberto_em")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Caixa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusCaixa status;

    // --- Abertura ---
    @Column(name = "aberto_por_id")
    private Long abertoPorId;

    @Column(name = "aberto_por_nome", length = 150)
    private String abertoPorNome;

    @Column(name = "aberto_em", nullable = false)
    private LocalDateTime abertoEm;

    @Column(name = "saldo_inicial", nullable = false, precision = 10, scale = 2)
    private BigDecimal saldoInicial;

    @Column(name = "observacoes_abertura", length = 500)
    private String observacoesAbertura;

    // --- Fechamento ---
    @Column(name = "fechado_por_id")
    private Long fechadoPorId;

    @Column(name = "fechado_por_nome", length = 150)
    private String fechadoPorNome;

    @Column(name = "fechado_em")
    private LocalDateTime fechadoEm;

    /** Dinheiro contado na gaveta no fechamento. */
    @Column(name = "saldo_informado", precision = 10, scale = 2)
    private BigDecimal saldoInformado;

    /** Dinheiro que deveria estar na gaveta, calculado pelo sistema. */
    @Column(name = "saldo_esperado", precision = 10, scale = 2)
    private BigDecimal saldoEsperado;

    /** saldoInformado - saldoEsperado (negativo = falta dinheiro). */
    @Column(precision = 10, scale = 2)
    private BigDecimal diferenca;

    @Column(name = "observacoes_fechamento", length = 500)
    private String observacoesFechamento;

    // --- Totais congelados no fechamento ---
    @Column(name = "total_entradas", precision = 10, scale = 2)
    private BigDecimal totalEntradas;

    @Column(name = "total_dinheiro", precision = 10, scale = 2)
    private BigDecimal totalDinheiro;

    @Column(name = "total_pix", precision = 10, scale = 2)
    private BigDecimal totalPix;

    @Column(name = "total_credito", precision = 10, scale = 2)
    private BigDecimal totalCredito;

    @Column(name = "total_debito", precision = 10, scale = 2)
    private BigDecimal totalDebito;

    @Column(name = "total_vale", precision = 10, scale = 2)
    private BigDecimal totalVale;

    @Column(name = "total_despesas", precision = 10, scale = 2)
    private BigDecimal totalDespesas;

    @Column(name = "total_sangrias", precision = 10, scale = 2)
    private BigDecimal totalSangrias;

    @Column(name = "total_suprimentos", precision = 10, scale = 2)
    private BigDecimal totalSuprimentos;

    @CreatedDate
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    public boolean isAberto() {
        return status == StatusCaixa.ABERTO;
    }
}
