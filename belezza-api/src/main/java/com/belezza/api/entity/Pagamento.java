package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Payment for an appointment.
 */
@Entity
@Table(name = "pagamentos", indexes = {
    @Index(name = "idx_pagamento_agendamento", columnList = "agendamento_id"),
    @Index(name = "idx_pagamento_salon", columnList = "salon_id"),
    @Index(name = "idx_pagamento_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Pagamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false, unique = true)
    private Agendamento agendamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FormaPagamento forma;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusPagamento status = StatusPagamento.PENDENTE;

    @Column(length = 100)
    private String transacaoId;

    private LocalDateTime processadoEm;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
