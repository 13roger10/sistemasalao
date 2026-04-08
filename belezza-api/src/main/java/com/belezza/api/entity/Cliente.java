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
 * Client of a salon. Links a user to a specific salon with client-specific data.
 */
@Entity
@Table(name = "clientes", indexes = {
    @Index(name = "idx_cliente_usuario", columnList = "usuario_id"),
    @Index(name = "idx_cliente_salon", columnList = "salon_id"),
    @Index(name = "idx_cliente_ativo", columnList = "ativo")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_cliente_usuario_salon", columnNames = {"usuario_id", "salon_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    // Dados adicionais do cliente (podem sobrescrever dados do usuário)
    @Column(length = 20)
    private String whatsapp;

    @Column
    private LocalDate dataNascimento;

    // Contadores e estatísticas
    @Column(nullable = false)
    @Builder.Default
    private int noShows = 0;

    @Column(nullable = false)
    @Builder.Default
    private int totalAgendamentos = 0;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal totalGasto = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal ticketMedio = BigDecimal.ZERO;

    // Preferências de comunicação
    @Column(nullable = false)
    @Builder.Default
    private boolean aceitaMarketing = true;

    @Column(name = "aceita_whatsapp", nullable = false)
    @Builder.Default
    private boolean aceitaWhatsApp = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean aceitaEmail = true;

    @Column(length = 500)
    private String observacoes;

    @Column(nullable = false)
    @Builder.Default
    private boolean bloqueado = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    // Timestamps de visitas
    private LocalDateTime ultimaVisita;

    private LocalDateTime primeiraVisita;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
