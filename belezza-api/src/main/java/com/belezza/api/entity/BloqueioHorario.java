package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Time block for a professional (vacation, day off, etc.).
 */
@Entity
@Table(name = "bloqueios_horario", indexes = {
    @Index(name = "idx_bloqueio_profissional", columnList = "profissional_id"),
    @Index(name = "idx_bloqueio_datas", columnList = "data_inicio, data_fim")
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BloqueioHorario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profissional_id", nullable = false)
    private Profissional profissional;

    @Column(nullable = false)
    private LocalDateTime dataInicio;

    @Column(nullable = false)
    private LocalDateTime dataFim;

    @Column(length = 200)
    private String motivo;

    @Column(nullable = false)
    @Builder.Default
    private boolean recorrente = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
