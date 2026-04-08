package com.belezza.api.dto.tarefa;

import com.belezza.api.entity.PrioridadeTarefa;
import com.belezza.api.entity.RecorrenciaTarefa;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaRequest {

    @NotBlank(message = "Título é obrigatório")
    @Size(max = 200, message = "Título deve ter no máximo 200 caracteres")
    private String titulo;

    @Size(max = 1000, message = "Descrição deve ter no máximo 1000 caracteres")
    private String descricao;

    private PrioridadeTarefa prioridade;

    @Builder.Default
    private RecorrenciaTarefa recorrencia = RecorrenciaTarefa.NENHUMA;

    private Long atribuidoAId;

    @NotNull(message = "Data prevista é obrigatória")
    private LocalDate dataPrevista;

    private LocalTime horaPrevista;

    @Size(max = 500, message = "Observações deve ter no máximo 500 caracteres")
    private String observacoes;

    @Size(max = 100, message = "Categoria deve ter no máximo 100 caracteres")
    private String categoria;

    @Size(max = 100, message = "Local deve ter no máximo 100 caracteres")
    private String local;

    @Builder.Default
    private int tempoEstimadoMinutos = 30;
}
