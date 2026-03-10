package com.belezza.api.dto.agendamento;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentoRequest {

    @NotNull(message = "ID do profissional é obrigatório")
    private Long profissionalId;

    /**
     * Single service ID (for backward compatibility).
     * Either servicoId OR servicoIds must be provided, not both.
     */
    private Long servicoId;

    /**
     * Multiple service IDs for appointments with multiple services.
     * Services will be scheduled sequentially in the order provided.
     * Either servicoId OR servicoIds must be provided, not both.
     */
    private List<Long> servicoIds;

    /**
     * Preparation time in minutes between services (default: 0).
     * Only applicable when multiple services are scheduled.
     */
    private Integer tempoPreparacaoEntreServicosMinutos;

    @NotNull(message = "Data e hora são obrigatórios")
    @Future(message = "Data e hora devem ser no futuro")
    private LocalDateTime dataHora;

    @Size(max = 500)
    private String observacoes;

    /**
     * Check if request has multiple services.
     */
    public boolean hasMultipleServices() {
        return servicoIds != null && !servicoIds.isEmpty();
    }

    /**
     * Check if request is valid (has at least one service).
     */
    public boolean isValid() {
        return (servicoId != null && (servicoIds == null || servicoIds.isEmpty()))
            || (servicoIds != null && !servicoIds.isEmpty() && servicoId == null);
    }

    /**
     * Get error message for invalid request.
     */
    public String getValidationError() {
        if (servicoId != null && servicoIds != null && !servicoIds.isEmpty()) {
            return "Forneça apenas servicoId OU servicoIds, não ambos";
        }
        if (servicoId == null && (servicoIds == null || servicoIds.isEmpty())) {
            return "É obrigatório fornecer servicoId ou servicoIds";
        }
        return null;
    }
}
