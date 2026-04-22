package com.belezza.api.controller;

import com.belezza.api.entity.*;
import com.belezza.api.repository.HorarioFuncionamentoSalonRepository;
import com.belezza.api.repository.HorarioTrabalhoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.service.SalonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Controller for managing business schedule and hours.
 * The admin configures which days the salon is open and the operating hours.
 * This configuration is persisted in horarios_funcionamento_salon and propagated
 * to all professionals' horarios_trabalho.
 */
@RestController
@RequestMapping("/api/salon/schedule")
@RequiredArgsConstructor
@Slf4j
public class SalonScheduleController {

    private final SalonService salonService;
    private final ProfissionalRepository profissionalRepository;
    private final HorarioTrabalhoRepository horarioTrabalhoRepository;
    private final HorarioFuncionamentoSalonRepository horarioFuncionamentoSalonRepository;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    // Map DayOfWeek index (0=Sun, 1=Mon..6=Sat) to DiaSemana
    private static final DiaSemana[] DAY_INDEX_TO_DIA_SEMANA = {
        DiaSemana.DOMINGO,  // 0
        DiaSemana.SEGUNDA,  // 1
        DiaSemana.TERCA,    // 2
        DiaSemana.QUARTA,   // 3
        DiaSemana.QUINTA,   // 4
        DiaSemana.SEXTA,    // 5
        DiaSemana.SABADO    // 6
    };

    // ==================== SCHEDULE ENDPOINTS ====================

    @GetMapping
    public ResponseEntity<ScheduleSettingsResponse> getSchedule(
            @AuthenticationPrincipal UserDetails userDetails) {

        Salon salon = getSalon(userDetails);

        // Load per-day config from DB
        Map<DiaSemana, HorarioFuncionamentoSalon> horarioMap = new HashMap<>();
        if (salon != null) {
            horarioFuncionamentoSalonRepository.findBySalonId(salon.getId())
                    .forEach(h -> horarioMap.put(h.getDiaSemana(), h));
        }

        // Build 7-day schedule (index 0=Sunday ... 6=Saturday)
        List<DayScheduleResponse> days = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            DiaSemana dia = DAY_INDEX_TO_DIA_SEMANA[i];
            HorarioFuncionamentoSalon h = horarioMap.get(dia);

            if (h != null) {
                List<TimeRangeResponse> ranges = h.isAtivo() && h.getHoraInicio() != null
                        ? List.of(new TimeRangeResponse(
                                h.getHoraInicio().format(TIME_FORMATTER),
                                h.getHoraFim().format(TIME_FORMATTER)))
                        : List.of();
                days.add(new DayScheduleResponse(i, h.isAtivo(), ranges));
            } else {
                // Fallback: weekdays open with salon hours, Sunday closed
                boolean isOpen = i != 0 && salon != null;
                List<TimeRangeResponse> ranges = isOpen && salon != null
                        ? List.of(new TimeRangeResponse(
                                salon.getHorarioAbertura().format(TIME_FORMATTER),
                                salon.getHorarioFechamento().format(TIME_FORMATTER)))
                        : List.of();
                days.add(new DayScheduleResponse(i, isOpen, ranges));
            }
        }

        int intervalo = salon != null ? salon.getIntervaloAgendamentoMinutos() : 30;
        int antecedencia = salon != null ? salon.getAntecedenciaMinimaHoras() : 0;
        int maxAntecedencia = salon != null ? salon.getMaxAntecediaDias() : 30;
        boolean mesmoDia = salon == null || salon.isPermiteAgendamentoMesmoDia();
        int buffer = salon != null ? salon.getBufferEntreAgendamentosMinutos() : 0;

