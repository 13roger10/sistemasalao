package com.belezza.api.controller;

import com.belezza.api.dto.auth.AuthResponse;
import com.belezza.api.dto.salon.UnidadeRequest;
import com.belezza.api.dto.salon.UnidadeResponse;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.AuthService;
import com.belezza.api.service.UnidadeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Unidades do administrador (cada uma é um salão independente). Só o próprio admin vê e altera
 * as suas; "entrar" troca a unidade da sessão e devolve tokens novos com ela.
 */
@RestController
@RequestMapping("/api/salon/units")
@RequiredArgsConstructor
@AdminOnly
@Tag(name = "Unidades", description = "Várias unidades (salões/barbearias) do mesmo administrador")
public class UnidadeController {

    private final UnidadeService unidadeService;
    private final AuthService authService;

    @GetMapping
    @Operation(summary = "Listar unidades", description = "Unidades do admin, com totais e a unidade em uso")
    public ResponseEntity<List<UnidadeResponse>> listar(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(unidadeService.listar(userDetails.getUsername()));
    }

    @PostMapping
    @Operation(summary = "Criar unidade", description = "Cria uma unidade com as regras e horários da unidade atual")
    public ResponseEntity<UnidadeResponse> criar(@Valid @RequestBody UnidadeRequest request,
                                                 @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(unidadeService.criar(request, userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar unidade")
    public ResponseEntity<UnidadeResponse> atualizar(@PathVariable Long id, @Valid @RequestBody UnidadeRequest request,
                                                     @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(unidadeService.atualizar(id, request, userDetails.getUsername()));
    }

    @PostMapping("/{id}/ativar")
    @Operation(summary = "Ativar unidade")
    public ResponseEntity<UnidadeResponse> ativar(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(unidadeService.ativar(id, userDetails.getUsername()));
    }

    @PostMapping("/{id}/desativar")
    @Operation(summary = "Desativar unidade", description = "Não vale para a unidade em uso")
    public ResponseEntity<UnidadeResponse> desativar(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(unidadeService.desativar(id, userDetails.getUsername()));
    }

    @PostMapping("/{id}/entrar")
    @Operation(summary = "Entrar na unidade", description = "Troca a unidade da sessão e devolve tokens novos")
    public ResponseEntity<AuthResponse> entrar(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(authService.trocarUnidade(userDetails.getUsername(), id));
    }
}
