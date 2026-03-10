package com.belezza.api.controller;

import com.belezza.api.dto.avaliacao.AvaliacaoRequest;
import com.belezza.api.dto.avaliacao.AvaliacaoResponse;
import com.belezza.api.dto.avaliacao.RankingAvaliacaoDTO;
import com.belezza.api.dto.avaliacao.ResumoAvaliacoesDTO;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import com.belezza.api.service.AvaliacaoService;
import com.belezza.api.service.SalonService;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/avaliacoes")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Avaliações", description = "Gerenciamento de avaliações de atendimento")
public class AvaliacaoController {

    private final AvaliacaoService avaliacaoService;
    private final SalonService salonService;

    @PostMapping
    @Operation(summary = "Criar avaliação", description = "Cria uma avaliação para um agendamento concluído")
    public ResponseEntity<AvaliacaoResponse> criar(@Valid @RequestBody AvaliacaoRequest request) {
        AvaliacaoResponse response = avaliacaoService.criar(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/agendamento/{agendamentoId}")
    @Operation(summary = "Buscar por agendamento", description = "Busca avaliação de um agendamento")
    public ResponseEntity<AvaliacaoResponse> buscarPorAgendamento(@PathVariable Long agendamentoId) {
        AvaliacaoResponse response = avaliacaoService.buscarPorAgendamento(agendamentoId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @Operation(summary = "Listar por salão", description = "Lista avaliações de um salão")
    public ResponseEntity<Page<AvaliacaoResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        Page<AvaliacaoResponse> response = avaliacaoService.listarPorSalon(salonId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profissional/{profissionalId}")
    @Operation(summary = "Listar por profissional", description = "Lista avaliações de um profissional")
    public ResponseEntity<Page<AvaliacaoResponse>> listarPorProfissional(
            @PathVariable Long profissionalId,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        Page<AvaliacaoResponse> response = avaliacaoService.listarPorProfissional(profissionalId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}/media")
    @Operation(summary = "Média do salão", description = "Retorna a nota média do salão")
    public ResponseEntity<Map<String, Object>> mediaSalon(@PathVariable Long salonId) {
        Double media = avaliacaoService.mediaSalon(salonId);
        return ResponseEntity.ok(Map.of(
                "salonId", salonId,
                "mediaNotas", media != null ? media : 0.0
        ));
    }

    @GetMapping("/profissional/{profissionalId}/media")
    @Operation(summary = "Média do profissional", description = "Retorna a nota média do profissional")
    public ResponseEntity<Map<String, Object>> mediaProfissional(@PathVariable Long profissionalId) {
        Double media = avaliacaoService.mediaProfissional(profissionalId);
        return ResponseEntity.ok(Map.of(
                "profissionalId", profissionalId,
                "mediaNotas", media != null ? media : 0.0
        ));
    }

    @GetMapping("/ranking")
    @ProfissionalOrAdmin
    @Operation(summary = "Ranking de profissionais por nota", description = "Retorna o ranking de profissionais ordenado por nota média")
    public ResponseEntity<List<RankingAvaliacaoDTO>> getRankingPorNota() {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        List<RankingAvaliacaoDTO> ranking = avaliacaoService.getRankingPorNota(salonId);
        return ResponseEntity.ok(ranking);
    }

    @GetMapping("/resumo")
    @ProfissionalOrAdmin
    @Operation(summary = "Resumo de avaliações", description = "Retorna resumo completo de avaliações do salão")
    public ResponseEntity<ResumoAvaliacoesDTO> getResumoAvaliacoes() {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        ResumoAvaliacoesDTO resumo = avaliacaoService.getResumoAvaliacoes(salonId);
        return ResponseEntity.ok(resumo);
    }

    @GetMapping("/salon/{salonId}/ranking")
    @Operation(summary = "Ranking público de profissionais", description = "Retorna o ranking de profissionais de um salão (público)")
    public ResponseEntity<List<RankingAvaliacaoDTO>> getRankingPorNotaPublico(@PathVariable Long salonId) {
        List<RankingAvaliacaoDTO> ranking = avaliacaoService.getRankingPorNota(salonId);
        return ResponseEntity.ok(ranking);
    }
}
