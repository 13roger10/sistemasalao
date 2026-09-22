package com.belezza.api.dto.cliente;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Histórico de atendimentos e gastos de um cliente, montado a partir dos
 * agendamentos e pagamentos reais associados a ele.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteHistoryResponse {

    private List<AppointmentHistoryDTO> appointments;
    private int totalAppointments;
    private BigDecimal totalSpent;
    private List<FavoriteServiceDTO> favoriteServices;
    private FavoriteProfessionalDTO favoriteProfessional;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AppointmentHistoryDTO {
        private Long id;
        private LocalDateTime date;
        private List<String> services;
        private String professional;
        private BigDecimal total;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FavoriteServiceDTO {
        private Long serviceId;
        private String serviceName;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FavoriteProfessionalDTO {
        private Long professionalId;
        private String professionalName;
        private long count;
    }
}
