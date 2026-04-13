package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Maps a {@link Usuario} to a {@link Salon} with a specific {@link FuncaoStudio} role
 * inside the Social Studio module.
 */
@Entity
@Table(
    name = "membros_studio",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_membro_studio",
        columnNames = {"salon_id", "usuario_id"}
    ),
    indexes = {
        @Index(name = "idx_membro_studio_salon",   columnList = "salon_id"),
        @Index(name = "idx_membro_studio_usuario", columnList = "usuario_id")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembroStudio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private FuncaoStudio funcao = FuncaoStudio.VISUALIZADOR;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime atualizadoEm;
}
