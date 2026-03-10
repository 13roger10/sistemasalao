package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Association entity between Agendamento and Servico.
 * Supports multiple services in a single appointment.
 */
@Entity
@Table(name = "agendamento_servicos", indexes = {
    @Index(name = "idx_agendamento_servico_agendamento", columnList = "agendamento_id"),
    @Index(name = "idx_agendamento_servico_servico", columnList = "servico_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_agendamento_servico_ordem",
                      columnNames = {"agendamento_id", "ordem"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentoServico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false)
    private Agendamento agendamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servico_id", nullable = false)
    private Servico servico;

    /**
     * Order of service execution within the appointment (1, 2, 3, ...).
     * Used to calculate total duration and schedule services sequentially.
     */
    @Column(nullable = false)
    private Integer ordem;

    /**
     * Planned duration in minutes for this specific service.
     * Allows override of default service duration if needed.
     */
    @Column(name = "duracao_prevista_minutos", nullable = false)
    private Integer duracaoPrevistaMinutos;

    /**
     * Preparation time before this service starts (in minutes).
     * Useful for cleanup, setup, or breaks between services.
     */
    @Column(name = "tempo_preparacao_minutos")
    @Builder.Default
    private Integer tempoPreparacaoMinutos = 0;
}
