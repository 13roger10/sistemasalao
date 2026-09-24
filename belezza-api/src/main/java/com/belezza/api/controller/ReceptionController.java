package com.belezza.api.controller;

import com.belezza.api.dto.agendamento.AgendamentoRequest;
import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.agendamento.ReagendamentoRequest;
import com.belezza.api.dto.cliente.ClienteRequest;
import com.belezza.api.dto.cliente.ClienteResponse;
import com.belezza.api.dto.pagamento.PagamentoRequest;
import com.belezza.api.dto.pagamento.PagamentoResponse;
import com.belezza.api.dto.recepcao.ReceptionAppointmentResponse;
import com.belezza.api.entity.Usuario;
import com.belezza.api.service.AgendamentoService;
import com.belezza.api.service.ClienteService;
import com.belezza.api.service.PagamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Dedicated endpoints for the RECEPCIONISTA role.
 * All routes under /api/recepcao/** are secured to ADMIN and RECEPCIONISTA in SecurityConfig.
 */
@RestController
@RequestMapping("/api/recepcao")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Recepção", description = "Endpoints dedicados ao perfil recepcionista")
public class ReceptionController {

    private final AgendamentoService agendamentoService;
    private final ClienteService clienteService;
    private final PagamentoService pagamentoService;

    // ─── Appointments ──────────────────────────────────────────────────────────

    @GetMapping("/appointments")
    @Operation(
        summary = "Listar agendamentos do dia",
        description = "Retorna os agendamentos de um salão na data informada (padrão: hoje), " +
                      "com o status de pagamento de cada um já embutido na resposta."
    )
    public ResponseEntity<List<ReceptionAppointmentResponse>> listarAgendamentos(
            @RequestParam Long salonId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal Usuario operador) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime dayStart = targetDate.atStartOfDay();
        LocalDateTime dayEnd = targetDate.plusDays(1).atStartOfDay();

        // Fetch all appointments for the salon (large page to get full day)
        List<AgendamentoResponse> allAppts = agendamentoService
                .listarPorSalon(salonId, PageRequest.of(0, 500), false)
                .getContent()
                .stream()
                .filter(a -> !a.getDataHora().isBefore(dayStart) && a.getDataHora().isBefore(dayEnd))
                .collect(Collectors.toList());

        // Fetch all payments for the salon and build lookup map
        Map<Long, PagamentoResponse> payMap = new HashMap<>();
        pagamentoService.listarPorSalon(salonId, PageRequest.of(0, 500), operador)
                .getContent()
                .forEach(p -> payMap.put(p.getAgendamentoId(), p));

        List<ReceptionAppointmentResponse> result = allAppts.stream()
                .map(a -> ReceptionAppointmentResponse.from(a, payMap.get(a.getId())))
                .collect(Collectors.toList());

        log.info("GET /recepcao/appointments salonId={} date={} → {} appointments", salonId, targetDate, result.size());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/appointments")
    @Operation(summary = "Criar agendamento", description = "Cria um agendamento pela recepcionista")
    public ResponseEntity<AgendamentoResponse> criarAgendamento(
            @Valid @RequestBody AgendamentoRequest request,
            @AuthenticationPrincipal Usuario operador) {

        AgendamentoResponse response = agendamentoService.criar(request, operador);
        log.info("POST /recepcao/appointments → id={}", response.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/appointments/{id}")
    @Operation(summary = "Reagendar agendamento", description = "Reagenda um agendamento para nova data/hora ou profissional")
    public ResponseEntity<AgendamentoResponse> reagendarAgendamento(
            @PathVariable Long id,
            @Valid @RequestBody ReagendamentoRequest request) {

        AgendamentoResponse response = agendamentoService.reagendar(id, request, false);
        log.info("PUT /recepcao/appointments/{} → status={}", id, response.getStatus());
        return ResponseEntity.ok(response);
    }

    // ─── Clients ───────────────────────────────────────────────────────────────

    @GetMapping("/clients")
    @Operation(
        summary = "Listar clientes",
        description = "Lista clientes do salão com dados de contato. Suporta busca por nome ou telefone. " +
                      "Dados financeiros (comissões, faturamento) nunca são incluídos."
    )
    public ResponseEntity<List<ClienteResponse>> listarClientes(
            @RequestParam Long salonId,
            @RequestParam(required = false) String search) {

        // restrictSensitiveData = false: receptionist CAN see phone/whatsapp/email
        List<ClienteResponse> clientes = clienteService.listarPorSalon(salonId, search, null, null, false);
        log.info("GET /recepcao/clients salonId={} search='{}' → {} clientes", salonId, search, clientes.size());
        return ResponseEntity.ok(clientes);
    }

    @PostMapping("/clients")
    @Operation(summary = "Cadastrar cliente", description = "Cadastra um novo cliente no salão")
    public ResponseEntity<ClienteResponse> criarCliente(
            @Valid @RequestBody ClienteRequest request) {

        Long salonId = request.getSalonId();
        if (salonId == null) {
            return ResponseEntity.badRequest().build();
        }
        ClienteResponse response = clienteService.criarComSalonId(request, salonId);
        log.info("POST /recepcao/clients → clienteId={}", response.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ─── Payments ──────────────────────────────────────────────────────────────

    @GetMapping("/payments")
    @Operation(
        summary = "Listar pagamentos",
        description = "Lista pagamentos do salão na data informada (padrão: hoje). " +
                      "Retorna apenas status Pago/Pendente — sem dados de lucro ou comissão."
    )
    public ResponseEntity<List<PagamentoResponse>> listarPagamentos(
            @RequestParam Long salonId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal Usuario operador) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime dayStart = targetDate.atStartOfDay();
        LocalDateTime dayEnd = targetDate.plusDays(1).atStartOfDay();

        List<PagamentoResponse> pagamentos = pagamentoService
                .listarPorSalon(salonId, PageRequest.of(0, 500), operador)
                .getContent()
                .stream()
                .filter(p -> {
                    LocalDateTime ts = p.getProcessadoEm() != null ? p.getProcessadoEm() : p.getCriadoEm();
                    return ts != null && !ts.isBefore(dayStart) && ts.isBefore(dayEnd);
                })
                .collect(Collectors.toList());

        log.info("GET /recepcao/payments salonId={} date={} → {} pagamentos", salonId, targetDate, pagamentos.size());
        return ResponseEntity.ok(pagamentos);
    }

    @PostMapping("/confirm-payment")
    @Operation(
        summary = "Confirmar pagamento",
        description = "Registra o pagamento de um agendamento. " +
                      "Aceita: DINHEIRO, PIX, CARTAO_CREDITO, CARTAO_DEBITO."
    )
    public ResponseEntity<PagamentoResponse> confirmarPagamento(
            @Valid @RequestBody PagamentoRequest request,
            @AuthenticationPrincipal Usuario operador) {

        PagamentoResponse response = pagamentoService.registrar(request, operador);
        log.info("POST /recepcao/confirm-payment agendamentoId={} → pagamentoId={}", request.getAgendamentoId(), response.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
