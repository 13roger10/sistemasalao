package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Programa de fidelidade de um salao.
 * Ex: "10 cortes = 1 gratis"
 */
@Entity
@Table(name = "fidelidade_programas", indexes = {
    @Index(name = "idx_fidelidade_programas_salon", columnList = "salon_id"),
    @Index(name = "idx_fidelidade_programas_ativo", columnList = "ativo")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_fidelidade_programa_salon", columnNames = {"salon_id", "nome"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FidelidadePrograma {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(nullable = false)
    @Builder.Default
    private int visitasNecessarias = 10;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TipoRecompensa recompensaTipo = TipoRecompensa.SERVICO_GRATIS;

    @Column(precision = 10, scale = 2)
    private BigDecimal recompensaValor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servico_recompensa_id")
    private Servico servicoRecompensa;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
