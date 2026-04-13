package com.belezza.api.controller;

import com.belezza.api.dto.equipe.AlterarFuncaoRequest;
import com.belezza.api.dto.equipe.MembroStudioRequest;
import com.belezza.api.dto.equipe.MembroStudioResponse;
import com.belezza.api.security.annotation.Authenticated;
import com.belezza.api.service.EquipeStudioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing Social Studio team members and their roles.
 *
 * <p>Only PROPRIETARIO (or system ADMIN) may add/remove members or change roles.
 * Any authenticated user can list the team members of a salon they belong to.
 */
@RestController
@RequestMapping("/api/salons/{salonId}/equipe")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Equipe Studio", description = "Team membership and role management for the Social Studio")
public class EquipeStudioController {

    private final EquipeStudioService equipeStudioService;

    @GetMapping
    @Authenticated
    @Operation(summary = "List team members", description = "Returns all members and their studio roles for the salon")
    public ResponseEntity<List<MembroStudioResponse>> listar(
            @PathVariable Long salonId
    ) {
        return ResponseEntity.ok(equipeStudioService.listarMembros(salonId));
    }

    @PostMapping
    @Authenticated
    @Operation(summary = "Add team member", description = "Adds a user to the studio team (PROPRIETARIO only)")
    public ResponseEntity<MembroStudioResponse> adicionar(
            @PathVariable Long salonId,
            @Valid @RequestBody MembroStudioRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        log.info("Add studio member: email={} funcao={} salon={}", request.getEmail(), request.getFuncao(), salonId);
        MembroStudioResponse response = equipeStudioService.adicionarMembro(
                salonId,
                request.getEmail(),
                request.getFuncao(),
                userDetails.getUsername()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{membroId}/funcao")
    @Authenticated
    @Operation(summary = "Change member role", description = "Updates the studio role for an existing member (PROPRIETARIO only)")
    public ResponseEntity<MembroStudioResponse> alterarFuncao(
            @PathVariable Long salonId,
            @PathVariable Long membroId,
            @Valid @RequestBody AlterarFuncaoRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        log.info("Change studio role: membro={} novaFuncao={} salon={}", membroId, request.getFuncao(), salonId);
        MembroStudioResponse response = equipeStudioService.alterarFuncao(
                salonId,
                membroId,
                request.getFuncao(),
                userDetails.getUsername()
        );
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{membroId}")
    @Authenticated
    @Operation(summary = "Remove team member", description = "Removes a user from the studio team (PROPRIETARIO only)")
    public ResponseEntity<Void> remover(
            @PathVariable Long salonId,
            @PathVariable Long membroId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        log.info("Remove studio member: membro={} salon={}", membroId, salonId);
        equipeStudioService.removerMembro(salonId, membroId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/minha-funcao")
    @Authenticated
    @Operation(summary = "Get current user's role", description = "Returns the studio role of the authenticated user in this salon")
    public ResponseEntity<MinhaFuncaoResponse> minhaFuncao(
            @PathVariable Long salonId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        var funcao = equipeStudioService.getFuncao(salonId, userDetails.getUsername());
        return ResponseEntity.ok(new MinhaFuncaoResponse(funcao));
    }

    /** Simple response wrapper for the current user's studio role. */
    public record MinhaFuncaoResponse(com.belezza.api.entity.FuncaoStudio funcao) {}
}
