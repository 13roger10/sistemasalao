package com.belezza.api.dto.disponibilidade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Response com a disponibilidade de horários.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisponibilidadeResponse {

    /**
     * Data consultada
     */
    private LocalDate date;

    /**
     * Duração total dos serviços selecionados em minutos
     */
    private int totalDurationMinutes;

    /**
     * Intervalo entre slots em minutos
     */
    private int slotIntervalMinutes;

    /**
     * Disponibilidade por profissional
     */
    private List<ProfissionalDisponibilidadeDTO> professionals;
}
