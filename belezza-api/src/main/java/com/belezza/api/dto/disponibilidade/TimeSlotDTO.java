package com.belezza.api.dto.disponibilidade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Representa um slot de horário disponível ou indisponível.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeSlotDTO {

    /**
     * Horário no formato HH:mm
     */
    private String time;

    /**
     * Se o horário está disponível
     */
    private boolean available;

    /**
     * Motivo da indisponibilidade (se não disponível)
     */
    private String reason;

    public static TimeSlotDTO available(String time) {
        return TimeSlotDTO.builder()
                .time(time)
                .available(true)
                .build();
    }

    public static TimeSlotDTO unavailable(String time, String reason) {
        return TimeSlotDTO.builder()
                .time(time)
                .available(false)
                .reason(reason)
                .build();
    }
}
