package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Histórico de progresso de uma meta.
 */
@Entity
@Table(name = "historico_metas", indexes = {
    @Index(name = "idx_hist_meta", columnList = "meta_id"),
    @Index(name = "idx_hist_meta_data", columnList = "data_registro")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricoMeta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meta_id", nullable = false)
    private Meta meta;

    @Column(nullable = false)
    private LocalDate dataRegistro;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal valorAnterior;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal valorNovo;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal variacao;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal percentualProgresso;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
