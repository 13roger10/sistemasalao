package com.belezza.api.controller;

import com.belezza.api.dto.meta.*;
import com.belezza.api.service.MetaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metas")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Metas", description = "Gerenciamento de metas do salão")
public class MetaController {

    private final MetaService metaService;

    @PostMapping
    @Operation(summary = "Criar meta", description = "Cria uma nova meta")
    public ResponseEntity<MetaResponse> criar(
            @Valid @RequestBody MetaRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MetaResponse response = metaService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar metas", description = "Lista todas as metas com paginação")
    public ResponseEntity<Page<MetaResponse>> listar(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<MetaResponse> response = metaService.listar(userDetails.getUsername(), pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard de metas", description = "Retorna o dashboard com resumo das metas")
    public ResponseEntity<MetaDashboardResponse> dashboard(
            @AuthenticationPrincipal UserDetails userDetails) {
        MetaDashboardResponse response = metaService.getDashboard(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar meta", description = "Busca uma meta por ID")
    public ResponseEntity<MetaResponse> buscarPorId(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        MetaResponse response = metaService.buscarPorId(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/historico")
    @Operation(summary = "Histórico de progresso", description = "Retorna o histórico de progresso da meta")
    public ResponseEntity<List<HistoricoMetaResponse>> buscarHistorico(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<HistoricoMetaResponse> response = metaService.buscarHistorico(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar meta", description = "Atualiza uma meta existente")
    public ResponseEntity<MetaResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody MetaRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MetaResponse response = metaService.atualizar(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir meta", description = "Exclui uma meta (soft delete)")
    public ResponseEntity<Void> excluir(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        metaService.excluir(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
