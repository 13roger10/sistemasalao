package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Histórico de alterações de uma tarefa.
 */
@Entity
@Table(name = "tarefas_historico", indexes = {
    @Index(name = "idx_tarefa_hist_tarefa", columnList = "tarefa_id"),
    @Index(name = "idx_tarefa_hist_usuario", columnList = "usuario_id"),
    @Index(name = "idx_tarefa_hist_data", columnList = "criado_em")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tarefa_id", nullable = false)
    private TarefaSalon tarefa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 50)
    private String acao;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private StatusTarefa statusAnterior;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private StatusTarefa statusNovo;

    @Column(length = 500)
    private String descricao;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
