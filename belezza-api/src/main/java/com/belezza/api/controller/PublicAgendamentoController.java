package com.belezza.api.controller;

import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.service.AgendamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public endpoints for appointment confirmation/cancellation via token links
 * (used in WhatsApp messages, emails, etc.)
 */
@RestController
@RequestMapping("/api/public/agendamentos")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Agendamentos Públicos", description = "Ações públicas de agendamento via token")
public class PublicAgendamentoController {

    private final AgendamentoService agendamentoService;

    @GetMapping("/{token}/confirmar")
    @Operation(summary = "Confirmar via token", description = "Confirma agendamento usando token único")
    public ResponseEntity<Map<String, String>> confirmarPorToken(@PathVariable String token) {
        log.info("Confirmação de agendamento via token");
        agendamentoService.confirmarPorToken(token);
        return ResponseEntity.ok(Map.of("message", "Agendamento confirmado com sucesso!"));
    }

    @GetMapping("/{token}/cancelar")
    @Operation(summary = "Cancelar via token", description = "Cancela agendamento usando token único")
    public ResponseEntity<Map<String, String>> cancelarPorToken(
            @PathVariable String token,
            @RequestParam(required = false) String motivo) {
        log.info("Cancelamento de agendamento via token");
        agendamentoService.cancelarPorToken(token, motivo);
        return ResponseEntity.ok(Map.of("message", "Agendamento cancelado com sucesso!"));
    }
}
