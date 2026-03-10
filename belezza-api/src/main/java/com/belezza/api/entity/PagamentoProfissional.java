package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Consolidated payment record for professional commissions.
 */
@Entity
@Table(name = "pagamentos_profissional", indexes = {
    @Index(name = "idx_pagamentos_prof_salon", columnList = "salon_id"),
    @Index(name = "idx_pagamentos_prof_profissional", columnList = "profissional_id"),
    @Index(name = "idx_pagamentos_prof_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagamentoProfissional {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profissional_id", nullable = false)
    private Profissional profissional;

    @Column(nullable = false)
    private LocalDate periodoInicio;

    @Column(nullable = false)
    private LocalDate periodoFim;

    @Column(nullable = false)
    @Builder.Default
    private int totalServicos = 0;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal valorTotalServicos = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal valorTotalComissoes = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusPagamentoProfissional status = StatusPagamentoProfissional.PENDENTE;

    @Column(length = 500)
    private String observacoes;

    @Column(length = 100)
    private String referenciaTransacao;

    private LocalDateTime pagoEm;

    @OneToMany(mappedBy = "pagamentoProfissional", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Comissao> comissoes = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
