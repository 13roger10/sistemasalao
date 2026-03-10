package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Social media account connected to a salon (Instagram, Facebook).
 */
@Entity
@Table(name = "contas_sociais", indexes = {
    @Index(name = "idx_conta_social_salon", columnList = "salon_id"),
    @Index(name = "idx_conta_social_plataforma", columnList = "plataforma")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_conta_social_salon_plataforma_account",
        columnNames = {"salon_id", "plataforma", "account_id"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContaSocial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlataformaSocial plataforma;

    @Column(nullable = false, length = 100)
    private String accountId;

    @Column(length = 150)
    private String accountName;

    @Column(length = 500)
    private String accountImageUrl;

    @Column(nullable = false, length = 1000)
    private String accessToken;

    @Column(length = 1000)
    private String refreshToken;

    private LocalDateTime tokenExpira;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativa = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
