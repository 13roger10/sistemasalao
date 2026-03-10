package com.belezza.api.dto.agendamento;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Paginated response for client's own appointments.
 * Format compatible with frontend expectations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeusAgendamentosResponse {

    private List<MeuAgendamentoDTO> items;

    /**
     * Alias for items (backward compatibility).
     */
    private List<MeuAgendamentoDTO> data;

    private Meta meta;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Meta {
        private long total;
        private int page;
        private int limit;
        private int totalPages;
        private boolean hasNextPage;
        private boolean hasPrevPage;
    }
}
