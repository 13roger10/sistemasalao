package com.belezza.api.scheduler;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.AgendamentoServico;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.entity.TipoNotificacao;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.service.NotificacaoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Falta automática: o agendamento que não foi iniciado até 30 minutos depois do horário
 * (pendente ou confirmado) passa a "não compareceu", conta a falta do cliente (bloqueando no
 * limite do salão) e a equipe recebe a notificação na hora, pelo WebSocket. Até os 30 minutos
 * o agendamento fica como está, para o cliente que chega atrasado.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NoShowScheduler {

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;
    private final NotificacaoService notificacaoService;

    @Value("${belezza.no-show.tolerancia-minutos:30}")
    private int toleranciaMinutos = 30;

    /** Roda a cada minuto, para a falta sair logo depois dos 30 minutos. */
    @Scheduled(fixedRate = 60000)
    @Transactional
    @SuppressWarnings("null")
    public void processarNoShows() {
        LocalDateTime agora = LocalDateTime.now();
        LocalDateTime cutoff = agora.minusMinutes(toleranciaMinutos);
        // Só as últimas 24 h: pendentes antigos não viram falta (nem bloqueiam cliente) de uma vez
        List<Agendamento> candidates = agendamentoRepository.findNoShowCandidates(agora.minusHours(24), cutoff);

        if (candidates.isEmpty()) {
            return;
        }

        log.info("Processando {} candidatos a no-show", candidates.size());

        for (Agendamento agendamento : candidates) {
            agendamento.setStatus(StatusAgendamento.NO_SHOW);
            agendamentoRepository.save(agendamento);

            // Increment no-show counter and block the client once the salon limit is reached
            Cliente cliente = agendamento.getCliente();
            int maxNoShows = agendamento.getSalon().getMaxNoShowsPermitidos();
            boolean bloqueadoAgora = cliente.registrarNoShow(maxNoShows);
            clienteRepository.save(cliente);
            if (bloqueadoAgora) {
                log.warn("Cliente {} bloqueado automaticamente por excesso de no-shows ({}/{})",
                        cliente.getId(), cliente.getNoShows(), maxNoShows);
            }

            notificarEquipe(agendamento, bloqueadoAgora);
            log.info("Agendamento {} marcado como no-show", agendamento.getId());
        }

        log.info("Processamento de no-shows concluído: {} agendamentos atualizados", candidates.size());
    }

    /** Recepção, profissional e admin do salão; uma falha na notificação não desfaz a falta. */
    private void notificarEquipe(Agendamento agendamento, boolean clienteBloqueado) {
        try {
            String nomeCliente = agendamento.getCliente().getUsuario() != null
                    ? agendamento.getCliente().getUsuario().getNome() : "Cliente";
            String mensagem = String.format(
                    "%s não compareceu ao agendamento de %s às %s (%s). Após %d minutos sem o atendimento iniciado, " +
                    "o agendamento foi cancelado automaticamente e a falta registrada.%s",
                    nomeCliente,
                    agendamento.getDataHora().format(DATA),
                    agendamento.getDataHora().format(HORA),
                    nomeServico(agendamento),
                    toleranciaMinutos,
                    clienteBloqueado ? " O cliente atingiu o limite de faltas e foi bloqueado." : "");
            notificacaoService.notificarEquipeMudancaStatusAgendamento(
                    agendamento, null, TipoNotificacao.AGENDAMENTO_CANCELADO, "Cliente Não Compareceu", mensagem);
        } catch (Exception e) {
            log.error("Erro ao notificar equipe sobre a falta automática do agendamento {}: {}",
                    agendamento.getId(), e.getMessage(), e);
        }
    }

    private String nomeServico(Agendamento agendamento) {
        if (agendamento.getServico() != null) {
            return agendamento.getServico().getNome();
        }
        return agendamento.getServicos().stream()
                .map(AgendamentoServico::getServico)
                .map(s -> s.getNome())
                .reduce((a, b) -> a + " + " + b)
                .orElse("serviço");
    }
}
