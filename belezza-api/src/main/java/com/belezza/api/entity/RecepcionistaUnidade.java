package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Unidade em que uma recepcionista pode trabalhar (ela pode atender várias unidades do mesmo
 * dono). A unidade em uso continua em {@link Usuario#getSalon()}, que é o salão do token.
 */
@Entity
@Table(name = "recepcionista_unidades",
        uniqueConstraints = @UniqueConstraint(name = "uk_recep_unidade", columnNames = {"usuario_id", "salon_id"}),
        indexes = @Index(name = "idx_recep_unidade_usuario", columnList = "usuario_id"))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecepcionistaUnidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
