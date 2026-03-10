package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Armazena notificacoes do sistema para usuarios.
 */
@Entity
@Table(name = "notificacoes", indexes = {
    @Index(name = "idx_notificacoes_usuario", columnList = "usuario_id"),
    @Index(name = "idx_notificacoes_lida", columnList = "lida"),
    @Index(name = "idx_notificacoes_tipo", columnList = "tipo"),
    @Index(name = "idx_notificacoes_data", columnList = "criado_em")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notificacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TipoNotificacao tipo;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensagem;

    @Column(length = 500)
    private String link;

    @Column(length = 100)
    private String icone;

    @Column(nullable = false)
    @Builder.Default
    private boolean lida = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean enviada = false;

    @Column(name = "agendamento_id")
    private Long agendamentoId;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column
    private LocalDateTime lidaEm;

    @Column
    private LocalDateTime enviadaEm;
}
