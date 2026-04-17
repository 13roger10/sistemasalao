package com.belezza.api.service;

import com.belezza.api.dto.disponibilidade.DisponibilidadeRequest;
import com.belezza.api.dto.disponibilidade.DisponibilidadeResponse;
import com.belezza.api.dto.disponibilidade.ProfissionalDisponibilidadeDTO;
import com.belezza.api.dto.disponibilidade.TimeSlotDTO;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.BloqueioHorarioRepository;
import com.belezza.api.repository.HorarioFuncionamentoSalonRepository;
import com.belezza.api.repository.HorarioTrabalhoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.ServicoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Service para consulta de disponibilidade de horários em tempo real.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DisponibilidadeService {

    private final SalonService salonService;
    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;
    private final HorarioTrabalhoRepository horarioTrabalhoRepository;
    private final HorarioFuncionamentoSalonRepository horarioFuncionamentoSalonRepository;
    private final BloqueioHorarioRepository bloqueioHorarioRepository;
    private final AgendamentoRepository agendamentoRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Consulta a disponibilidade de horários para um profissional ou todos os profissionais do salão.
     */
    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public DisponibilidadeResponse consultarDisponibilidade(DisponibilidadeRequest request) {
        log.info("Consultando disponibilidade para salão {} na data {}", request.getSalonId(), request.getData());

        // 1. Buscar salão
        Salon salon = salonService.getSalonEntity(request.getSalonId());

        // 2. Validar data — usar timezone do salão (America/Sao_Paulo) para evitar
        // divergência entre o horário do browser do cliente (UTC-3) e o container Docker (UTC)
        LocalDate hoje = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        if (request.getData().isBefore(hoje)) {
            throw new BusinessException("Não é possível consultar disponibilidade para datas passadas");
        }

        // Regras configuradas pelo administrador
        if (!salon.isPermiteAgendamentoMesmoDia() && request.getData().isEqual(hoje)) {
            throw new BusinessException("Agendamento no mesmo dia não é permitido neste salão");
        }
        if (request.getData().isAfter(hoje.plusDays(salon.getMaxAntecediaDias()))) {
            throw new BusinessException("Não é possível agendar com mais de " +
                    salon.getMaxAntecediaDias() + " dias de antecedência");
        }

        // 3. Calcular duração total dos serviços
        int duracaoTotal = calcularDuracaoTotal(request.getServicoIds());

        // 4. Definir intervalo entre slots
        int intervalo = request.getIntervaloMinutos() != null
                ? request.getIntervaloMinutos()
                : salon.getIntervaloAgendamentoMinutos();

        // 5. Buscar profissionais
        List<Profissional> profissionais;
        if (request.getProfissionalId() != null) {
            Profissional profissional = profissionalRepository.findById(request.getProfissionalId())
                    .filter(Profissional::isAtivo)
                    .filter(Profissional::isAceitaAgendamentoOnline)
                    .orElseThrow(() -> new ResourceNotFoundException("Profissional", request.getProfissionalId()));

            if (!profissional.getSalon().getId().equals(request.getSalonId())) {
                throw new BusinessException("Profissional não pertence a este salão");
            }
            profissionais = List.of(profissional);
        } else {
            // Buscar todos os profissionais ativos do salão que aceitam agendamento online
            profissionais = profissionalRepository.findOnlineAvailableBySalonId(request.getSalonId());
        }

        // 6. Calcular disponibilidade para cada profissional
        List<ProfissionalDisponibilidadeDTO> disponibilidadeProfissionais = new ArrayList<>();

        for (Profissional profissional : profissionais) {
            List<TimeSlotDTO> slots = calcularSlotsDisponiveisParaProfissional(
                    profissional, salon, request.getData(), duracaoTotal, intervalo);

            disponibilidadeProfissionais.add(ProfissionalDisponibilidadeDTO.builder()
                    .professionalId(profissional.getId())
                    .professionalName(profissional.getUsuario().getNome())
                    .photoUrl(profissional.getFotoUrl())
                    .slots(slots)
                    .build());
        }

        return DisponibilidadeResponse.builder()
                .date(request.getData())
                .totalDurationMinutes(duracaoTotal)
                .slotIntervalMinutes(intervalo)
                .professionals(disponibilidadeProfissionais)
                .build();
    }

    /**
     * Calcula a duração total dos serviços selecionados.
     */
    private int calcularDuracaoTotal(List<Long> servicoIds) {
        if (servicoIds == null || servicoIds.isEmpty()) {
            throw new BusinessException("Pelo menos um serviço deve ser selecionado");
        }

        List<Servico> servicos = servicoRepository.findAllById(servicoIds);
        if (servicos.size() != servicoIds.size()) {
            throw new BusinessException("Um ou mais serviços não foram encontrados");
        }

        return servicos.stream()
                .mapToInt(Servico::getDuracaoMinutos)
                .sum();
    }

    /**
     * Calcula os slots disponíveis para um profissional específico.
     */
    private List<TimeSlotDTO> calcularSlotsDisponiveisParaProfissional(
            Profissional profissional,
            Salon salon,
            LocalDate data,
            int duracaoServico,
            int intervalo) {

        List<TimeSlotDTO> slots = new ArrayList<>();

        DiaSemana diaSemana = toDiaSemana(data.getDayOfWeek());
        log.info("Buscando disponibilidade para profissional {} no dia {} ({})",
                profissional.getId(), data, diaSemana);

        // 1. Verificar configuração do salão para este dia (admin config)
        HorarioFuncionamentoSalon horarioSalon = horarioFuncionamentoSalonRepository
                .findBySalonIdAndDiaSemana(salon.getId(), diaSemana)
                .orElse(null);

        if (horarioSalon != null && !horarioSalon.isAtivo()) {
            log.info("Salão fechado no dia {} conforme configuração do administrador", diaSemana);
            return slots;
        }

        // 2. Verificar se o profissional trabalha neste dia
        HorarioTrabalho horarioTrabalho = horarioTrabalhoRepository
                .findByProfissionalIdAndDiaSemana(profissional.getId(), diaSemana)
                .filter(HorarioTrabalho::isAtivo)
                .orElse(null);

        if (horarioTrabalho == null) {
            log.warn("Profissional {} ({}) não tem horário ativo para {} - retornando lista vazia",
                    profissional.getId(), profissional.getUsuario().getNome(), diaSemana);
            return slots;
        }

        log.info("Horário do profissional {}: {} - {}", profissional.getId(),
                horarioTrabalho.getHoraInicio(), horarioTrabalho.getHoraFim());

        // 3. Determinar horário efetivo: interseção do horário do salão com o do profissional
        LocalTime horaInicio = horarioTrabalho.getHoraInicio();
        LocalTime horaFim    = horarioTrabalho.getHoraFim();

        // Limitar pelo horário do salão para este dia (admin config)
        if (horarioSalon != null && horarioSalon.getHoraInicio() != null) {
            if (horarioSalon.getHoraInicio().isAfter(horaInicio)) {
                horaInicio = horarioSalon.getHoraInicio();
            }
            if (horarioSalon.getHoraFim().isBefore(horaFim)) {
                horaFim = horarioSalon.getHoraFim();
            }
        } else {
            // Fallback: use salon global hours
            if (salon.getHorarioAbertura().isAfter(horaInicio)) {
                horaInicio = salon.getHorarioAbertura();
            }
            if (salon.getHorarioFechamento().isBefore(horaFim)) {
                horaFim = salon.getHorarioFechamento();
            }
        }

        log.info("Gerando slots de {} até {} com intervalo de {} minutos (duração serviço: {} min)",
                horaInicio, horaFim, intervalo, duracaoServico);

        // 3. Buscar bloqueios e agendamentos existentes
        LocalDateTime inicioDia = data.atStartOfDay();
        LocalDateTime fimDia = data.plusDays(1).atStartOfDay();

        List<BloqueioHorario> bloqueios = bloqueioHorarioRepository.findByProfissionalIdAndPeriod(
                profissional.getId(), inicioDia, fimDia);

        List<Agendamento> agendamentos = agendamentoRepository.findDailyByProfissional(
                profissional.getId(), inicioDia, fimDia);

        int bufferMinutos = salon.getBufferEntreAgendamentosMinutos();

        // 4. Gerar slots
        LocalTime slotAtual = horaInicio;
        LocalDateTime agora = LocalDateTime.now();
        int slotsGerados = 0;
        int slotsManha = 0;
        int slotsTarde = 0;

        while (!slotAtual.plusMinutes(duracaoServico).isAfter(horaFim)) {
            LocalDateTime inicioSlot = data.atTime(slotAtual);
            LocalDateTime fimSlot = inicioSlot.plusMinutes(duracaoServico);

            String motivoIndisponibilidade = verificarDisponibilidade(
                    inicioSlot, fimSlot,
                    horarioTrabalho,
                    bloqueios,
                    agendamentos,
                    salon.getAntecedenciaMinimaHoras(),
                    bufferMinutos,
                    agora);

            String horaFormatada = slotAtual.format(TIME_FORMATTER);

            if (motivoIndisponibilidade == null) {
                slots.add(TimeSlotDTO.available(horaFormatada));
                log.debug("Slot {} disponível", horaFormatada);
            } else {
                slots.add(TimeSlotDTO.unavailable(horaFormatada, motivoIndisponibilidade));
                log.info("Slot {} indisponível: {} (início: {}, fim: {})",
                        horaFormatada, motivoIndisponibilidade, inicioSlot, fimSlot);
            }

            slotsGerados++;
            if (slotAtual.isBefore(LocalTime.of(12, 0))) {
                slotsManha++;
            } else {
                slotsTarde++;
            }

            slotAtual = slotAtual.plusMinutes(intervalo);
        }

        log.info("Total de slots gerados para profissional {}: {} (manhã: {}, tarde: {})",
                profissional.getId(), slotsGerados, slotsManha, slotsTarde);

        return slots;
    }

    /**
     * Verifica se um slot está disponível.
     * @return null se disponível, ou motivo da indisponibilidade
     */
    private String verificarDisponibilidade(
            LocalDateTime inicioSlot,
            LocalDateTime fimSlot,
            HorarioTrabalho horarioTrabalho,
            List<BloqueioHorario> bloqueios,
            List<Agendamento> agendamentos,
            int antecedenciaMinimaHoras,
            int bufferMinutos,
            LocalDateTime agora) {

        // 1. Verificar antecedência mínima configurada pelo administrador
        if (antecedenciaMinimaHoras > 0 && inicioSlot.isBefore(agora.plusHours(antecedenciaMinimaHoras))) {
            return "Horário passado";
        }
        // Verificar se o horário já passou (caso antecedência seja 0)
        if (inicioSlot.isBefore(agora)) {
            return "Horário passado";
        }

        // 2. Verificar intervalo de descanso do profissional (se configurado)
        LocalTime horaInicioSlot = inicioSlot.toLocalTime();
        LocalTime horaFimSlot    = fimSlot.toLocalTime();

        if (horarioTrabalho.getIntervaloInicio() != null && horarioTrabalho.getIntervaloFim() != null) {
            if (horaInicioSlot.isBefore(horarioTrabalho.getIntervaloFim()) &&
                    horaFimSlot.isAfter(horarioTrabalho.getIntervaloInicio())) {
                return "Horário de intervalo";
            }
        }

        // 3. Verificar bloqueios (férias, folgas, etc.)
        for (BloqueioHorario bloqueio : bloqueios) {
            if (inicioSlot.isBefore(bloqueio.getDataFim()) && fimSlot.isAfter(bloqueio.getDataInicio())) {
                return bloqueio.getMotivo() != null ? bloqueio.getMotivo() : "Horário bloqueado";
            }
        }

        // 4. Verificar agendamentos existentes (com buffer entre atendimentos)
        for (Agendamento agendamento : agendamentos) {
            LocalDateTime inicioAgendamento = agendamento.getDataHora().minusMinutes(bufferMinutos);
            LocalDateTime fimAgendamento    = agendamento.getFimPrevisto().plusMinutes(bufferMinutos);
            if (inicioSlot.isBefore(fimAgendamento) && fimSlot.isAfter(inicioAgendamento)) {
                return "Horário já agendado";
            }
        }

        return null;
    }

    /**
     * Converte DayOfWeek (Java) para DiaSemana (enum do sistema).
     */
    private DiaSemana toDiaSemana(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> DiaSemana.SEGUNDA;
            case TUESDAY -> DiaSemana.TERCA;
            case WEDNESDAY -> DiaSemana.QUARTA;
            case THURSDAY -> DiaSemana.QUINTA;
            case FRIDAY -> DiaSemana.SEXTA;
            case SATURDAY -> DiaSemana.SABADO;
            case SUNDAY -> DiaSemana.DOMINGO;
        };
    }
}
