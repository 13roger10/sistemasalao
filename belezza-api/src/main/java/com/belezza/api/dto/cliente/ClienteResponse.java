package com.belezza.api.dto.cliente;

import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.FidelidadeCliente;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResponse {

    private Long id;

    @JsonProperty("usuarioId")
    private Long usuarioId;

    // Campos em inglês para compatibilidade com frontend
    private String name;
    private String email;
    private String phone;
    private String whatsapp;
    private LocalDate birthDate;
    private String avatar;

    // Status (active/inactive baseado em ativo e bloqueado)
    private String status;

    // Fidelidade
    private String loyaltyLevel;
    private int loyaltyPoints;
    private int totalVisits;
    private BigDecimal totalSpent;
    private BigDecimal averageTicket;

    // Preferências de comunicação
    private boolean acceptsMarketing;
    private boolean acceptsWhatsApp;
    private boolean acceptsEmail;

    // Observações
    private String notes;

    // Contadores
    private int noShows;

    // IDs
    private Long salonId;
    private Long unitId;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastVisitAt;
    private LocalDateTime firstVisitAt;

    public static ClienteResponse fromEntity(Cliente cliente) {
        return fromEntity(cliente, null, false);
    }

    public static ClienteResponse fromEntity(Cliente cliente, FidelidadeCliente fidelidade) {
        return fromEntity(cliente, fidelidade, false);
    }

    /**
     * Creates a ClienteResponse with restricted data for professionals.
     * Excludes: email, phone, whatsapp, notes (sensitive client data).
     *
     * @param cliente The client entity
     * @return ClienteResponse without sensitive client data
     */
    public static ClienteResponse fromEntityForProfessional(Cliente cliente) {
        return fromEntity(cliente, null, true);
    }

    /**
     * Creates a ClienteResponse with restricted data for professionals.
     * Excludes: email, phone, whatsapp, notes (sensitive client data).
     *
     * @param cliente The client entity
     * @param fidelidade The loyalty data (optional)
     * @return ClienteResponse without sensitive client data
     */
    public static ClienteResponse fromEntityForProfessional(Cliente cliente, FidelidadeCliente fidelidade) {
        return fromEntity(cliente, fidelidade, true);
    }

    /**
     * Internal method that creates ClienteResponse with optional data restriction.
     *
     * @param cliente The client entity
     * @param fidelidade The loyalty data (optional)
     * @param restrictSensitiveData If true, excludes email, phone, whatsapp, and notes
     * @return ClienteResponse
     */
    private static ClienteResponse fromEntity(Cliente cliente, FidelidadeCliente fidelidade, boolean restrictSensitiveData) {
        ClienteResponseBuilder builder = ClienteResponse.builder()
                .id(cliente.getId())
                .usuarioId(cliente.getUsuario().getId())
                .name(cliente.getUsuario().getNome())
                // Restrict sensitive data for professionals
                .email(restrictSensitiveData ? null : cliente.getUsuario().getEmail())
                .phone(restrictSensitiveData ? null : cliente.getUsuario().getTelefone())
                .whatsapp(restrictSensitiveData ? null : cliente.getWhatsapp())
                .birthDate(cliente.getDataNascimento())
                .avatar(cliente.getUsuario().getAvatarUrl())
                .status(cliente.isBloqueado() ? "inactive" : (cliente.isAtivo() ? "active" : "inactive"))
                // Restrict sensitive data for professionals
                .notes(restrictSensitiveData ? null : cliente.getObservacoes())
                .noShows(cliente.getNoShows())
                .totalVisits(cliente.getTotalAgendamentos())
                .totalSpent(cliente.getTotalGasto() != null ? cliente.getTotalGasto() : BigDecimal.ZERO)
                .averageTicket(cliente.getTicketMedio() != null ? cliente.getTicketMedio() : BigDecimal.ZERO)
                .acceptsMarketing(cliente.isAceitaMarketing())
                .acceptsWhatsApp(cliente.isAceitaWhatsApp())
                .acceptsEmail(cliente.isAceitaEmail())
                .salonId(cliente.getSalon().getId())
                .createdAt(cliente.getCriadoEm())
                .updatedAt(cliente.getAtualizadoEm())
                .lastVisitAt(cliente.getUltimaVisita())
                .firstVisitAt(cliente.getPrimeiraVisita());

        // Dados de fidelidade
        if (fidelidade != null) {
            builder.loyaltyLevel(mapNivelToLoyaltyLevel(fidelidade.getNivel().name()))
                   .loyaltyPoints(fidelidade.getPontosNivel());
        } else {
            builder.loyaltyLevel("bronze")
                   .loyaltyPoints(0);
        }

        return builder.build();
    }

    /**
     * Mapeia os níveis do backend (BRONZE/PRATA/OURO) para frontend (bronze/silver/gold)
     */
    private static String mapNivelToLoyaltyLevel(String nivel) {
        return switch (nivel.toUpperCase()) {
            case "PRATA" -> "silver";
            case "OURO" -> "gold";
            default -> "bronze";
        };
    }
}
