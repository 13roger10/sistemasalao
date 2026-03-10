package com.belezza.api.scheduler;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.integration.WhatsAppService;
import com.belezza.api.repository.AgendamentoRepository;
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
 * Scheduled job that sends WhatsApp reminders for upcoming appointments.
 * Sends two types of reminders:
 * - 24 hours before appointment
 * - 2 hours before appointment
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LembreteAgendamentoJob {

    private final AgendamentoRepository agendamentoRepository;
    private final WhatsAppService whatsAppService;
    private final NotificacaoService notificacaoService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.whatsapp.lembretes.enabled:true}")
    private boolean lembretesEnabled;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Sends 24-hour reminders.
     * Runs every 30 minutes.
     */
    @Scheduled(fixedRate = 1800000) // 30 minutes
    @Transactional
    public void enviarLembretes24h() {
        if (!lembretesEnabled) {
            return;
        }

        // Find appointments 24 hours from now (with 30-minute window)
        LocalDateTime start = LocalDateTime.now().plusHours(24).minusMinutes(15);
        LocalDateTime end = LocalDateTime.now().plusHours(24).plusMinutes(15);

        List<Agendamento> agendamentos = agendamentoRepository.findNeedingReminder24h(start, end);

        if (agendamentos.isEmpty()) {
            return;
        }

        log.info("Enviando lembretes de 24h para {} agendamentos", agendamentos.size());

        for (Agendamento agendamento : agendamentos) {
            try {
                enviarLembrete24h(agendamento);
                agendamento.setLembreteEnviado24h(true);
                agendamentoRepository.save(agendamento);

                // Criar notificação no sistema
                try {
                    notificacaoService.notificarLembrete24h(agendamento);
                } catch (Exception ne) {
                    log.error("Erro ao criar notificação 24h: {}", ne.getMessage());
                }

                log.info("Lembrete 24h enviado para agendamento {}", agendamento.getId());
            } catch (Exception e) {
                log.error("Erro ao enviar lembrete 24h para agendamento {}: {}",
                    agendamento.getId(), e.getMessage(), e);
            }
        }

        log.info("Lembretes de 24h processados: {} enviados", agendamentos.size());
    }

    /**
     * Sends 2-hour reminders.
     * Runs every 15 minutes.
     */
    @Scheduled(fixedRate = 900000) // 15 minutes
    @Transactional
    public void enviarLembretes2h() {
        if (!lembretesEnabled) {
            return;
        }

        // Find appointments 2 hours from now (with 15-minute window)
        LocalDateTime start = LocalDateTime.now().plusHours(2).minusMinutes(7);
        LocalDateTime end = LocalDateTime.now().plusHours(2).plusMinutes(7);

        List<Agendamento> agendamentos = agendamentoRepository.findNeedingReminder2h(start, end);

        if (agendamentos.isEmpty()) {
            return;
        }

        log.info("Enviando lembretes de 2h para {} agendamentos", agendamentos.size());

        for (Agendamento agendamento : agendamentos) {
            try {
                enviarLembrete2h(agendamento);
                agendamento.setLembreteEnviado2h(true);
                agendamentoRepository.save(agendamento);

                // Criar notificação no sistema
                try {
                    notificacaoService.notificarLembrete2h(agendamento);
                } catch (Exception ne) {
                    log.error("Erro ao criar notificação 2h: {}", ne.getMessage());
                }

                log.info("Lembrete 2h enviado para agendamento {}", agendamento.getId());
            } catch (Exception e) {
                log.error("Erro ao enviar lembrete 2h para agendamento {}: {}",
                    agendamento.getId(), e.getMessage(), e);
            }
        }

        log.info("Lembretes de 2h processados: {} enviados", agendamentos.size());
    }

    /**
     * Send 24-hour reminder.
     */
    private void enviarLembrete24h(Agendamento agendamento) {
        Cliente cliente = agendamento.getCliente();
        if (cliente == null || cliente.getUsuario() == null || cliente.getUsuario().getTelefone() == null) {
            log.warn("Cliente sem telefone para agendamento {}", agendamento.getId());
            return;
        }

        String nomeCliente = cliente.getUsuario().getNome() != null ? cliente.getUsuario().getNome() : "Cliente";
        String data = agendamento.getDataHora().format(DATE_FORMATTER);
        String hora = agendamento.getDataHora().format(TIME_FORMATTER);
        String servico = agendamento.getServico() != null
            ? agendamento.getServico().getNome()
            : "Serviço";

        // Generate confirmation link with token
        String token = agendamento.getTokenConfirmacao();
        String linkConfirmacao = String.format("%s/confirmar-agendamento/%s", frontendUrl, token);

        whatsAppService.enviarLembrete24h(
            cliente.getUsuario().getTelefone(),
            nomeCliente,
            data,
            hora,
            servico,
            linkConfirmacao
        );
    }

    /**
     * Send 2-hour reminder.
     */
    private void enviarLembrete2h(Agendamento agendamento) {
        Cliente cliente = agendamento.getCliente();
        if (cliente == null || cliente.getUsuario() == null || cliente.getUsuario().getTelefone() == null) {
            log.warn("Cliente sem telefone para agendamento {}", agendamento.getId());
            return;
        }

        String nomeCliente = cliente.getUsuario().getNome() != null ? cliente.getUsuario().getNome() : "Cliente";
        String hora = agendamento.getDataHora().format(TIME_FORMATTER);
        String servico = agendamento.getServico() != null
            ? agendamento.getServico().getNome()
            : "Serviço";
        String endereco = agendamento.getSalon() != null && agendamento.getSalon().getEndereco() != null
            ? agendamento.getSalon().getEndereco()
            : "Salão";

        whatsAppService.enviarLembrete2h(
            cliente.getUsuario().getTelefone(),
            nomeCliente,
            hora,
            servico,
            endereco
        );
    }
}
