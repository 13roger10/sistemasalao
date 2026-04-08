package com.belezza.api.scheduler;

import com.belezza.api.entity.RecorrenciaTarefa;
import com.belezza.api.entity.StatusTarefa;
import com.belezza.api.entity.TarefaSalon;
import com.belezza.api.repository.TarefaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Scheduler para criação automática de tarefas recorrentes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TarefaRecorrenteScheduler {

    private final TarefaRepository tarefaRepository;

    /**
     * Executa diariamente às 00:05 para criar novas instâncias de tarefas recorrentes.
     */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void processarTarefasRecorrentes() {
        log.info("Iniciando processamento de tarefas recorrentes...");

        List<TarefaSalon> tarefasRecorrentes = tarefaRepository.findTarefasRecorrentes();
        int tarefasCriadas = 0;

        for (TarefaSalon tarefaOriginal : tarefasRecorrentes) {
            LocalDate proximaData = calcularProximaData(tarefaOriginal);

            if (proximaData != null && !proximaData.isAfter(LocalDate.now().plusDays(1))) {
                TarefaSalon novaTarefa = criarNovaTarefa(tarefaOriginal, proximaData);
                tarefaRepository.save(novaTarefa);
                tarefasCriadas++;
                log.debug("Tarefa recorrente criada: {} para {}", novaTarefa.getTitulo(), proximaData);
            }
        }

        log.info("Processamento concluído. {} tarefas recorrentes criadas.", tarefasCriadas);
    }

    private LocalDate calcularProximaData(TarefaSalon tarefa) {
        LocalDate dataBase = tarefa.getDataConclusao() != null
                ? tarefa.getDataConclusao().toLocalDate()
                : tarefa.getDataPrevista();

        return switch (tarefa.getRecorrencia()) {
            case DIARIA -> dataBase.plusDays(1);
            case SEMANAL -> dataBase.plusWeeks(1);
            case QUINZENAL -> dataBase.plusWeeks(2);
            case MENSAL -> dataBase.plusMonths(1);
            default -> null;
        };
    }

    private TarefaSalon criarNovaTarefa(TarefaSalon original, LocalDate novaData) {
        return TarefaSalon.builder()
                .titulo(original.getTitulo())
                .descricao(original.getDescricao())
                .status(StatusTarefa.PENDENTE)
                .prioridade(original.getPrioridade())
                .recorrencia(original.getRecorrencia())
                .salon(original.getSalon())
                .criadoPor(original.getCriadoPor())
                .atribuidoA(original.getAtribuidoA())
                .dataPrevista(novaData)
                .horaPrevista(original.getHoraPrevista())
                .categoria(original.getCategoria())
                .local(original.getLocal())
                .tempoEstimadoMinutos(original.getTempoEstimadoMinutos())
                .build();
    }
}