        return ResponseEntity.ok(new ScheduleSettingsResponse(
                new WeekScheduleResponse(days),
                "America/Sao_Paulo",
                intervalo,
                antecedencia,
                maxAntecedencia,
                mesmoDia,
                buffer
        ));
    }

    @PutMapping
    public ResponseEntity<ScheduleSettingsResponse> updateSchedule(
            @RequestBody ScheduleSettingsRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("Admin atualizando horários de funcionamento do salão");

        Salon salon = getSalon(userDetails);
        if (salon == null) {
            return ResponseEntity.badRequest().build();
        }

        // 1. Persist per-day config
        if (request.schedule() != null && request.schedule().days() != null) {
            for (DayScheduleResponse dayReq : request.schedule().days()) {
                int idx = dayReq.dayOfWeek();
                if (idx < 0 || idx > 6) continue;
                DiaSemana dia = DAY_INDEX_TO_DIA_SEMANA[idx];

                LocalTime inicio = null;
                LocalTime fim = null;
                if (dayReq.isOpen() && !dayReq.timeRanges().isEmpty()) {
                    inicio = LocalTime.parse(dayReq.timeRanges().get(0).start(), TIME_FORMATTER);
                    fim    = LocalTime.parse(dayReq.timeRanges().get(0).end(),   TIME_FORMATTER);
                }

                // Upsert HorarioFuncionamentoSalon
                HorarioFuncionamentoSalon hfs = horarioFuncionamentoSalonRepository
                        .findBySalonIdAndDiaSemana(salon.getId(), dia)
                        .orElseGet(() -> HorarioFuncionamentoSalon.builder()
                                .salon(salon)
                                .diaSemana(dia)
                                .build());
                hfs.setAtivo(dayReq.isOpen());
                hfs.setHoraInicio(inicio);
                hfs.setHoraFim(fim);
                horarioFuncionamentoSalonRepository.save(hfs);

                // Propagate to all professionals for this day
                propagarDiaParaProfissionais(salon, dia, dayReq.isOpen(), inicio, fim);
            }

            // Update salon global opening/closing from the first open weekday
            request.schedule().days().stream()
                    .filter(d -> d.isOpen() && d.dayOfWeek() >= 1 && d.dayOfWeek() <= 5
                            && !d.timeRanges().isEmpty())
                    .findFirst()
                    .ifPresent(d -> {
                        salon.setHorarioAbertura(LocalTime.parse(d.timeRanges().get(0).start(), TIME_FORMATTER));
                        salon.setHorarioFechamento(LocalTime.parse(d.timeRanges().get(0).end(), TIME_FORMATTER));
                    });
        }

        // 2. Persist other settings
        if (request.slotDuration() != null) {
            salon.setIntervaloAgendamentoMinutos(request.slotDuration());
        }
        if (request.minAdvanceBooking() != null) {
            salon.setAntecedenciaMinimaHoras(request.minAdvanceBooking());
        }
        if (request.maxAdvanceBooking() != null) {
            salon.setMaxAntecediaDias(request.maxAdvanceBooking());
        }
        if (request.allowSameDayBooking() != null) {
            salon.setPermiteAgendamentoMesmoDia(request.allowSameDayBooking());
        }
        if (request.bufferBetweenAppointments() != null) {
            salon.setBufferEntreAgendamentosMinutos(request.bufferBetweenAppointments());
        }

        salonService.save(salon);
        log.info("Horários do salão {} atualizados com sucesso", salon.getId());

        // Return updated schedule
        return getSchedule(userDetails);
    }

    /**
     * Propagates one day's open/closed state and hours to all active professionals.
     */
    private void propagarDiaParaProfissionais(Salon salon, DiaSemana dia,
                                               boolean aberto,
                                               LocalTime inicio, LocalTime fim) {
        List<Profissional> profissionais = profissionalRepository.findBySalonIdAndAtivoTrue(salon.getId());

        for (Profissional prof : profissionais) {
            Optional<HorarioTrabalho> existing =
                    horarioTrabalhoRepository.findByProfissionalIdAndDiaSemana(prof.getId(), dia);

            if (aberto && inicio != null) {
                if (existing.isPresent()) {
                    HorarioTrabalho ht = existing.get();
                    ht.setAtivo(true);
                    ht.setHoraInicio(inicio);
                    ht.setHoraFim(fim);
                    horarioTrabalhoRepository.save(ht);
                } else {
                    HorarioTrabalho ht = HorarioTrabalho.builder()
                            .profissional(prof)
                            .diaSemana(dia)
                            .horaInicio(inicio)
                            .horaFim(fim)
                            .ativo(true)
                            .build();
                    horarioTrabalhoRepository.save(ht);
                }
            } else {
                // Salon closed on this day → disable professional's record
                existing.ifPresent(ht -> {
                    ht.setAtivo(false);
                    horarioTrabalhoRepository.save(ht);
                });
            }
        }
        log.info("Dia {} propagado para {} profissionais (aberto={})", dia, profissionais.size(), aberto);
    }

    private Salon getSalon(UserDetails userDetails) {
        if (userDetails == null) return null;
        try {
            return salonService.getSalonByAdminEmail(userDetails.getUsername());
        } catch (Exception e) {
            log.warn("Não foi possível buscar salão para {}: {}", userDetails.getUsername(), e.getMessage());
            return null;
        }
    }

    // ==================== PUBLIC: open days for booking calendar ====================

    /**
     * Returns which days of the week the salon is open.
     * Used by the client booking calendar to disable closed days.
     * dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
     */
    @GetMapping("/dias-abertos")
    public ResponseEntity<DiasAbertosResponse> getDiasAbertos(@RequestParam Long salonId) {
        List<HorarioFuncionamentoSalon> horarios =
                horarioFuncionamentoSalonRepository.findBySalonId(salonId);

        // Build set of open day-of-week indices
        Set<Integer> diasAbertos = new HashSet<>();
        for (HorarioFuncionamentoSalon h : horarios) {
            if (h.isAtivo() && h.getHoraInicio() != null) {
                diasAbertos.add(diaSemanaToIndex(h.getDiaSemana()));
            }
        }

        // If no config found, fallback: Mon-Sat open
        if (horarios.isEmpty()) {
            for (int i = 1; i <= 6; i++) diasAbertos.add(i);
        }

        return ResponseEntity.ok(new DiasAbertosResponse(new ArrayList<>(diasAbertos)));
    }

    private int diaSemanaToIndex(DiaSemana dia) {
        return switch (dia) {
            case DOMINGO -> 0;
            case SEGUNDA -> 1;
            case TERCA   -> 2;
            case QUARTA  -> 3;
            case QUINTA  -> 4;
            case SEXTA   -> 5;
            case SABADO  -> 6;
        };
    }

    // ==================== HOLIDAYS ENDPOINTS ====================

    @GetMapping("/holidays")
    public ResponseEntity<List<HolidayResponse>> getHolidays() {
        return ResponseEntity.ok(List.of());
    }

    @PostMapping("/holidays")
    public ResponseEntity<HolidayResponse> addHoliday(@RequestBody HolidayRequest request) {
        HolidayResponse holiday = new HolidayResponse(
                java.util.UUID.randomUUID().toString(),
                request.date(), request.name(),
                request.isOpen() != null && request.isOpen(),
                request.schedule(),
                request.recurring() != null && request.recurring()
        );
        return ResponseEntity.ok(holiday);
    }

    @PutMapping("/holidays/{id}")
    public ResponseEntity<HolidayResponse> updateHoliday(
            @PathVariable String id, @RequestBody HolidayRequest request) {
        HolidayResponse holiday = new HolidayResponse(
                id,
                request.date() != null ? request.date() : "2026-01-01",
                request.name() != null ? request.name() : "Feriado",
                request.isOpen() != null && request.isOpen(),
                request.schedule(),
                request.recurring() != null && request.recurring()
        );
        return ResponseEntity.ok(holiday);
    }

    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<Void> deleteHoliday(@PathVariable String id) {
        return ResponseEntity.ok().build();
    }

    // ==================== SPECIAL DATES ENDPOINTS ====================

    @GetMapping("/special-dates")
    public ResponseEntity<List<SpecialDateResponse>> getSpecialDates() {
        return ResponseEntity.ok(List.of());
    }

    @PostMapping("/special-dates")
    public ResponseEntity<SpecialDateResponse> addSpecialDate(@RequestBody SpecialDateRequest request) {
        SpecialDateResponse sd = new SpecialDateResponse(
                java.util.UUID.randomUUID().toString(),
                request.date(), request.name(), request.type(), request.schedule()
        );
        return ResponseEntity.ok(sd);
    }

    @DeleteMapping("/special-dates/{id}")
    public ResponseEntity<Void> deleteSpecialDate(@PathVariable String id) {
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

    public record WeekScheduleResponse(List<DayScheduleResponse> days) {}

    public record DayScheduleResponse(
            int dayOfWeek,
            boolean isOpen,
            List<TimeRangeResponse> timeRanges
    ) {}

    public record TimeRangeResponse(String start, String end) {}

    public record DiasAbertosResponse(List<Integer> diasAbertos) {}

    public record HolidayResponse(
            String id, String date, String name,
            boolean isOpen, ScheduleTimeResponse schedule, boolean recurring
    ) {}

    public record HolidayRequest(
            String date, String name, Boolean isOpen,
            ScheduleTimeResponse schedule, Boolean recurring
    ) {}

    public record ScheduleTimeResponse(String start, String end) {}

    public record SpecialDateResponse(
            String id, String date, String name,
            String type, ScheduleTimeResponse schedule
    ) {}

    public record SpecialDateRequest(
            String date, String name, String type, ScheduleTimeResponse schedule
    ) {}
}
