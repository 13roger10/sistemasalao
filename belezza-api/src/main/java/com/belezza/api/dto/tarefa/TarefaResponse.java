package com.belezza.api.dto.tarefa;

import com.belezza.api.entity.PrioridadeTarefa;
import com.belezza.api.entity.RecorrenciaTarefa;
import com.belezza.api.entity.StatusTarefa;
import com.belezza.api.entity.TarefaSalon;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarefaResponse {

    private Long id;
    private String titulo;
    private String descricao;
    private StatusTarefa status;
    private String statusDescricao;
    private PrioridadeTarefa prioridade;
    private String prioridadeDescricao;
    private RecorrenciaTarefa recorrencia;
    private String recorrenciaDescricao;
    private Long salonId;
    private Long criadoPorId;
    private String criadoPorNome;
    private Long atribuidoAId;
    private String atribuidoANome;
    private LocalDate dataPrevista;
    private LocalTime horaPrevista;
    private LocalDateTime dataInicio;
    private LocalDateTime dataConclusao;
    private String observacoes;
    private String categoria;
    private String local;
    private int tempoEstimadoMinutos;
    private Integer tempoRealMinutos;
    private boolean atrasada;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    public static TarefaResponse fromEntity(TarefaSalon tarefa) {
        LocalDate hoje = LocalDate.now();
        boolean atrasada = tarefa.getDataPrevista().isBefore(hoje)
            && tarefa.getStatus() != StatusTarefa.CONCLUIDA
            && tarefa.getStatus() != StatusTarefa.CANCELADA;

        return TarefaResponse.builder()
                .id(tarefa.getId())
                .titulo(tarefa.getTitulo())
                .descricao(tarefa.getDescricao())
                .status(tarefa.getStatus())
                .statusDescricao(tarefa.getStatus().getDescricao())
                .prioridade(tarefa.getPrioridade())
                .prioridadeDescricao(tarefa.getPrioridade().getDescricao())
                .recorrencia(tarefa.getRecorrencia())
                .recorrenciaDescricao(tarefa.getRecorrencia().getDescricao())
                .salonId(tarefa.getSalon().getId())
                .criadoPorId(tarefa.getCriadoPor().getId())
                .criadoPorNome(tarefa.getCriadoPor().getNome())
                .atribuidoAId(tarefa.getAtribuidoA() != null ? tarefa.getAtribuidoA().getId() : null)
                .atribuidoANome(tarefa.getAtribuidoA() != null ? tarefa.getAtribuidoA().getNome() : null)
                .dataPrevista(tarefa.getDataPrevista())
                .horaPrevista(tarefa.getHoraPrevista())
                .dataInicio(tarefa.getDataInicio())
                .dataConclusao(tarefa.getDataConclusao())
                .observacoes(tarefa.getObservacoes())
                .categoria(tarefa.getCategoria())
                .local(tarefa.getLocal())
                .tempoEstimadoMinutos(tarefa.getTempoEstimadoMinutos())
                .tempoRealMinutos(tarefa.getTempoRealMinutos())
                .atrasada(atrasada)
                .criadoEm(tarefa.getCriadoEm())
                .atualizadoEm(tarefa.getAtualizadoEm())
                .build();
    }
}
