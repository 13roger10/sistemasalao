package com.belezza.api.controller;

import com.belezza.api.dto.horario.BloqueioHorarioRequest;
import com.belezza.api.dto.horario.BloqueioHorarioResponse;
import com.belezza.api.dto.horario.HorarioTrabalhoRequest;
import com.belezza.api.dto.horario.HorarioTrabalhoResponse;
import com.belezza.api.entity.DiaSemana;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.security.TenantContext;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.BloqueioHorarioService;
import com.belezza.api.service.HorarioTrabalhoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/profissionais/{profissionalId}")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Horários e Bloqueios", description = "Gerenciamento de horários de trabalho e bloqueios")
public class HorarioController {

    private final HorarioTrabalhoService horarioTrabalhoService;
    private final BloqueioHorarioService bloqueioHorarioService;
    private final ProfissionalRepository profissionalRepository;

    /**
     * Quem pode alterar horários e bloqueios de um profissional: o ADMIN do mesmo salão
     * ou o próprio profissional. Sem isto, qualquer PROFISSIONAL alterava a agenda de um
     * colega e qualquer ADMIN a de profissionais de outros salões.
     */
    private void verificarPermissaoAgenda(Long profissionalId, Usuario operador) {
        Profissional profissional = profissionalRepository.findById(profissionalId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional", profissionalId));

        Long tenant = TenantContext.getCurrentTenant();
        if (tenant == null || !tenant.equals(profissional.getSalon().getId())) {
            throw new AccessDeniedException("Acesso negado: profissional pertence a outro estabelecimento");
        }

        if (operador.getRole() == Role.PROFISSIONAL) {
            boolean propriaAgenda = profissionalRepository.findByUsuarioId(operador.getId())
                    .map(p -> p.getId().equals(profissionalId))
                    .orElse(false);
            if (!propriaAgenda) {
                throw new AccessDeniedException("Acesso negado: profissional só pode alterar a própria agenda");
            }
        }
    }

    // --- Horários de Trabalho ---

    @PostMapping("/horarios")
    @ProfissionalOrAdmin
    @Operation(summary = "Criar horário de trabalho", description = "Define horário de trabalho para um dia da semana")
    public ResponseEntity<HorarioTrabalhoResponse> criarHorario(
            @PathVariable Long profissionalId,
            @Valid @RequestBody HorarioTrabalhoRequest request,
            @AuthenticationPrincipal Usuario operador) {
        verificarPermissaoAgenda(profissionalId, operador);
        HorarioTrabalhoResponse response = horarioTrabalhoService.criar(profissionalId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/horarios")
    @Operation(summary = "Listar horários", description = "Lista todos os horários de trabalho do profissional")
    public ResponseEntity<List<HorarioTrabalhoResponse>> listarHorarios(@PathVariable Long profissionalId) {
        List<HorarioTrabalhoResponse> response = horarioTrabalhoService.listarPorProfissional(profissionalId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/horarios/{diaSemana}")
    @ProfissionalOrAdmin
    @Operation(summary = "Atualizar horário", description = "Atualiza horário de trabalho de um dia da semana")
    public ResponseEntity<HorarioTrabalhoResponse> atualizarHorario(
            @PathVariable Long profissionalId,
            @PathVariable DiaSemana diaSemana,
            @Valid @RequestBody HorarioTrabalhoRequest request,
            @AuthenticationPrincipal Usuario operador) {
        verificarPermissaoAgenda(profissionalId, operador);
        HorarioTrabalhoResponse response = horarioTrabalhoService.atualizar(profissionalId, diaSemana, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/horarios/{diaSemana}")
    @ProfissionalOrAdmin
    @Operation(summary = "Desativar horário", description = "Desativa horário de trabalho de um dia")
    public ResponseEntity<Void> desativarHorario(
            @PathVariable Long profissionalId,
            @PathVariable DiaSemana diaSemana,
            @AuthenticationPrincipal Usuario operador) {
        verificarPermissaoAgenda(profissionalId, operador);
        horarioTrabalhoService.desativar(profissionalId, diaSemana);
        return ResponseEntity.noContent().build();
    }

    // --- Bloqueios de Horário ---

    @PostMapping("/bloqueios")
    @ProfissionalOrAdmin
    @Operation(summary = "Criar bloqueio", description = "Cria bloqueio de horário (férias, folga, etc)")
    public ResponseEntity<BloqueioHorarioResponse> criarBloqueio(
            @PathVariable Long profissionalId,
            @Valid @RequestBody BloqueioHorarioRequest request,
            @AuthenticationPrincipal Usuario operador) {
        verificarPermissaoAgenda(profissionalId, operador);
        BloqueioHorarioResponse response = bloqueioHorarioService.criar(profissionalId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/bloqueios")
    @Operation(summary = "Listar bloqueios", description = "Lista bloqueios de horário do profissional")
    public ResponseEntity<List<BloqueioHorarioResponse>> listarBloqueios(
            @PathVariable Long profissionalId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fim) {
        List<BloqueioHorarioResponse> response;
        if (inicio != null && fim != null) {
            response = bloqueioHorarioService.listarPorPeriodo(profissionalId, inicio, fim);
        } else {
            response = bloqueioHorarioService.listarPorProfissional(profissionalId);
        }
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/bloqueios/{bloqueioId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Remover bloqueio", description = "Remove um bloqueio de horário")
    public ResponseEntity<Void> removerBloqueio(
            @PathVariable Long profissionalId,
            @PathVariable Long bloqueioId,
            @AuthenticationPrincipal Usuario operador) {
        verificarPermissaoAgenda(profissionalId, operador);
        bloqueioHorarioService.remover(profissionalId, bloqueioId);
        return ResponseEntity.noContent().build();
    }
}
