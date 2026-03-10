package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Commission record for a completed appointment.
 */
@Entity
@Table(name = "comissoes", indexes = {
    @Index(name = "idx_comissoes_salon", columnList = "salon_id"),
    @Index(name = "idx_comissoes_profissional", columnList = "profissional_id"),
    @Index(name = "idx_comissoes_agendamento", columnList = "agendamento_id"),
    @Index(name = "idx_comissoes_status", columnList = "status"),
    @Index(name = "idx_comissoes_pagamento", columnList = "pagamento_profissional_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Comissao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profissional_id", nullable = false)
    private Profissional profissional;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false, unique = true)
    private Agendamento agendamento;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valorServico;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoComissao tipoComissao;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal taxaComissao;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valorComissao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusComissao status = StatusComissao.CALCULADA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pagamento_profissional_id")
    private PagamentoProfissional pagamentoProfissional;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
