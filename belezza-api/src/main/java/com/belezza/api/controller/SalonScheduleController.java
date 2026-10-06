package com.belezza.api.controller;

import com.belezza.api.entity.*;
import com.belezza.api.repository.HorarioFuncionamentoSalonRepository;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.security.TenantContext;
import com.belezza.api.service.DataEspecialService;
import com.belezza.api.service.SalonService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
 * This configuration is persisted in horarios_funcionamento_salon only. Professionals keep
 * their own horarios_trabalho: availability and booking use the intersection of both, so
 * a closed day or shorter salon hours take effect without overwriting individual schedules
 * or days off.
 */
@RestController
@RequestMapping("/api/salon/schedule")
@RequiredArgsConstructor
@Slf4j
public class SalonScheduleController {

    private final SalonService salonService;
    private final HorarioFuncionamentoSalonRepository horarioFuncionamentoSalonRepository;
    private final DataEspecialService dataEspecialService;
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
    @AdminOnly
    public ResponseEntity<ScheduleSettingsResponse> updateSchedule(
            @Valid @RequestBody ScheduleSettingsRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        log.info("Admin atualizando horários de funcionamento do salão");

        Salon salon = getSalon(userDetails);
        if (salon == null) {
            throw new BusinessException("Nenhum salão vinculado a este administrador");
        }
        validarDias(request);

        // 1. Persist per-day config
        if (request.schedule() != null && request.schedule().days() != null) {
            for (DayScheduleResponse dayReq : request.schedule().days()) {
                int idx = dayReq.dayOfWeek();
                if (idx < 0 || idx > 6) continue;
                DiaSemana dia = DAY_INDEX_TO_DIA_SEMANA[idx];

                LocalTime inicio = null;
                LocalTime fim = null;
                if (dayReq.isOpen() && !dayReq.timeRanges().isEmpty()) {
                    inicio = SalonService.horario(dayReq.timeRanges().get(0).start(), "abertura");
                    fim    = SalonService.horario(dayReq.timeRanges().get(0).end(), "fechamento");
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
            }

            // Update salon global opening/closing from the first open weekday
            request.schedule().days().stream()
                    .filter(d -> d.isOpen() && d.dayOfWeek() >= 1 && d.dayOfWeek() <= 5
                            && !d.timeRanges().isEmpty())
                    .findFirst()
                    .ifPresent(d -> {
                        salon.setHorarioAbertura(SalonService.horario(d.timeRanges().get(0).start(), "abertura"));
                        salon.setHorarioFechamento(SalonService.horario(d.timeRanges().get(0).end(), "fechamento"));
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

    private static final String[] NOME_DO_DIA =
            {"domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"};

    /**
     * Confere todos os dias antes de gravar qualquer um (BUG-032): abertura depois do fechamento
     * era salva e nenhum horário daquele dia cabia no expediente.
     */
    private void validarDias(ScheduleSettingsRequest request) {
        if (request.schedule() == null || request.schedule().days() == null) {
            return;
        }
        for (DayScheduleResponse dia : request.schedule().days()) {
            if (dia.dayOfWeek() < 0 || dia.dayOfWeek() > 6 || !dia.isOpen()
                    || dia.timeRanges() == null || dia.timeRanges().isEmpty()) {
                continue;
            }
            TimeRangeResponse faixa = dia.timeRanges().get(0);
            SalonService.validarExpediente(SalonService.horario(faixa.start(), "abertura"),
                    SalonService.horario(faixa.end(), "fechamento"), "de " + NOME_DO_DIA[dia.dayOfWeek()]);
        }
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
    // BUG-008 (auditoria): feriados e datas especiais eram fingidos (o POST devolvia um UUID
    // aleatório sem gravar e o GET sempre []). Agora são gravados por salão (o do token) e a
    // agenda e a disponibilidade os respeitam.

    @GetMapping("/holidays")
    public ResponseEntity<List<HolidayResponse>> getHolidays() {
        return ResponseEntity.ok(dataEspecialService.listar(salaoDoToken(), DataEspecialSalon.FERIADO).stream()
                .map(SalonScheduleController::toHoliday).toList());
    }

    @PostMapping("/holidays")
    @AdminOnly
    public ResponseEntity<HolidayResponse> addHoliday(@RequestBody HolidayRequest request) {
        ScheduleTimeResponse h = request.schedule();
        DataEspecialSalon salvo = dataEspecialService.salvarFeriado(salaoDoToken(), null, request.date(), request.name(),
                request.isOpen(), h != null ? h.start() : null, h != null ? h.end() : null, request.recurring());
        return ResponseEntity.ok(toHoliday(salvo));
    }

    @PutMapping("/holidays/{id}")
    @AdminOnly
    public ResponseEntity<HolidayResponse> updateHoliday(
            @PathVariable Long id, @RequestBody HolidayRequest request) {
        ScheduleTimeResponse h = request.schedule();
        DataEspecialSalon salvo = dataEspecialService.salvarFeriado(salaoDoToken(), id, request.date(), request.name(),
                request.isOpen(), h != null ? h.start() : null, h != null ? h.end() : null, request.recurring());
        return ResponseEntity.ok(toHoliday(salvo));
    }

    @DeleteMapping("/holidays/{id}")
    @AdminOnly
    public ResponseEntity<Void> deleteHoliday(@PathVariable Long id) {
        dataEspecialService.excluir(salaoDoToken(), id, DataEspecialSalon.FERIADO);
        return ResponseEntity.noContent().build();
    }

    // ==================== SPECIAL DATES ENDPOINTS ====================

    @GetMapping("/special-dates")
    public ResponseEntity<List<SpecialDateResponse>> getSpecialDates() {
        return ResponseEntity.ok(dataEspecialService.listar(salaoDoToken(), DataEspecialSalon.ESPECIAL).stream()
                .map(SalonScheduleController::toSpecialDate).toList());
    }

    @PostMapping("/special-dates")
    @AdminOnly
    public ResponseEntity<SpecialDateResponse> addSpecialDate(@RequestBody SpecialDateRequest request) {
        ScheduleTimeResponse h = request.schedule();
        DataEspecialSalon salvo = dataEspecialService.salvarDataEspecial(salaoDoToken(), request.date(), request.name(),
                request.type(), h != null ? h.start() : null, h != null ? h.end() : null);
        return ResponseEntity.ok(toSpecialDate(salvo));
    }

    @DeleteMapping("/special-dates/{id}")
    @AdminOnly
    public ResponseEntity<Void> deleteSpecialDate(@PathVariable Long id) {
        dataEspecialService.excluir(salaoDoToken(), id, DataEspecialSalon.ESPECIAL);
        return ResponseEntity.noContent().build();
    }

    private static Long salaoDoToken() {
        Long salonId = TenantContext.getCurrentTenant();
        if (salonId == null) {
            throw new AccessDeniedException("Acesso negado: usuário sem estabelecimento vinculado");
        }
        return salonId;
    }

    private static ScheduleTimeResponse horario(DataEspecialSalon d) {
        return d.getHoraInicio() != null && d.getHoraFim() != null
                ? new ScheduleTimeResponse(d.getHoraInicio().toString(), d.getHoraFim().toString()) : null;
    }

    private static HolidayResponse toHoliday(DataEspecialSalon d) {
        return new HolidayResponse(String.valueOf(d.getId()), d.getData().toString(), d.getNome(),
                d.isAberto(), horario(d), d.isRecorrente());
    }

    private static SpecialDateResponse toSpecialDate(DataEspecialSalon d) {
        return new SpecialDateResponse(String.valueOf(d.getId()), d.getData().toString(), d.getNome(),
                d.getTipo(), horario(d));
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
            @Min(value = 5, message = "Intervalo entre horários deve ser de pelo menos 5 minutos")
            @Max(value = 240, message = "Intervalo entre horários deve ser de no máximo 240 minutos")
            Integer slotDuration,
            @Min(value = 0, message = "Antecedência mínima não pode ser negativa")
            @Max(value = 720, message = "Antecedência mínima deve ser de no máximo 720 horas (30 dias)")
            Integer minAdvanceBooking,
            @Min(value = 1, message = "Antecedência máxima deve ser de pelo menos 1 dia")
            @Max(value = 365, message = "Antecedência máxima deve ser de no máximo 365 dias")
            Integer maxAdvanceBooking,
            Boolean allowSameDayBooking,
            @Min(value = 0, message = "Intervalo entre atendimentos não pode ser negativo")
            @Max(value = 240, message = "Intervalo entre atendimentos deve ser de no máximo 240 minutos")
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
