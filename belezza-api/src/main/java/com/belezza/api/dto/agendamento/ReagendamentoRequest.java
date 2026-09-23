package com.belezza.api.dto.agendamento;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
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
public class ReagendamentoRequest {

    @NotNull(message = "Nova data e hora são obrigatórios")
    @Future(message = "Nova data e hora devem ser no futuro")
    private LocalDateTime novaDataHora;

    private Long novoProfissionalId;

    // Optional: replaces the appointment's services when provided (e.g. the client changed
    // their service selection while rescheduling). Left null/empty keeps the existing services.
    private List<Long> servicoIds;

    // Optional: updates the client-visible observation. Left null keeps the existing value.
    private String observacoes;
}
