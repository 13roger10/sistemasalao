package com.belezza.api.controller;

import com.belezza.api.dto.agendamento.AgendamentoRequest;
import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.disponibilidade.DisponibilidadeRequest;
import com.belezza.api.dto.disponibilidade.DisponibilidadeResponse;
import com.belezza.api.entity.ApiKey;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Servico;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.ServicoRepository;
import com.belezza.api.service.AgendamentoService;
import com.belezza.api.service.DisponibilidadeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Public REST API v1 — authenticated by API Key (X-API-Key header).
 *
 * Base path: /api/v1/salons/{salonId}
 *
 * Endpoints:
 *   GET  /info                    → Salon info
 *   GET  /servicos                → List services
 *   GET  /profissionais           → List professionals
 *   GET  /disponibilidade         → Available time slots
 *   POST /agendamentos            → Create appointment
 */
@RestController
@RequestMapping("/api/v1/salons/{salonId}")
@RequiredArgsConstructor
@Tag(name = "API Pública v1", description = "Endpoints para integrações externas via API Key")
@SecurityRequirement(name = "ApiKeyAuth")
public class PublicApiController {

    private final SalonRepository salonRepository;
    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;
    private final DisponibilidadeService disponibilidadeService;
    private final AgendamentoService agendamentoService;

    // ── GET /info ─────────────────────────────────────────────────────────────

    @GetMapping("/info")
    @Operation(summary = "Informações do salão", description = "Retorna dados públicos do salão")
    public ResponseEntity<Map<String, Object>> info(
            @PathVariable Long salonId,
            @AuthenticationPrincipal ApiKey apiKey) {

        guardSalonAccess(apiKey, salonId);
        Salon salon = loadSalon(salonId);

        return ResponseEntity.ok(Map.of(
            "id",        salon.getId(),
            "nome",      salon.getNome(),
            "descricao", salon.getDescricao() != null ? salon.getDescricao() : "",
            "endereco",  salon.getEndereco()  != null ? salon.getEndereco()  : "",
            "cidade",    salon.getCidade()    != null ? salon.getCidade()    : "",
            "estado",    salon.getEstado()    != null ? salon.getEstado()    : "",
            "telefone",  salon.getTelefone()  != null ? salon.getTelefone()  : "",
            "logoUrl",   salon.getLogoUrl()   != null ? salon.getLogoUrl()   : ""
        ));
    }

    // ── GET /servicos ─────────────────────────────────────────────────────────

    @GetMapping("/servicos")
    @Operation(summary = "Listar serviços", description = "Retorna os serviços ativos do salão")
    public ResponseEntity<List<Map<String, Object>>> servicos(
            @PathVariable Long salonId,
            @AuthenticationPrincipal ApiKey apiKey) {

        guardSalonAccess(apiKey, salonId);
        List<Servico> list = servicoRepository.findBySalonIdAndAtivoTrue(salonId);

        List<Map<String, Object>> result = list.stream().map(s -> Map.<String, Object>of(
            "id",          s.getId(),
            "nome",        s.getNome(),
            "descricao",   s.getDescricao() != null ? s.getDescricao() : "",
            "preco",       s.getPreco(),
            "duracaoMin",  s.getDuracaoMinutos()
        )).toList();

        return ResponseEntity.ok(result);
    }

    // ── GET /profissionais ────────────────────────────────────────────────────

    @GetMapping("/profissionais")
    @Operation(summary = "Listar profissionais", description = "Retorna os profissionais ativos do salão")
    public ResponseEntity<List<Map<String, Object>>> profissionais(
            @PathVariable Long salonId,
            @AuthenticationPrincipal ApiKey apiKey) {

        guardSalonAccess(apiKey, salonId);
        List<Profissional> list = profissionalRepository.findBySalonIdAndAtivoTrue(salonId);

        List<Map<String, Object>> result = list.stream().map(p -> Map.<String, Object>of(
            "id",        p.getId(),
            "nome",      p.getUsuario().getNome(),
            "fotoUrl",   p.getFotoUrl()   != null ? p.getFotoUrl()   : "",
            "bio",       p.getBio()       != null ? p.getBio()       : ""
        )).toList();

        return ResponseEntity.ok(result);
    }

    // ── GET /disponibilidade ──────────────────────────────────────────────────

    @GetMapping("/disponibilidade")
    @Operation(
        summary = "Consultar disponibilidade",
        description = "Retorna slots disponíveis para agendamento em uma data"
    )
    public ResponseEntity<DisponibilidadeResponse> disponibilidade(
            @PathVariable Long salonId,
            @AuthenticationPrincipal ApiKey apiKey,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
            @RequestParam List<Long> servicoIds,
            @RequestParam(required = false) Long profissionalId) {

        guardSalonAccess(apiKey, salonId);

        DisponibilidadeRequest req = DisponibilidadeRequest.builder()
            .salonId(salonId)
            .data(data)
            .servicoIds(servicoIds)
            .profissionalId(profissionalId)
            .build();

        return ResponseEntity.ok(disponibilidadeService.consultarDisponibilidade(req));
    }

    // ── POST /agendamentos ────────────────────────────────────────────────────

    @PostMapping("/agendamentos")
    @Operation(
        summary = "Criar agendamento",
        description = "Cria um novo agendamento via API Key (escopo 'write' obrigatório)"
    )
    public ResponseEntity<AgendamentoResponse> criarAgendamento(
            @PathVariable Long salonId,
            @AuthenticationPrincipal ApiKey apiKey,
            @Valid @RequestBody AgendamentoRequest request) {

        guardSalonAccess(apiKey, salonId);

        if (!apiKey.hasScope("write")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // SEC-008: contexto de operador = admin do salão (equipe). O service valida que o
        // clienteId informado pertence a ESTE salão, impedindo vínculo entre estabelecimentos.
        Salon salon = loadSalon(salonId);
        AgendamentoResponse resp = agendamentoService.criar(request, salon.getAdmin());
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    // ── Guards ────────────────────────────────────────────────────────────────

    private void guardSalonAccess(ApiKey apiKey, Long salonId) {
        if (!apiKey.getSalon().getId().equals(salonId)) {
            throw new org.springframework.security.access.AccessDeniedException(
                "API key does not belong to salon " + salonId);
        }
    }

    @SuppressWarnings("null")
    private Salon loadSalon(Long salonId) {
        return salonRepository.findById(salonId)
            .orElseThrow(() -> new ResourceNotFoundException("Salão não encontrado: " + salonId));
    }
}
