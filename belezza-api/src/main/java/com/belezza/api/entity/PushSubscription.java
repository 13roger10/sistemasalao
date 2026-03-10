package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Armazena subscricoes de Web Push para notificacoes.
 */
@Entity
@Table(name = "push_subscriptions", indexes = {
    @Index(name = "idx_push_subscriptions_usuario", columnList = "usuario_id"),
    @Index(name = "idx_push_subscriptions_endpoint", columnList = "endpoint_hash")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_push_subscription_endpoint", columnNames = {"endpoint_hash"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String endpoint;

    @Column(name = "endpoint_hash", nullable = false, length = 64)
    private String endpointHash;

    @Column(name = "p256dh_key", nullable = false, columnDefinition = "TEXT")
    private String p256dhKey;

    @Column(name = "auth_key", nullable = false, length = 255)
    private String authKey;

    @Column(length = 100)
    private String userAgent;

    @Column(length = 50)
    private String deviceType;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column
    private LocalDateTime ultimoUsoEm;
}
