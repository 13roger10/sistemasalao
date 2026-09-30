package com.belezza.api.controller;

import com.belezza.api.dto.servico.ServicoRequest;
import com.belezza.api.dto.servico.ServicoResponse;
import com.belezza.api.entity.TipoServico;
import com.belezza.api.entity.Usuario;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.IndisponibilidadeService;
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
    private final IndisponibilidadeService indisponibilidadeService;

    @PostMapping
    @AdminOnly
    @Operation(summary = "Criar serviço", description = "Cria um novo serviço no salão do admin")
    public ResponseEntity<ServicoResponse> criar(
            @Valid @RequestBody ServicoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ServicoResponse response = servicoService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/categories")
    @Operation(summary = "Listar categorias", description = "Lista todas as categorias de serviços disponíveis")
    public ResponseEntity<List<CategoryResponse>> listarCategorias() {
        List<CategoryResponse> categories = java.util.Arrays.stream(TipoServico.values())
            .map(tipo -> new CategoryResponse(
                tipo.name().toLowerCase(),
                tipo.getDescription(),
                "Serviços de " + tipo.getDescription().toLowerCase(),
                tipo.ordinal() + 1,
                "active"
            ))
            .toList();
        return ResponseEntity.ok(categories);
    }

    public record CategoryResponse(
        String id,
        String name,
        String description,
        int order,
        String status
    ) {}

    @GetMapping("/{id:\\d+}")
    @Operation(summary = "Buscar serviço", description = "Busca um serviço por ID")
    public ResponseEntity<ServicoResponse> buscarPorId(@PathVariable Long id) {
        ServicoResponse response = servicoService.buscarPorId(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @Operation(summary = "Listar serviços do salão", description = "Lista os serviços ativos de um salão; status=inactive lista os desativados")
    public ResponseEntity<List<ServicoResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @RequestParam(required = false) String status) {
        List<ServicoResponse> response = servicoService.listarPorSalon(salonId, status);
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

    @PutMapping("/{id:\\d+}")
    @AdminOnly
    @Operation(summary = "Atualizar serviço", description = "Atualiza um serviço existente")
    public ResponseEntity<ServicoResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody ServicoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ServicoResponse response = servicoService.atualizar(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id:\\d+}")
    @AdminOnly
    @Operation(summary = "Desativar serviço", description = "Desativa um serviço (soft delete). acao=cancelar (cancela e avisa os clientes) ou acao=manter (remanejar à mão). Sem acao, havendo agendamentos marcados, responde 409 com a lista em agendamentosAfetados.")
    public ResponseEntity<Void> desativar(
            @PathVariable Long id,
            @RequestParam(required = false) String acao,
            @AuthenticationPrincipal Usuario operador) {
        indisponibilidadeService.desativarServico(id, acao, operador);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id:\\d+}/reativar")
    @AdminOnly
    @Operation(summary = "Reativar serviço", description = "Volta a oferecer um serviço desativado")
    public ResponseEntity<ServicoResponse> reativar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(servicoService.reativar(id, userDetails.getUsername()));
    }
}
