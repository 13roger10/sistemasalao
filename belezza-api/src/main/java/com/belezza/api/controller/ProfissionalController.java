package com.belezza.api.controller;

import com.belezza.api.dto.profissional.ProfissionalRequest;
import com.belezza.api.dto.profissional.ProfissionalResponse;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.ProfissionalService;
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
@RequestMapping("/api/profissionais")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Profissionais", description = "Gerenciamento de profissionais do salão")
public class ProfissionalController {

    private final ProfissionalService profissionalService;

    @PostMapping
    @AdminOnly
    @Operation(summary = "Cadastrar profissional", description = "Cadastra um profissional no salão do admin")
    public ResponseEntity<ProfissionalResponse> criar(
            @Valid @RequestBody ProfissionalRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ProfissionalResponse response = profissionalService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar profissional", description = "Busca um profissional por ID")
    public ResponseEntity<ProfissionalResponse> buscarPorId(@PathVariable Long id) {
        ProfissionalResponse response = profissionalService.buscarPorId(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @Operation(summary = "Listar por salão", description = "Lista profissionais ativos de um salão")
    public ResponseEntity<List<ProfissionalResponse>> listarPorSalon(@PathVariable Long salonId) {
        List<ProfissionalResponse> response = profissionalService.listarPorSalon(salonId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/servico/{servicoId}")
    @Operation(summary = "Listar por serviço", description = "Lista profissionais que realizam um serviço")
    public ResponseEntity<List<ProfissionalResponse>> listarPorServico(@PathVariable Long servicoId) {
        List<ProfissionalResponse> response = profissionalService.listarPorServico(servicoId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}/disponiveis")
    @Operation(summary = "Listar disponíveis online", description = "Lista profissionais que aceitam agendamento online")
    public ResponseEntity<List<ProfissionalResponse>> listarDisponiveisOnline(@PathVariable Long salonId) {
        List<ProfissionalResponse> response = profissionalService.listarDisponiveisOnline(salonId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @AdminOnly
    @Operation(summary = "Atualizar profissional", description = "Atualiza dados de um profissional")
    public ResponseEntity<ProfissionalResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody ProfissionalRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ProfissionalResponse response = profissionalService.atualizar(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @AdminOnly
    @Operation(summary = "Desativar profissional", description = "Desativa um profissional (soft delete)")
    public ResponseEntity<Void> desativar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        profissionalService.desativar(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
