package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Tarefa do salão atribuída a auxiliares ou outros funcionários.
 */
@Entity
@Table(name = "tarefas_salon", indexes = {
    @Index(name = "idx_tarefa_salon", columnList = "salon_id"),
    @Index(name = "idx_tarefa_atribuido", columnList = "atribuido_a_id"),
    @Index(name = "idx_tarefa_status", columnList = "status"),
    @Index(name = "idx_tarefa_data_prevista", columnList = "data_prevista"),
    @Index(name = "idx_tarefa_prioridade", columnList = "prioridade")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaSalon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(length = 1000)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusTarefa status = StatusTarefa.PENDENTE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PrioridadeTarefa prioridade = PrioridadeTarefa.MEDIA;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RecorrenciaTarefa recorrencia = RecorrenciaTarefa.NENHUMA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criado_por_id", nullable = false)
    private Usuario criadoPor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atribuido_a_id")
    private Usuario atribuidoA;

    @Column(nullable = false)
    private LocalDate dataPrevista;

    private LocalTime horaPrevista;

    @Column
    private LocalDateTime dataInicio;

    @Column
    private LocalDateTime dataConclusao;

    @Column(length = 500)
    private String observacoes;

    @Column(length = 100)
    private String categoria;

    @Column(length = 100)
    private String local;

    @Column(nullable = false)
    @Builder.Default
    private int tempoEstimadoMinutos = 30;

    @Column
    private Integer tempoRealMinutos;

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
