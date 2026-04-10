package com.belezza.api.controller;

import com.belezza.api.entity.DiaSemana;
import com.belezza.api.entity.HorarioTrabalho;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.Salon;
import com.belezza.api.repository.HorarioTrabalhoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.service.SalonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Controller for managing business schedule and hours.
 * Provides endpoints for viewing and updating schedule settings.
 */
@RestController
@RequestMapping("/api/salon/schedule")
@RequiredArgsConstructor
@Slf4j
public class SalonScheduleController {

    private final SalonService salonService;
    private final ProfissionalRepository profissionalRepository;
    private final HorarioTrabalhoRepository horarioTrabalhoRepository;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    // ==================== SCHEDULE ENDPOINTS ====================

    @GetMapping
    public ResponseEntity<ScheduleSettingsResponse> getSchedule(@AuthenticationPrincipal UserDetails userDetails) {
        log.info("Getting schedule settings for user: {}", userDetails != null ? userDetails.getUsername() : "anonymous");

        // Buscar dados do salão do banco de dados
        Salon salon = null;
        String abertura = "09:00";
        String fechamento = "19:00";
        int intervaloAgendamento = 30;
        int antecedenciaMinima = 2;

        try {
            if (userDetails != null) {
                salon = salonService.getSalonByAdminEmail(userDetails.getUsername());
                abertura = salon.getHorarioAbertura().format(TIME_FORMATTER);
                fechamento = salon.getHorarioFechamento().format(TIME_FORMATTER);
                intervaloAgendamento = salon.getIntervaloAgendamentoMinutos();
                antecedenciaMinima = salon.getAntecedenciaMinimaHoras();
            }
        } catch (Exception e) {
            log.warn("Não foi possível buscar dados do salão: {}", e.getMessage());
        }

        // Montar resposta com os horários do salão
        List<DayScheduleResponse> days = new ArrayList<>();
        days.add(new DayScheduleResponse(0, false, List.of())); // Sunday
        days.add(new DayScheduleResponse(1, true, List.of(new TimeRangeResponse(abertura, fechamento)))); // Monday
        days.add(new DayScheduleResponse(2, true, List.of(new TimeRangeResponse(abertura, fechamento)))); // Tuesday
        days.add(new DayScheduleResponse(3, true, List.of(new TimeRangeResponse(abertura, fechamento)))); // Wednesday
        days.add(new DayScheduleResponse(4, true, List.of(new TimeRangeResponse(abertura, fechamento)))); // Thursday
        days.add(new DayScheduleResponse(5, true, List.of(new TimeRangeResponse(abertura, fechamento)))); // Friday
        days.add(new DayScheduleResponse(6, true, List.of(new TimeRangeResponse(abertura, "17:00")))); // Saturday

        ScheduleSettingsResponse settings = new ScheduleSettingsResponse(
                new WeekScheduleResponse(days),
                "America/Sao_Paulo",
                intervaloAgendamento,
                antecedenciaMinima,
                30,     // maxAdvanceBooking (days)
                true,   // allowSameDayBooking
                10      // bufferBetweenAppointments (minutes)
        );

        return ResponseEntity.ok(settings);
    }

    @PutMapping
    public ResponseEntity<ScheduleSettingsResponse> updateSchedule(
            @RequestBody ScheduleSettingsRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("Updating schedule settings for user: {}", userDetails != null ? userDetails.getUsername() : "anonymous");

        // Atualizar dados do salão no banco de dados
        if (userDetails != null && request.schedule() != null && !request.schedule().days().isEmpty()) {
            try {
                Salon salon = salonService.getSalonByAdminEmail(userDetails.getUsername());

                // Pegar o primeiro dia útil aberto para extrair o horário
                for (DayScheduleResponse day : request.schedule().days()) {
                    if (day.isOpen() && !day.timeRanges().isEmpty()) {
                        TimeRangeResponse timeRange = day.timeRanges().get(0);
                        LocalTime abertura = LocalTime.parse(timeRange.start(), TIME_FORMATTER);
                        LocalTime fechamento = LocalTime.parse(timeRange.end(), TIME_FORMATTER);

                        salon.setHorarioAbertura(abertura);
                        salon.setHorarioFechamento(fechamento);
                        break;
                    }
                }

                if (request.slotDuration() != null) {
                    salon.setIntervaloAgendamentoMinutos(request.slotDuration());
                }
                if (request.minAdvanceBooking() != null) {
                    salon.setAntecedenciaMinimaHoras(request.minAdvanceBooking());
                }

                salonService.save(salon);
                log.info("Horários do salão atualizados: {} - {}", salon.getHorarioAbertura(), salon.getHorarioFechamento());

                // Atualizar horários de trabalho de todos os profissionais do salão
                atualizarHorariosTrabalhoProfissionais(salon);
            } catch (Exception e) {
                log.error("Erro ao atualizar horários do salão: {}", e.getMessage());
            }
        }

        ScheduleSettingsResponse settings = new ScheduleSettingsResponse(
                request.schedule() != null ? request.schedule() : new WeekScheduleResponse(List.of()),
                request.timezone() != null ? request.timezone() : "America/Sao_Paulo",
                request.slotDuration() != null ? request.slotDuration() : 30,
                request.minAdvanceBooking() != null ? request.minAdvanceBooking() : 2,
                request.maxAdvanceBooking() != null ? request.maxAdvanceBooking() : 30,
                request.allowSameDayBooking() != null ? request.allowSameDayBooking() : true,
                request.bufferBetweenAppointments() != null ? request.bufferBetweenAppointments() : 10
        );

        return ResponseEntity.ok(settings);
    }

