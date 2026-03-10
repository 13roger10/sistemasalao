package com.belezza.api.dto.metricas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Filter DTO for specifying a period for metrics queries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeriodoFilter {

    /**
     * Start date of the period (inclusive)
     */
    private LocalDate dataInicio;

    /**
     * End date of the period (inclusive)
     */
    private LocalDate dataFim;

    /**
     * Helper method to create a monthly period
     */
    public static PeriodoFilter forMonth(int year, int month) {
        LocalDate inicio = LocalDate.of(year, month, 1);
        LocalDate fim = inicio.withDayOfMonth(inicio.lengthOfMonth());
        return PeriodoFilter.builder()
                .dataInicio(inicio)
                .dataFim(fim)
                .build();
    }

    /**
     * Helper method to create current month period
     */
    public static PeriodoFilter currentMonth() {
        LocalDate now = LocalDate.now();
        return forMonth(now.getYear(), now.getMonthValue());
    }

    /**
     * Helper method to create last 30 days period
     */
    public static PeriodoFilter last30Days() {
        LocalDate fim = LocalDate.now();
        LocalDate inicio = fim.minusDays(30);
        return PeriodoFilter.builder()
                .dataInicio(inicio)
                .dataFim(fim)
                .build();
    }

    /**
     * Get period identifier for display (e.g., "2024-01")
     */
    public String getPeriodoIdentifier() {
        if (dataInicio == null) {
            return "all-time";
        }

        // If same month, return YYYY-MM format
        if (dataInicio.getYear() == dataFim.getYear() &&
            dataInicio.getMonth() == dataFim.getMonth()) {
            return String.format("%d-%02d", dataInicio.getYear(), dataInicio.getMonthValue());
        }

        // Otherwise return date range
        return dataInicio + "_to_" + dataFim;
    }
}
