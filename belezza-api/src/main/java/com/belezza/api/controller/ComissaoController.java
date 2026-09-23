package com.belezza.api.controller;

import com.belezza.api.dto.comissao.ComissaoResumoResponse;
import com.belezza.api.dto.comissao.ComissaoResponse;
import com.belezza.api.dto.comissao.ConfiguracaoComissaoRequest;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.entity.StatusComissao;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.ComissaoService;
import com.belezza.api.service.TenantIsolationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Commission data is per-professional pay information. A PROFISSIONAL may only see their
 * own commissions (never a coworker's), and any salon-wide view is ADMIN-only — mirroring
 * the fix applied to FinanceController. All salonId/profissionalId-scoped reads are also
 * tenant-checked via TenantIsolationService, closing the same class of gap found and fixed
 * elsewhere in this codebase (agendamentos, clientes, profissionais, financeiro).
 */
@RestController
@RequestMapping("/api/comissoes")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Comissoes", description = "Gerenciamento de comissoes dos profissionais")
public class ComissaoController {

    private final ComissaoService comissaoService;
    private final TenantIsolationService tenantIsolationService;
    private final ProfissionalRepository profissionalRepository;

    /**
     * A PROFISSIONAL may only access their own commissions. ADMIN passes through
     * unconditionally (tenant isolation for ADMIN is enforced separately, by salonId).
     */
    private void enforceProfissionalOwnership(Long profissionalId, Usuario operador) {
        if (operador == null || operador.getRole() != Role.PROFISSIONAL) {
            return;
        }
        Long meuProfissionalId = profissionalRepository.findByUsuarioId(operador.getId())
                .map(p -> p.getId())
                .orElseThrow(() -> new AccessDeniedException("Profissional não encontrado para este usuário"));
        if (!meuProfissionalId.equals(profissionalId)) {
            throw new AccessDeniedException("Acesso negado: profissional só pode ver as próprias comissões");
        }
    }

    @GetMapping("/{id}")
    @ProfissionalOrAdmin
    @Operation(summary = "Buscar comissao", description = "Busca uma comissao pelo ID. Profissional só vê as próprias.")
    public ResponseEntity<ComissaoResponse> buscarPorId(@PathVariable Long id, @AuthenticationPrincipal Usuario operador) {
        ComissaoResponse response = comissaoService.buscarPorId(id);
        tenantIsolationService.assertCurrentTenant(response.getSalonId());
        enforceProfissionalOwnership(response.getProfissionalId(), operador);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @AdminOnly
    @Operation(summary = "Listar por salao", description = "Lista comissoes de todos os profissionais de um salao. Restrito ao Admin.")
    public ResponseEntity<Page<ComissaoResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        tenantIsolationService.assertRequestedSalon(salonId);
        Page<ComissaoResponse> response = comissaoService.listarPorSalon(salonId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar por profissional", description = "Lista comissoes de um profissional. Profissional só vê as próprias.")
    public ResponseEntity<Page<ComissaoResponse>> listarPorProfissional(
            @PathVariable Long profissionalId,
            @RequestParam(required = false) StatusComissao status,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable,
            @AuthenticationPrincipal Usuario operador) {
        enforceProfissionalOwnership(profissionalId, operador);
        Page<ComissaoResponse> response;
        if (status != null) {
            response = comissaoService.listarPorProfissionalEStatus(profissionalId, status, pageable);
        } else {
            response = comissaoService.listarPorProfissional(profissionalId, pageable);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}/resumo")
    @AdminOnly
    @Operation(summary = "Resumo por salao", description = "Retorna resumo de comissoes por profissional. Restrito ao Admin.")
    public ResponseEntity<List<ComissaoResumoResponse>> resumoPorSalon(
            @PathVariable Long salonId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        tenantIsolationService.assertRequestedSalon(salonId);
        List<ComissaoResumoResponse> response = comissaoService.resumoPorSalon(salonId, inicio, fim);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}/pendentes")
    @ProfissionalOrAdmin
    @Operation(summary = "Total pendente", description = "Retorna total de comissoes pendentes de um profissional. Profissional só vê o próprio.")
    public ResponseEntity<BigDecimal> totalPendentes(@PathVariable Long profissionalId, @AuthenticationPrincipal Usuario operador) {
        enforceProfissionalOwnership(profissionalId, operador);
        BigDecimal total = comissaoService.totalComissoesPendentes(profissionalId);
        return ResponseEntity.ok(total);
    }

    @PutMapping("/profissional/{profissionalId}/configurar")
    @AdminOnly
    @Operation(summary = "Configurar comissao", description = "Configura tipo e valor de comissao de um profissional. Restrito ao Admin — um profissional nunca pode definir a própria taxa.")
    public ResponseEntity<Void> configurarComissao(
            @PathVariable Long profissionalId,
            @Valid @RequestBody ConfiguracaoComissaoRequest request) {
        comissaoService.configurarComissaoProfissional(profissionalId, request);
        return ResponseEntity.ok().build();
    }
}
