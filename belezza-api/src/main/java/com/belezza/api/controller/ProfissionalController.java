package com.belezza.api.controller;

import com.belezza.api.dto.profissional.CategoriaResponse;
import com.belezza.api.dto.profissional.NivelResponse;
import com.belezza.api.dto.profissional.ProfissionalRequest;
import com.belezza.api.dto.profissional.ProfissionalResponse;
import com.belezza.api.entity.CategoriaProfissional;
import com.belezza.api.entity.NivelProfissional;
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

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/profissionais")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Profissionais", description = "Gerenciamento de profissionais do salão")
public class ProfissionalController {

    private final ProfissionalService profissionalService;

    @GetMapping("/categorias")
    @Operation(summary = "Listar categorias", description = "Lista todas as categorias de profissionais disponíveis")
    public ResponseEntity<List<CategoriaResponse>> listarCategorias() {
        List<CategoriaResponse> categorias = Arrays.stream(CategoriaProfissional.values())
                .map(c -> new CategoriaResponse(c.name(), c.getDescricao(), c.getDetalhes()))
                .toList();
        return ResponseEntity.ok(categorias);
    }

    @GetMapping("/niveis")
    @Operation(summary = "Listar níveis", description = "Lista todos os níveis de experiência profissional disponíveis")
    public ResponseEntity<List<NivelResponse>> listarNiveis() {
        List<NivelResponse> niveis = Arrays.stream(NivelProfissional.values())
                .map(n -> new NivelResponse(n.name(), n.getDescricao(), n.getDetalhes()))
                .toList();
        return ResponseEntity.ok(niveis);
    }

    @GetMapping("/salon/{salonId}/categorias")
    @Operation(summary = "Listar categorias do salão", description = "Lista categorias de profissionais ativos no salão")
    public ResponseEntity<List<CategoriaResponse>> listarCategoriasPorSalon(@PathVariable Long salonId) {
        List<CategoriaResponse> categorias = profissionalService.listarCategoriasPorSalon(salonId);
        return ResponseEntity.ok(categorias);
    }

    @GetMapping("/salon/{salonId}/categoria/{categoria}")
    @Operation(summary = "Listar por categoria", description = "Lista profissionais de uma categoria específica")
    public ResponseEntity<List<ProfissionalResponse>> listarPorCategoria(
            @PathVariable Long salonId,
            @PathVariable CategoriaProfissional categoria,
            @RequestParam(required = false, defaultValue = "true") Boolean ativo) {
        List<ProfissionalResponse> response = profissionalService.listarPorCategoria(salonId, categoria, ativo);
        return ResponseEntity.ok(response);
    }

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
    @Operation(summary = "Listar por salão", description = "Lista profissionais de um salão. Use ativo=true/false para filtrar, ou omita para listar todos.")
    public ResponseEntity<List<ProfissionalResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @RequestParam(required = false) Boolean ativo) {
        List<ProfissionalResponse> response = profissionalService.listarPorSalon(salonId, ativo);
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

    @PutMapping("/{id}/reativar")
    @AdminOnly
    @Operation(summary = "Reativar profissional", description = "Reativa um profissional que foi desativado")
    public ResponseEntity<Void> reativar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        profissionalService.reativar(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