    /**
     * Atualiza os horários de trabalho de todos os profissionais do salão
     * para corresponder aos novos horários do salão.
     */
    private void atualizarHorariosTrabalhoProfissionais(Salon salon) {
        List<Profissional> profissionais = profissionalRepository.findBySalonIdAndAtivoTrue(salon.getId());
        LocalTime abertura = salon.getHorarioAbertura();
        LocalTime fechamento = salon.getHorarioFechamento();
        LocalTime fechamentoSabado = fechamento.isAfter(LocalTime.of(17, 0)) ? LocalTime.of(17, 0) : fechamento;

        for (Profissional profissional : profissionais) {
            List<HorarioTrabalho> horarios = horarioTrabalhoRepository.findByProfissionalIdAndAtivoTrue(profissional.getId());

            if (horarios.isEmpty()) {
                // Criar horários padrão se não existirem
                criarHorariosPadrao(profissional, abertura, fechamento, fechamentoSabado);
            } else {
                // Atualizar horários existentes
                for (HorarioTrabalho horario : horarios) {
                    horario.setHoraInicio(abertura);
                    if (horario.getDiaSemana() == DiaSemana.SABADO) {
                        horario.setHoraFim(fechamentoSabado);
                    } else if (horario.getDiaSemana() != DiaSemana.DOMINGO) {
                        horario.setHoraFim(fechamento);
                    }
                    horarioTrabalhoRepository.save(horario);
                }
            }
        }
        log.info("Horários de trabalho atualizados para {} profissionais", profissionais.size());
    }

    /**
     * Cria horários de trabalho padrão para um profissional.
     */
    private void criarHorariosPadrao(Profissional profissional, LocalTime abertura, LocalTime fechamento, LocalTime fechamentoSabado) {
        LocalTime intervaloInicio = LocalTime.of(12, 0);
        LocalTime intervaloFim = LocalTime.of(13, 0);

        for (DiaSemana dia : List.of(DiaSemana.SEGUNDA, DiaSemana.TERCA, DiaSemana.QUARTA, DiaSemana.QUINTA, DiaSemana.SEXTA)) {
            HorarioTrabalho horario = HorarioTrabalho.builder()
                    .profissional(profissional)
                    .diaSemana(dia)
                    .horaInicio(abertura)
                    .horaFim(fechamento)
                    .intervaloInicio(intervaloInicio)
                    .intervaloFim(intervaloFim)
                    .ativo(true)
                    .build();
            horarioTrabalhoRepository.save(horario);
        }

        // Sábado
        HorarioTrabalho horarioSabado = HorarioTrabalho.builder()
                .profissional(profissional)
                .diaSemana(DiaSemana.SABADO)
                .horaInicio(abertura)
                .horaFim(fechamentoSabado)
                .intervaloInicio(intervaloInicio)
                .intervaloFim(intervaloFim)
                .ativo(true)
                .build();
        horarioTrabalhoRepository.save(horarioSabado);

        log.info("Horários padrão criados para profissional {}", profissional.getId());
    }

    // ==================== HOLIDAYS ENDPOINTS ====================

