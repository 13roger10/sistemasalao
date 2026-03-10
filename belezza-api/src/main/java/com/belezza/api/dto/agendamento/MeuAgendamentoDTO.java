package com.belezza.api.dto.agendamento;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.AgendamentoServico;
import com.belezza.api.entity.StatusAgendamento;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * DTO for client's appointment in the expected frontend format.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeuAgendamentoDTO {

    private String id;
    private String clientId;
    private String professionalId;
    private String unitId;
    private String date;
    private String startTime;
    private String endTime;
    private String status;
    private String source;
    private boolean isPaid;
    private BigDecimal totalPrice;
    private BigDecimal finalPrice;
    private int totalDurationMinutes;
    private BigDecimal commissionTotal;
    private boolean commissionPaid;
    private List<ServiceItemDTO> services;
    private ProfessionalDTO professional;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceItemDTO {
        private String serviceId;
        private BigDecimal price;
        private int durationMinutes;
        private ServiceDetailDTO service;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceDetailDTO {
        private String id;
        private String name;
        private BigDecimal price;
        private int durationMinutes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfessionalDTO {
        private String id;
        private String name;
        private String avatar;
    }

    /**
     * Maps StatusAgendamento to frontend-compatible status string.
     */
    private static String mapStatus(StatusAgendamento status) {
        return switch (status) {
            case PENDENTE -> "pending";
            case CONFIRMADO -> "confirmed";
            case EM_ANDAMENTO -> "in_progress";
            case CONCLUIDO -> "completed";
            case CANCELADO -> "canceled";
            case NO_SHOW -> "no_show";
        };
    }

    /**
     * Creates DTO from Agendamento entity.
     */
    public static MeuAgendamentoDTO fromEntity(Agendamento a) {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

        // Build services list
        List<ServiceItemDTO> serviceItems = new ArrayList<>();

        if (a.getServicos() != null && !a.getServicos().isEmpty()) {
            // Multiple services (new approach)
            serviceItems = a.getServicos().stream()
                .map(as -> ServiceItemDTO.builder()
                    .serviceId(as.getServico().getId().toString())
                    .price(as.getServico().getPreco())
                    .durationMinutes(as.getDuracaoPrevistaMinutos())
                    .service(ServiceDetailDTO.builder()
                        .id(as.getServico().getId().toString())
                        .name(as.getServico().getNome())
                        .price(as.getServico().getPreco())
                        .durationMinutes(as.getDuracaoPrevistaMinutos())
                        .build())
                    .build())
                .collect(Collectors.toList());
        } else if (a.getServico() != null) {
            // Single service (legacy)
            serviceItems.add(ServiceItemDTO.builder()
                .serviceId(a.getServico().getId().toString())
                .price(a.getServico().getPreco())
                .durationMinutes(a.getServico().getDuracaoMinutos())
                .service(ServiceDetailDTO.builder()
                    .id(a.getServico().getId().toString())
                    .name(a.getServico().getNome())
                    .price(a.getServico().getPreco())
                    .durationMinutes(a.getServico().getDuracaoMinutos())
                    .build())
                .build());
        }

        // Build professional info
        ProfessionalDTO professionalDTO = null;
        if (a.getProfissional() != null) {
            String profName = a.getProfissional().getUsuario() != null
                ? a.getProfissional().getUsuario().getNome()
                : "Profissional";
            String avatar = a.getProfissional().getFotoUrl();

            professionalDTO = ProfessionalDTO.builder()
                .id(a.getProfissional().getId().toString())
                .name(profName)
                .avatar(avatar)
                .build();
        }

        return MeuAgendamentoDTO.builder()
            .id(a.getId().toString())
            .clientId(a.getCliente().getId().toString())
            .professionalId(a.getProfissional().getId().toString())
            .unitId(a.getSalon().getId().toString())
            .date(a.getDataHora().format(dateFormatter))
            .startTime(a.getDataHora().format(timeFormatter))
            .endTime(a.getFimPrevisto() != null ? a.getFimPrevisto().format(timeFormatter) : null)
            .status(mapStatus(a.getStatus()))
            .source("online")
            .isPaid(false) // TODO: integrate with payment when available
            .totalPrice(a.getValorCobrado())
            .finalPrice(a.getValorCobrado())
            .totalDurationMinutes(a.getDuracaoTotalMinutos())
            .commissionTotal(BigDecimal.ZERO) // TODO: integrate with commission
            .commissionPaid(false)
            .services(serviceItems)
            .professional(professionalDTO)
            .createdAt(a.getCriadoEm())
            .updatedAt(a.getAtualizadoEm())
            .build();
    }
}
