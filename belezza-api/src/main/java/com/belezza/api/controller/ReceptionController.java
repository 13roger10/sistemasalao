package com.belezza.api.controller;

import com.belezza.api.dto.agendamento.AgendamentoRequest;
import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.agendamento.ReagendamentoRequest;
import com.belezza.api.dto.cliente.ClienteRequest;
import com.belezza.api.dto.cliente.ClienteResponse;
import com.belezza.api.dto.pagamento.PagamentoRequest;
import com.belezza.api.dto.pagamento.PagamentoResponse;
import com.belezza.api.dto.recepcao.ReceptionAppointmentResponse;
import com.belezza.api.entity.StatusPagamento;
import com.belezza.api.entity.Usuario;
import com.belezza.api.security.TenantContext;
import com.belezza.api.service.AgendamentoService;
import com.belezza.api.service.ClienteService;
import com.belezza.api.service.PagamentoService;
import com.belezza.api.service.TenantIsolationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.belezza.api.repository.PagamentoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.Comparator;
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
    private final TenantIsolationService tenantIsolationService;
    private final PagamentoRepository pagamentoRepository;

    // ─── Appointments ──────────────────────────────────────────────────────────

    @GetMapping("/appointments")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @Operation(
        summary = "Listar agendamentos do dia",
        description = "Retorna os agendamentos de um salão na data informada (padrão: hoje), " +
                      "com o status de pagamento de cada um já embutido na resposta."
    )
    public ResponseEntity<List<ReceptionAppointmentResponse>> listarAgendamentos(
            @RequestParam Long salonId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal Usuario operador) {

        tenantIsolationService.assertStaffTenant(salonId);
        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime dayStart = targetDate.atStartOfDay();
        LocalDateTime dayEnd = targetDate.plusDays(1).atStartOfDay();

        // Agendamentos do dia filtrados no banco (BUG-036: antes vinham os 500 primeiros do salão —
        // os mais antigos — e o dia era filtrado aqui; num salão grande os de hoje ficavam de fora)
        List<AgendamentoResponse> allAppts = agendamentoService
                .listarPorSalon(salonId, targetDate, targetDate,
                        PageRequest.of(0, 1000, Sort.by("dataHora")), false, operador)
                .getContent();

        // Status de pagamento de cada atendimento do dia, pelos próprios atendimentos. Antes vinha
        // dos 500 primeiros pagamentos do salão (e, para a recepcionista, só dos que ela registrou):
        // atendimento pago aparecia como pendente. Pagamento dividido tem várias partes: agrega.
        Map<Long, PagamentoResponse> payMap = new HashMap<>();
        List<Long> ids = allAppts.stream().map(AgendamentoResponse::getId).toList();
        if (!ids.isEmpty()) {
            pagamentoRepository.findByAgendamentoIdIn(ids).stream()
                    .map(PagamentoResponse::fromEntity)
                    .collect(Collectors.groupingBy(PagamentoResponse::getAgendamentoId))
                    .forEach((agendamentoId, partes) -> payMap.put(agendamentoId, agregarPartes(partes)));
        }

        List<ReceptionAppointmentResponse> result = allAppts.stream()
                .map(a -> ReceptionAppointmentResponse.from(a, payMap.get(a.getId())))
                .collect(Collectors.toList());

        log.info("GET /recepcao/appointments salonId={} date={} → {} appointments", salonId, targetDate, result.size());
        return ResponseEntity.ok(result);
    }

    /**
     * Resumo das partes de pagamento de um atendimento: pago se houver parte aprovada, valor =
     * soma das aprovadas e formas juntas (ex.: "PIX + Dinheiro"); sem aprovadas, a parte mais recente.
     */
    private PagamentoResponse agregarPartes(List<PagamentoResponse> partes) {
        List<PagamentoResponse> aprovadas = partes.stream()
                .filter(p -> p.getStatus() == StatusPagamento.APROVADO)
                .toList();
        if (aprovadas.isEmpty()) {
            return partes.stream().max(Comparator.comparing(PagamentoResponse::getId)).orElseThrow();
        }
        PagamentoResponse base = aprovadas.stream().max(Comparator.comparing(PagamentoResponse::getId)).orElseThrow();
        return PagamentoResponse.builder()
                .id(base.getId())
                .agendamentoId(base.getAgendamentoId())
                .salonId(base.getSalonId())
                .status(StatusPagamento.APROVADO)
                .statusDescricao(base.getStatusDescricao())
                .forma(base.getForma())
                .formaDescricao(aprovadas.stream().map(PagamentoResponse::getFormaDescricao).distinct()
                        .collect(Collectors.joining(" + ")))
                .valor(aprovadas.stream().map(PagamentoResponse::getValor).reduce(BigDecimal.ZERO, BigDecimal::add))
                .processadoEm(base.getProcessadoEm())
                .criadoEm(base.getCriadoEm())
                .partes(aprovadas)
                .build();
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
            @Valid @RequestBody ReagendamentoRequest request,
            @AuthenticationPrincipal Usuario operador) {

        // Passa o operador para o service aplicar a verificação de salão — a sobrecarga sem
        // operador pulava essa verificação e permitia reagendar agendamentos de outro salão.
        AgendamentoResponse response = agendamentoService.reagendar(id, request, false, false, operador);
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

        tenantIsolationService.assertStaffTenant(salonId);
        // restrictSensitiveData = false: receptionist CAN see phone/whatsapp/email
        List<ClienteResponse> clientes = clienteService.listarPorSalon(salonId, search, null, null, false);
        log.info("GET /recepcao/clients salonId={} search='{}' → {} clientes", salonId, search, clientes.size());
        return ResponseEntity.ok(clientes);
    }

    @PostMapping("/clients")
    @Operation(summary = "Cadastrar cliente", description = "Cadastra um novo cliente no salão")
    public ResponseEntity<ClienteResponse> criarCliente(
            @Valid @RequestBody ClienteRequest request) {

        // O cliente é criado no salão de quem cadastra; um salonId de outro salão é negado.
        Long salonId = request.getSalonId() != null ? request.getSalonId() : TenantContext.getCurrentTenant();
        tenantIsolationService.assertStaffTenant(salonId);
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

        tenantIsolationService.assertStaffTenant(salonId);
        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDateTime dayStart = targetDate.atStartOfDay();
        LocalDateTime dayEnd = targetDate.plusDays(1).atStartOfDay();

        // Mais recentes primeiro: os do dia pedido vêm antes (antes a página trazia os 500 mais antigos)
        List<PagamentoResponse> pagamentos = pagamentoService
                .listarPorSalon(salonId, PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "criadoEm")), operador)
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
