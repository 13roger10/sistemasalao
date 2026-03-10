package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

/**
 * Work schedule for a professional (e.g., Monday 9:00-18:00).
 */
@Entity
@Table(name = "horarios_trabalho", indexes = {
    @Index(name = "idx_horario_profissional", columnList = "profissional_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_horario_profissional_dia", columnNames = {"profissional_id", "dia_semana"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HorarioTrabalho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profissional_id", nullable = false)
    private Profissional profissional;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DiaSemana diaSemana;

    @Column(nullable = false)
    private LocalTime horaInicio;

    @Column(nullable = false)
    private LocalTime horaFim;

    @Column(nullable = false)
    private LocalTime intervaloInicio;

    @Column(nullable = false)
    private LocalTime intervaloFim;

    @Column(nullable = false)
    @Builder.Default
    private boolean ativo = true;
}
