package com.belezza.api.scheduler;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job that marks confirmed appointments as no-show
 * when the client hasn't shown up 15 minutes after the appointment time.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NoShowScheduler {

    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;

    /**
     * Runs every 5 minutes to check for no-show candidates.
     * An appointment is considered a no-show if:
     * - Status is CONFIRMADO
     * - The appointment time was more than 15 minutes ago
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void processarNoShows() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(15);
        List<Agendamento> candidates = agendamentoRepository.findNoShowCandidates(cutoff);

        if (candidates.isEmpty()) {
            return;
        }

        log.info("Processando {} candidatos a no-show", candidates.size());

        for (Agendamento agendamento : candidates) {
            agendamento.setStatus(StatusAgendamento.NO_SHOW);
            agendamentoRepository.save(agendamento);

            // Increment no-show counter
            clienteRepository.incrementNoShows(agendamento.getCliente().getId());

            // Check if client should be blocked
            Cliente cliente = clienteRepository.findById(agendamento.getCliente().getId()).orElse(null);
            if (cliente != null) {
                int maxNoShows = agendamento.getSalon().getMaxNoShowsPermitidos();
                if (cliente.getNoShows() + 1 >= maxNoShows) {
                    cliente.setBloqueado(true);
                    clienteRepository.save(cliente);
                    log.warn("Cliente {} bloqueado automaticamente por excesso de no-shows ({}/{})",
                            cliente.getId(), cliente.getNoShows() + 1, maxNoShows);
                }
            }

            log.info("Agendamento {} marcado como no-show", agendamento.getId());
        }

        log.info("Processamento de no-shows concluído: {} agendamentos atualizados", candidates.size());
    }
}
