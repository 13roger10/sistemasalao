package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Per-day operating hours configured by the salon administrator.
 * This is the master schedule config. Each salon has 7 records (one per day of week).
 * When ativo=false the salon is closed on that day and no slots are generated.
 */
@Entity
@Table(name = "horarios_funcionamento_salon", uniqueConstraints = {
    @UniqueConstraint(name = "uk_hfs_salon_dia", columnNames = {"salon_id", "dia_semana"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HorarioFuncionamentoSalon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    private Salon salon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DiaSemana diaSemana;

    /** Null when the salon is closed on this day */
    @Column
    private LocalTime horaInicio;

    /** Null when the salon is closed on this day */
    @Column
    private LocalTime horaFim;

    /** false = salon is closed on this day */
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
