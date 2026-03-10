package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Appointment entity linking a client, professional, and service(s).
 * Supports both single service (legacy) and multiple services per appointment.
 */
@Entity
@Table(name = "agendamentos", indexes = {
    @Index(name = "idx_agendamento_cliente", columnList = "cliente_id"),
    @Index(name = "idx_agendamento_profissional", columnList = "profissional_id"),
    @Index(name = "idx_agendamento_servico", columnList = "servico_id"),
    @Index(name = "idx_agendamento_salon", columnList = "salon_id"),
    @Index(name = "idx_agendamento_status", columnList = "status"),
    @Index(name = "idx_agendamento_data_hora", columnList = "data_hora"),
    @Index(name = "idx_agendamento_token", columnList = "token_confirmacao")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Agendamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profissional_id", nullable = false)
    private Profissional profissional;

    /**
     * Single service (legacy field for backward compatibility).
     * @deprecated Use {@link #servicos} for multiple services support
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servico_id")
    @Deprecated
    private Servico servico;

    /**
     * List of services for this appointment.
     * Supports multiple services scheduled sequentially.
     */
    @OneToMany(mappedBy = "agendamento", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem ASC")
    @Builder.Default
    private List<AgendamentoServico> servicos = new ArrayList<>();

    @Column(nullable = false)
    private LocalDateTime dataHora;

    @Column(nullable = false)
    private LocalDateTime fimPrevisto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusAgendamento status = StatusAgendamento.PENDENTE;

    @Column(length = 500)
    private String observacoes;

    @Column(length = 300)
    private String motivoCancelamento;

    @Column(precision = 10, scale = 2)
    private BigDecimal valorCobrado;

    @Column(length = 100, unique = true)
    private String tokenConfirmacao;

    @Column(nullable = false)
    @Builder.Default
    private boolean lembreteEnviado24h = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean lembreteEnviado2h = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;

    // Helper methods for managing services

    /**
     * Add a service to this appointment.
     * Automatically assigns the next order number.
     */
    public void addServico(Servico servico, Integer duracaoMinutos, Integer tempoPreparacao) {
        AgendamentoServico as = AgendamentoServico.builder()
            .agendamento(this)
            .servico(servico)
            .ordem(this.servicos.size() + 1)
            .duracaoPrevistaMinutos(duracaoMinutos != null ? duracaoMinutos : servico.getDuracaoMinutos())
            .tempoPreparacaoMinutos(tempoPreparacao != null ? tempoPreparacao : 0)
            .build();
        this.servicos.add(as);
    }

    /**
     * Get total duration in minutes including all services and preparation time.
     */
    public int getDuracaoTotalMinutos() {
        if (servicos == null || servicos.isEmpty()) {
            // Fallback to single service (legacy)
            return servico != null ? servico.getDuracaoMinutos() : 0;
        }
        return servicos.stream()
            .mapToInt(as -> as.getDuracaoPrevistaMinutos() + as.getTempoPreparacaoMinutos())
            .sum();
    }

    /**
     * Check if this appointment has multiple services.
     */
    public boolean hasMultipleServices() {
        return servicos != null && servicos.size() > 1;
    }
}
