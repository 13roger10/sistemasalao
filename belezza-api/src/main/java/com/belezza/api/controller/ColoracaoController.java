package com.belezza.api.controller;

import com.belezza.api.dto.coloracao.*;
import com.belezza.api.entity.SubtomPele;
import com.belezza.api.entity.TomPele;
import com.belezza.api.service.ColoracaoService;
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
@RequestMapping("/api/coloracao")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Coloração", description = "Consultoria de coloração e ficha técnica")
public class ColoracaoController {

    private final ColoracaoService coloracaoService;

    // ====== FICHA DE COLORAÇÃO ======

    @PostMapping("/ficha")
    @Operation(summary = "Criar ficha", description = "Cria uma ficha de coloração para o cliente")
    public ResponseEntity<FichaColoracaoResponse> criarFicha(
            @Valid @RequestBody FichaColoracaoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        FichaColoracaoResponse response = coloracaoService.criarFicha(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/ficha/cliente/{clienteId}")
    @Operation(summary = "Buscar ficha por cliente", description = "Busca a ficha de coloração de um cliente")
    public ResponseEntity<FichaColoracaoResponse> buscarFichaPorCliente(
            @PathVariable Long clienteId,
            @AuthenticationPrincipal UserDetails userDetails) {
        FichaColoracaoResponse response = coloracaoService.buscarFichaPorCliente(clienteId, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/ficha/{id}")
    @Operation(summary = "Atualizar ficha", description = "Atualiza uma ficha de coloração")
    public ResponseEntity<FichaColoracaoResponse> atualizarFicha(
            @PathVariable Long id,
            @Valid @RequestBody FichaColoracaoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        FichaColoracaoResponse response = coloracaoService.atualizarFicha(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // ====== HISTÓRICO ======

    @PostMapping("/historico")
    @Operation(summary = "Registrar coloração", description = "Registra um serviço de coloração realizado")
    public ResponseEntity<HistoricoColoracaoResponse> registrarColoracao(
            @Valid @RequestBody HistoricoColoracaoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        HistoricoColoracaoResponse response = coloracaoService.registrarColoracao(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/historico/cliente/{clienteId}")
    @Operation(summary = "Histórico do cliente", description = "Lista o histórico de coloração de um cliente")
    public ResponseEntity<List<HistoricoColoracaoResponse>> buscarHistoricoCliente(
            @PathVariable Long clienteId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<HistoricoColoracaoResponse> response = coloracaoService.buscarHistoricoCliente(clienteId, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/historico/{id}")
    @Operation(summary = "Detalhes do histórico", description = "Busca detalhes de um registro de coloração")
    public ResponseEntity<HistoricoColoracaoResponse> buscarHistoricoPorId(@PathVariable Long id) {
        HistoricoColoracaoResponse response = coloracaoService.buscarHistoricoPorId(id);
        return ResponseEntity.ok(response);
    }

    // ====== SUGESTÃO ======

    @PostMapping("/sugestao")
    @Operation(summary = "Sugerir tonalidade", description = "Sugere tonalidades baseado no tom e subtom de pele")
    public ResponseEntity<SugestaoTonalidade> sugerirTonalidade(
            @RequestParam TomPele tomPele,
            @RequestParam SubtomPele subtomPele) {
        SugestaoTonalidade response = coloracaoService.sugerirTonalidade(tomPele, subtomPele);
        return ResponseEntity.ok(response);
    }

    // ====== ENUMS ======

    @GetMapping("/enums")
    @Operation(summary = "Listar enums", description = "Lista todos os enums disponíveis para coloração")
    public ResponseEntity<ColoracaoEnumsResponse> getEnums() {
        ColoracaoEnumsResponse response = coloracaoService.getEnums();
        return ResponseEntity.ok(response);
    }
}