    @GetMapping("/holidays")
    public ResponseEntity<List<HolidayResponse>> getHolidays() {
        log.info("Getting holidays");

        // Mock data for development
        List<HolidayResponse> holidays = List.of(
                new HolidayResponse(
                        "1",
                        "2026-01-01",
                        "Ano Novo",
                        false,
                        null,
                        true
                ),
                new HolidayResponse(
                        "2",
                        "2026-04-21",
                        "Tiradentes",
                        false,
                        null,
                        true
                ),
                new HolidayResponse(
                        "3",
                        "2026-05-01",
                        "Dia do Trabalho",
                        false,
                        null,
                        true
                ),
                new HolidayResponse(
                        "4",
                        "2026-09-07",
                        "Independencia",
                        true,
                        new ScheduleTimeResponse("10:00", "16:00"),
                        true
                ),
                new HolidayResponse(
                        "5",
                        "2026-12-25",
                        "Natal",
                        false,
                        null,
                        true
                )
        );

        return ResponseEntity.ok(holidays);
    }

    @PostMapping("/holidays")
    public ResponseEntity<HolidayResponse> addHoliday(@RequestBody HolidayRequest request) {
        log.info("Adding holiday: {}", request.name());

        HolidayResponse holiday = new HolidayResponse(
                UUID.randomUUID().toString(),
                request.date(),
                request.name(),
                request.isOpen(),
                request.schedule(),
                request.recurring()
        );

        return ResponseEntity.ok(holiday);
    }

    @PutMapping("/holidays/{id}")
    public ResponseEntity<HolidayResponse> updateHoliday(
            @PathVariable String id,
            @RequestBody HolidayRequest request
    ) {
        log.info("Updating holiday: {}", id);

        HolidayResponse holiday = new HolidayResponse(
                id,
                request.date() != null ? request.date() : "2026-01-01",
                request.name() != null ? request.name() : "Feriado",
                request.isOpen() != null ? request.isOpen() : false,
                request.schedule(),
                request.recurring() != null ? request.recurring() : true
        );

        return ResponseEntity.ok(holiday);
    }

    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<Void> deleteHoliday(@PathVariable String id) {
        log.info("Deleting holiday: {}", id);
        return ResponseEntity.ok().build();
    }

    // ==================== SPECIAL DATES ENDPOINTS ====================

    @GetMapping("/special-dates")
    public ResponseEntity<List<SpecialDateResponse>> getSpecialDates() {
        log.info("Getting special dates");
        return ResponseEntity.ok(List.of());
    }

    @PostMapping("/special-dates")
    public ResponseEntity<SpecialDateResponse> addSpecialDate(@RequestBody SpecialDateRequest request) {
        log.info("Adding special date: {}", request.name());

        SpecialDateResponse specialDate = new SpecialDateResponse(
                UUID.randomUUID().toString(),
                request.date(),
                request.name(),
                request.type(),
                request.schedule()
        );

        return ResponseEntity.ok(specialDate);
    }

    @DeleteMapping("/special-dates/{id}")
    public ResponseEntity<Void> deleteSpecialDate(@PathVariable String id) {
        log.info("Deleting special date: {}", id);
        return ResponseEntity.ok().build();
    }

    // ==================== RECORD DEFINITIONS ====================

    public record ScheduleSettingsResponse(
            WeekScheduleResponse schedule,
            String timezone,
            int slotDuration,
            int minAdvanceBooking,
            int maxAdvanceBooking,
            boolean allowSameDayBooking,
            int bufferBetweenAppointments
    ) {}

    public record ScheduleSettingsRequest(
            WeekScheduleResponse schedule,
            String timezone,
            Integer slotDuration,
            Integer minAdvanceBooking,
            Integer maxAdvanceBooking,
            Boolean allowSameDayBooking,
            Integer bufferBetweenAppointments
    ) {}

    public record WeekScheduleResponse(
            List<DayScheduleResponse> days
    ) {}

    public record DayScheduleResponse(
            int dayOfWeek,
            boolean isOpen,
            List<TimeRangeResponse> timeRanges
    ) {}

    public record TimeRangeResponse(
            String start,
            String end
    ) {}

    public record HolidayResponse(
            String id,
            String date,
            String name,
            boolean isOpen,
            ScheduleTimeResponse schedule,
            boolean recurring
    ) {}

    public record HolidayRequest(
            String date,
            String name,
            Boolean isOpen,
            ScheduleTimeResponse schedule,
            Boolean recurring
    ) {}

    public record ScheduleTimeResponse(
            String start,
            String end
    ) {}

    public record SpecialDateResponse(
            String id,
            String date,
            String name,
            String type,
            ScheduleTimeResponse schedule
    ) {}

    public record SpecialDateRequest(
            String date,
            String name,
            String type,
            ScheduleTimeResponse schedule
    ) {}
}
