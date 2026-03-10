package com.belezza.api.controller;

import com.belezza.api.dto.user.*;
import com.belezza.api.entity.Role;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST Controller for user management.
 * Supports multi-unit access control.
 */
@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Usuários", description = "Gerenciamento de usuários do sistema")
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping
    @Operation(summary = "Listar usuários", description = "Lista usuários com paginação e filtros. Profissionais veem apenas sua unidade.")
    public ResponseEntity<UsuarioPageResponse> listar(
            @Parameter(description = "Filtrar por role") @RequestParam(required = false) Role role,
            @Parameter(description = "Buscar por nome ou email") @RequestParam(required = false) String search,
            @Parameter(description = "Página (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamanho da página") @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetails userDetails) {

        UsuarioPageResponse response = usuarioService.listar(
                userDetails.getUsername(), role, search, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar usuário por ID", description = "Retorna detalhes de um usuário específico")
    public ResponseEntity<UsuarioListResponse> buscarPorId(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        UsuarioListResponse response = usuarioService.buscarPorId(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @AdminOnly
    @Operation(summary = "Criar usuário", description = "Cria um novo usuário no sistema")
    public ResponseEntity<UsuarioListResponse> criar(
            @Valid @RequestBody CreateUsuarioRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        UsuarioListResponse response = usuarioService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar usuário", description = "Atualiza dados de um usuário existente")
    public ResponseEntity<UsuarioListResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUsuarioRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        UsuarioListResponse response = usuarioService.atualizar(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @AdminOnly
    @Operation(summary = "Desativar usuário", description = "Desativa um usuário (soft delete)")
    public ResponseEntity<Void> desativar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        usuarioService.desativar(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reativar")
    @AdminOnly
    @Operation(summary = "Reativar usuário", description = "Reativa um usuário desativado")
    public ResponseEntity<UsuarioListResponse> reativar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        UsuarioListResponse response = usuarioService.reativar(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/roles")
    @Operation(summary = "Listar roles", description = "Retorna todas as roles disponíveis")
    public ResponseEntity<List<Map<String, String>>> getRoles() {
        List<Map<String, String>> roles = Arrays.stream(Role.values())
                .map(r -> Map.of(
                        "value", r.name(),
                        "label", r.getDescription(),
                        "authority", r.getAuthority()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(roles);
    }
}
