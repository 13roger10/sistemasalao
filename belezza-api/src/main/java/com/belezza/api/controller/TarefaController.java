package com.belezza.api.controller;

import com.belezza.api.dto.tarefa.TarefaRequest;
import com.belezza.api.dto.tarefa.TarefaResponse;
import com.belezza.api.dto.tarefa.TarefaStatusRequest;
import com.belezza.api.entity.StatusTarefa;
import com.belezza.api.service.TarefaService;
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
@RequestMapping("/api/tarefas")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Tarefas", description = "Gerenciamento de tarefas do salão")
public class TarefaController {

    private final TarefaService tarefaService;

    @PostMapping
    @Operation(summary = "Criar tarefa", description = "Cria uma nova tarefa no salão")
    public ResponseEntity<TarefaResponse> criar(
            @Valid @RequestBody TarefaRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        TarefaResponse response = tarefaService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar tarefas", description = "Lista todas as tarefas do salão com paginação")
    public ResponseEntity<Page<TarefaResponse>> listar(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 20, sort = "dataPrevista") Pageable pageable) {
        Page<TarefaResponse> response = tarefaService.listar(userDetails.getUsername(), pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/minhas")
    @Operation(summary = "Minhas tarefas", description = "Lista as tarefas atribuídas ao usuário logado")
    public ResponseEntity<List<TarefaResponse>> minhasTarefas(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<TarefaResponse> response = tarefaService.listarMinhasTarefas(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/hoje")
    @Operation(summary = "Tarefas do dia", description = "Lista as tarefas previstas para hoje")
    public ResponseEntity<List<TarefaResponse>> tarefasHoje(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<TarefaResponse> response = tarefaService.listarTarefasHoje(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/atrasadas")
    @Operation(summary = "Tarefas atrasadas", description = "Lista as tarefas atrasadas")
    public ResponseEntity<List<TarefaResponse>> tarefasAtrasadas(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<TarefaResponse> response = tarefaService.listarAtrasadas(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Tarefas por status", description = "Lista as tarefas por status")
    public ResponseEntity<List<TarefaResponse>> tarefasPorStatus(
            @PathVariable StatusTarefa status,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<TarefaResponse> response = tarefaService.listarPorStatus(userDetails.getUsername(), status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/categorias")
    @Operation(summary = "Listar categorias", description = "Lista as categorias de tarefas utilizadas")
    public ResponseEntity<List<String>> listarCategorias(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<String> response = tarefaService.listarCategorias(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar tarefa", description = "Busca uma tarefa por ID")
    public ResponseEntity<TarefaResponse> buscarPorId(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        TarefaResponse response = tarefaService.buscarPorId(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar tarefa", description = "Atualiza uma tarefa existente")
    public ResponseEntity<TarefaResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody TarefaRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        TarefaResponse response = tarefaService.atualizar(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Alterar status", description = "Altera o status de uma tarefa")
    public ResponseEntity<TarefaResponse> alterarStatus(
            @PathVariable Long id,
            @Valid @RequestBody TarefaStatusRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        TarefaResponse response = tarefaService.alterarStatus(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/concluir")
    @Operation(summary = "Concluir tarefa", description = "Marca uma tarefa como concluída")
    public ResponseEntity<TarefaResponse> concluir(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        TarefaResponse response = tarefaService.concluir(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir tarefa", description = "Exclui uma tarefa (soft delete)")
    public ResponseEntity<Void> excluir(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        tarefaService.excluir(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
