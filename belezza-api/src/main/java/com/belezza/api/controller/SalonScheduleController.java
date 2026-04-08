package com.belezza.api.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    // ==================== SCHEDULE ENDPOINTS ====================

    @GetMapping
    public ResponseEntity<ScheduleSettingsResponse> getSchedule() {
        log.info("Getting schedule settings");

        // Mock data for development
        List<DayScheduleResponse> days = new ArrayList<>();
        days.add(new DayScheduleResponse(0, false, List.of())); // Sunday
        days.add(new DayScheduleResponse(1, true, List.of(new TimeRangeResponse("09:00", "19:00")))); // Monday
        days.add(new DayScheduleResponse(2, true, List.of(new TimeRangeResponse("09:00", "19:00")))); // Tuesday
        days.add(new DayScheduleResponse(3, true, List.of(new TimeRangeResponse("09:00", "19:00")))); // Wednesday
        days.add(new DayScheduleResponse(4, true, List.of(new TimeRangeResponse("09:00", "19:00")))); // Thursday
        days.add(new DayScheduleResponse(5, true, List.of(new TimeRangeResponse("09:00", "19:00")))); // Friday
        days.add(new DayScheduleResponse(6, true, List.of(new TimeRangeResponse("09:00", "17:00")))); // Saturday

        ScheduleSettingsResponse settings = new ScheduleSettingsResponse(
                new WeekScheduleResponse(days),
                "America/Sao_Paulo",
                30,     // slotDuration
                2,      // minAdvanceBooking (hours)
                30,     // maxAdvanceBooking (days)
                true,   // allowSameDayBooking
                10      // bufferBetweenAppointments (minutes)
        );

        return ResponseEntity.ok(settings);
    }

    @PutMapping
    public ResponseEntity<ScheduleSettingsResponse> updateSchedule(@RequestBody ScheduleSettingsRequest request) {
        log.info("Updating schedule settings");

        // In production, this would update the database
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
