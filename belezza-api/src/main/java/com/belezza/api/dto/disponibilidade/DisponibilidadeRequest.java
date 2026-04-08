package com.belezza.api.dto.disponibilidade;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Request para consulta de disponibilidade de horários.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisponibilidadeRequest {

    /**
     * ID do profissional (opcional - se não informado, retorna todos os profissionais do salão)
     */
    private Long profissionalId;

    /**
     * Lista de IDs dos serviços selecionados (para calcular duração total)
     */
    @NotNull(message = "Pelo menos um serviço deve ser selecionado")
    private List<Long> servicoIds;

    /**
     * Data para verificar disponibilidade
     */
    @NotNull(message = "Data é obrigatória")
    private LocalDate data;

    /**
     * ID do salão/unidade
     */
    @NotNull(message = "ID do salão é obrigatório")
    private Long salonId;

    /**
     * Intervalo entre slots em minutos (padrão: usa configuração do salão)
     */
    private Integer intervaloMinutos;
}
