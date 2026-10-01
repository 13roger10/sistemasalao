package com.belezza.api.controller;

import com.belezza.api.dto.auth.AuthResponse;
import com.belezza.api.security.TenantContext;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.AuthService;
import com.belezza.api.service.EquipeUnidadeService;
import com.belezza.api.service.TenantIsolationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Profissionais e recepcionistas em várias unidades do mesmo dono: o admin define as unidades de
 * cada um, e quem está em mais de uma escolhe em qual trabalha (sessão nova com a unidade).
 */
@RestController
@RequestMapping("/api/equipe/unidades")
@RequiredArgsConstructor
@Tag(name = "Equipe em unidades", description = "Vínculo de profissionais e recepcionistas com as unidades")
public class EquipeUnidadeController {

    private final EquipeUnidadeService equipeUnidadeService;
    private final AuthService authService;
    private final TenantIsolationService tenantIsolationService;

    @GetMapping("/minhas")
    @PreAuthorize("hasAnyRole('PROFISSIONAL', 'RECEPCIONISTA')")
    @Operation(summary = "Minhas unidades", description = "Unidades em que o profissional/recepcionista logado pode trabalhar")
    public ResponseEntity<List<Map<String, Object>>> minhas(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(equipeUnidadeService.minhasUnidades(userDetails.getUsername()));
    }

    @PostMapping("/{salonId}/entrar")
    @PreAuthorize("hasAnyRole('PROFISSIONAL', 'RECEPCIONISTA')")
    @Operation(summary = "Entrar na unidade", description = "Troca a unidade da sessão e devolve tokens novos")
    public ResponseEntity<AuthResponse> entrar(@PathVariable Long salonId, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(authService.trocarUnidade(userDetails.getUsername(), salonId));
    }

    @GetMapping("/membros/{usuarioId}")
    @AdminOnly
    @Operation(summary = "Unidades do membro da equipe", description = "Unidades do estabelecimento e se o profissional/recepcionista está vinculado")
    public ResponseEntity<List<Map<String, Object>>> unidadesDoMembro(@PathVariable Long usuarioId) {
        Long salonId = TenantContext.getCurrentTenant();
        tenantIsolationService.assertStaffTenant(salonId);
        return ResponseEntity.ok(equipeUnidadeService.unidadesDoMembro(usuarioId, salonId));
    }

    @PutMapping("/membros/{usuarioId}")
    @AdminOnly
    @Operation(summary = "Vincular membro da equipe às unidades", description = "A unidade atual do admin continua sempre")
    public ResponseEntity<List<Map<String, Object>>> atualizar(@PathVariable Long usuarioId,
                                                               @RequestBody Map<String, List<Long>> body) {
        Long salonId = TenantContext.getCurrentTenant();
        tenantIsolationService.assertStaffTenant(salonId);
        return ResponseEntity.ok(equipeUnidadeService.atualizarUnidades(usuarioId, body.get("salonIds"), salonId));
    }
}
