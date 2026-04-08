package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Meta do salão.
 */
@Entity
@Table(name = "metas", indexes = {
    @Index(name = "idx_meta_salon", columnList = "salon_id"),
    @Index(name = "idx_meta_tipo", columnList = "tipo"),
    @Index(name = "idx_meta_periodo", columnList = "data_inicio, data_fim"),
    @Index(name = "idx_meta_ativo", columnList = "ativo")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Meta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(length = 500)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoMeta tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PeriodoMeta periodo;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal valorMeta;

    @Column(nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal valorAtual = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDate dataInicio;

    @Column(nullable = false)
    private LocalDate dataFim;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profissional_id")
    private Profissional profissional;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criado_por_id", nullable = false)
    private Usuario criadoPor;

    @Column(nullable = false)
    @Builder.Default
    private boolean notificarProgresso = true;

    @Column(nullable = false)
    @Builder.Default
    private int notificarAoAtingir = 80; // Percentual para notificação

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;

    // Calcula o percentual de progresso
    public BigDecimal getPercentualProgresso() {
        if (valorMeta.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return valorAtual.multiply(BigDecimal.valueOf(100)).divide(valorMeta, 2, java.math.RoundingMode.HALF_UP);
    }

    // Verifica se a meta foi atingida
    public boolean isAtingida() {
        return valorAtual.compareTo(valorMeta) >= 0;
    }

    // Verifica se a meta está ativa no período atual
    public boolean isDentroDoPeriodo() {
        LocalDate hoje = LocalDate.now();
        return !hoje.isBefore(dataInicio) && !hoje.isAfter(dataFim);
    }
}
