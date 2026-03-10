package com.belezza.api.controller;

import com.belezza.api.dto.servico.ServicoRequest;
import com.belezza.api.dto.servico.ServicoResponse;
import com.belezza.api.entity.TipoServico;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.ServicoService;
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
@RequestMapping("/api/servicos")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Serviços", description = "Gerenciamento de serviços do salão")
public class ServicoController {

    private final ServicoService servicoService;

    @PostMapping
    @AdminOnly
    @Operation(summary = "Criar serviço", description = "Cria um novo serviço no salão do admin")
    public ResponseEntity<ServicoResponse> criar(
            @Valid @RequestBody ServicoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ServicoResponse response = servicoService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar serviço", description = "Busca um serviço por ID")
    public ResponseEntity<ServicoResponse> buscarPorId(@PathVariable Long id) {
        ServicoResponse response = servicoService.buscarPorId(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @Operation(summary = "Listar serviços do salão", description = "Lista todos os serviços ativos de um salão")
    public ResponseEntity<List<ServicoResponse>> listarPorSalon(@PathVariable Long salonId) {
        List<ServicoResponse> response = servicoService.listarPorSalon(salonId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}/tipo/{tipo}")
    @Operation(summary = "Listar serviços por tipo", description = "Lista serviços de um salão filtrados por tipo")
    public ResponseEntity<List<ServicoResponse>> listarPorTipo(
            @PathVariable Long salonId,
            @PathVariable TipoServico tipo) {
        List<ServicoResponse> response = servicoService.listarPorSalonETipo(salonId, tipo);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @AdminOnly
    @Operation(summary = "Atualizar serviço", description = "Atualiza um serviço existente")
    public ResponseEntity<ServicoResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody ServicoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ServicoResponse response = servicoService.atualizar(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @AdminOnly
    @Operation(summary = "Desativar serviço", description = "Desativa um serviço (soft delete)")
    public ResponseEntity<Void> desativar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        servicoService.desativar(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
