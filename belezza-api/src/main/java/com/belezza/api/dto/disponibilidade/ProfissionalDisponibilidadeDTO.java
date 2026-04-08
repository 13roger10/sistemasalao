package com.belezza.api.dto.disponibilidade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Disponibilidade de um profissional específico.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfissionalDisponibilidadeDTO {

    /**
     * ID do profissional
     */
    private Long professionalId;

    /**
     * Nome do profissional
     */
    private String professionalName;

    /**
     * URL da foto do profissional
     */
    private String photoUrl;

    /**
     * Lista de slots de horário
     */
    private List<TimeSlotDTO> slots;
}
