package com.belezza.api.controller;

import com.belezza.api.dto.salon.SalonRequest;
import com.belezza.api.dto.salon.SalonResponse;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.SalonService;
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

@RestController
@RequestMapping("/api/salons")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Salões", description = "Gerenciamento de salões de beleza")
public class SalonController {

    private final SalonService salonService;

    @PostMapping
    @AdminOnly
    @Operation(summary = "Criar salão", description = "Cria um novo salão para o admin autenticado")
    public ResponseEntity<SalonResponse> criar(
            @Valid @RequestBody SalonRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        SalonResponse response = salonService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/meu")
    @AdminOnly
    @Operation(summary = "Meu salão", description = "Retorna o salão do admin autenticado")
    public ResponseEntity<SalonResponse> meuSalon(@AuthenticationPrincipal UserDetails userDetails) {
        SalonResponse response = salonService.buscarPorAdmin(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar salão", description = "Busca um salão por ID")
    public ResponseEntity<SalonResponse> buscarPorId(@PathVariable Long id) {
        SalonResponse response = salonService.buscarPorId(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Listar salões", description = "Lista todos os salões ativos")
    public ResponseEntity<List<SalonResponse>> listar() {
        List<SalonResponse> response = salonService.listarAtivos();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @AdminOnly
    @Operation(summary = "Atualizar salão", description = "Atualiza dados do salão")
    public ResponseEntity<SalonResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody SalonRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        SalonResponse response = salonService.atualizar(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @AdminOnly
    @Operation(summary = "Desativar salão", description = "Desativa um salão (soft delete)")
    public ResponseEntity<Void> desativar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        salonService.desativar(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
