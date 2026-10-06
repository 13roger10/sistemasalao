package com.belezza.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Feriado ou data especial do salão (BUG-008: antes não eram gravados).
 *
 * <p>Num feriado o salão fica fechado, a menos que {@code aberto} com horário próprio. Numa data
 * especial, {@code tipo} "closed" fecha o dia e "special_hours"/"extended" trocam o horário do dia.
 * Um feriado {@code recorrente} vale todo ano no mesmo dia e mês.
 */
@Entity
@Table(name = "datas_especiais_salao")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataEspecialSalon {

    public static final String FERIADO = "FERIADO";
    public static final String ESPECIAL = "ESPECIAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "salon_id", nullable = false)
    private Long salonId;

    @Column(nullable = false)
    private LocalDate data;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, length = 20)
    private String categoria;

    @Column(length = 20)
    private String tipo;

    @Column(nullable = false)
    private boolean aberto;

    @Column(name = "hora_inicio")
    private LocalTime horaInicio;

    @Column(name = "hora_fim")
    private LocalTime horaFim;

    @Column(nullable = false)
    private boolean recorrente;

    @Builder.Default
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    /** Vale nesta data: a própria data, ou o mesmo dia e mês quando recorrente. */
    public boolean valeEm(LocalDate dia) {
        return data.equals(dia)
                || (recorrente && data.getMonthValue() == dia.getMonthValue() && data.getDayOfMonth() == dia.getDayOfMonth());
    }

    /** Fecha o dia inteiro. */
    public boolean fechaODia() {
        return FERIADO.equals(categoria) ? !aberto : "closed".equals(tipo);
    }
}
