package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Audit log entity for tracking changes to entities.
 * Records who did what, when, and from where.
 */
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_usuario", columnList = "usuario_id"),
    @Index(name = "idx_audit_entidade", columnList = "entidade, entidade_id"),
    @Index(name = "idx_audit_acao", columnList = "acao"),
    @Index(name = "idx_audit_criado_em", columnList = "criado_em")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Action performed (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
     */
    @Column(nullable = false, length = 50)
    private String acao;

    /**
     * Entity type that was modified (e.g., "Agendamento", "Usuario", "Post")
     */
    @Column(nullable = false, length = 100)
    private String entidade;

    /**
     * ID of the entity that was modified
     */
    @Column(nullable = false)
    private Long entidadeId;

    /**
     * ID of the user who performed the action
     */
    @Column(name = "usuario_id")
    private Long usuarioId;

    /**
     * Name of the user who performed the action (for display)
     */
    @Column(length = 150)
    private String usuarioNome;

    /**
     * IP address from which the action was performed
     */
    @Column(length = 45) // IPv6 max length
    private String ipAddress;

    /**
     * User agent string (browser/app information)
     */
    @Column(length = 500)
    private String userAgent;

    /**
     * Old data (JSON format) - state before the change
     */
    @Column(columnDefinition = "TEXT")
    private String dadosAntigos;

    /**
     * New data (JSON format) - state after the change
     */
    @Column(columnDefinition = "TEXT")
    private String dadosNovos;

    /**
     * Additional details or notes about the action
     */
    @Column(length = 500)
    private String detalhes;

    /**
     * Whether the action was successful
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean sucesso = true;

    /**
     * Error message if action failed
     */
    @Column(length = 500)
    private String mensagemErro;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
