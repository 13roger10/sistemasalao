package com.belezza.api.service;

import com.belezza.api.dto.avaliacao.AvaliacaoRequest;
import com.belezza.api.dto.avaliacao.AvaliacaoResponse;
import com.belezza.api.dto.avaliacao.RankingAvaliacaoDTO;
import com.belezza.api.dto.avaliacao.ResumoAvaliacoesDTO;
import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Avaliacao;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.AvaliacaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AvaliacaoService {

    private final AvaliacaoRepository avaliacaoRepository;
    private final AgendamentoRepository agendamentoRepository;
    @Lazy
    private final NotificacaoService notificacaoService;

    @Transactional
    public AvaliacaoResponse criar(AvaliacaoRequest request) {
        Agendamento agendamento = agendamentoRepository.findById(request.getAgendamentoId())
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", request.getAgendamentoId()));

        if (agendamento.getStatus() != StatusAgendamento.CONCLUIDO) {
            throw new BusinessException("Apenas agendamentos concluídos podem ser avaliados");
        }

        if (avaliacaoRepository.existsByAgendamentoId(request.getAgendamentoId())) {
            throw new BusinessException("Este agendamento já foi avaliado");
        }

        Avaliacao avaliacao = Avaliacao.builder()
                .agendamento(agendamento)
                .profissional(agendamento.getProfissional())
                .salon(agendamento.getSalon())
                .nota(request.getNota())
                .comentario(request.getComentario())
                .build();

        avaliacao = avaliacaoRepository.save(avaliacao);
        log.info("Avaliação criada: {} para agendamento {}", avaliacao.getId(), request.getAgendamentoId());

        // Notificar o profissional sobre a nova avaliação
        try {
            if (agendamento.getProfissional() != null) {
                notificacaoService.notificarAvaliacaoRecebida(agendamento.getProfissional(), request.getNota());
            }
        } catch (Exception e) {
            log.error("Erro ao notificar profissional sobre avaliação: {}", e.getMessage());
        }

        return AvaliacaoResponse.fromEntity(avaliacao);
    }

    @Transactional(readOnly = true)
    public AvaliacaoResponse buscarPorAgendamento(Long agendamentoId) {
        Avaliacao avaliacao = avaliacaoRepository.findByAgendamentoId(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Avaliação", "agendamento", agendamentoId.toString()));
        return AvaliacaoResponse.fromEntity(avaliacao);
    }

    @Transactional(readOnly = true)
    public Page<AvaliacaoResponse> listarPorSalon(Long salonId, Pageable pageable) {
        return avaliacaoRepository.findBySalonId(salonId, pageable)
                .map(AvaliacaoResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<AvaliacaoResponse> listarPorProfissional(Long profissionalId, Pageable pageable) {
        return avaliacaoRepository.findByProfissionalId(profissionalId, pageable)
                .map(AvaliacaoResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Double mediaSalon(Long salonId) {
        return avaliacaoRepository.findAverageNotaBySalonId(salonId);
    }

    @Transactional(readOnly = true)
    public Double mediaProfissional(Long profissionalId) {
        return avaliacaoRepository.findAverageNotaByProfissionalId(profissionalId);
    }

    @Transactional(readOnly = true)
    public List<RankingAvaliacaoDTO> getRankingPorNota(Long salonId) {
        List<Object[]> results = avaliacaoRepository.findRankingPorNotaBySalonId(salonId);
        List<RankingAvaliacaoDTO> ranking = new ArrayList<>();

        int posicao = 1;
        for (Object[] row : results) {
            Long profissionalId = (Long) row[0];
            String nome = (String) row[1];
            String fotoUrl = (String) row[2];
            Double mediaDouble = (Double) row[3];
            BigDecimal media = mediaDouble != null ? BigDecimal.valueOf(mediaDouble) : BigDecimal.ZERO;
            Long total = (Long) row[4];
            Long n5 = (Long) row[5];
            Long n4 = (Long) row[6];
            Long n3 = (Long) row[7];
            Long n2 = (Long) row[8];
            Long n1 = (Long) row[9];

            ranking.add(RankingAvaliacaoDTO.create(
                    posicao++, profissionalId, nome, fotoUrl, media, total, n5, n4, n3, n2, n1
            ));
        }

        return ranking;
    }

    @Transactional(readOnly = true)
    public ResumoAvaliacoesDTO getResumoAvaliacoes(Long salonId) {
        // Média geral
        BigDecimal mediaGeral = avaliacaoRepository.avgNotaBySalonId(salonId);
        if (mediaGeral == null) {
            mediaGeral = BigDecimal.ZERO;
        }

        // Total de avaliações
        long totalAvaliacoes = avaliacaoRepository.countBySalonId(salonId);

        // Avaliações com comentário
        long avaliacoesComComentario = avaliacaoRepository.countComComentarioBySalonId(salonId);

        // Distribuição por nota
        List<Object[]> distribuicaoResults = avaliacaoRepository.countByNotaBySalonId(salonId);
        Map<Integer, Long> distribuicaoPorNota = new HashMap<>();
        long notasPositivas = 0;
        for (Object[] row : distribuicaoResults) {
            Integer nota = (Integer) row[0];
            Long count = (Long) row[1];
            distribuicaoPorNota.put(nota, count);
            if (nota >= 4) {
                notasPositivas += count;
            }
        }

        // Percentual de satisfação (notas 4 e 5)
        double percentualSatisfacao = totalAvaliacoes > 0
                ? ((double) notasPositivas / totalAvaliacoes) * 100
                : 0;

        // Ranking de profissionais
        List<RankingAvaliacaoDTO> rankingProfissionais = getRankingPorNota(salonId);

        // Últimas avaliações
        List<Avaliacao> ultimasAvaliacoesList = avaliacaoRepository.findUltimasBySalonId(salonId, PageRequest.of(0, 10));
        List<AvaliacaoResponse> ultimasAvaliacoes = ultimasAvaliacoesList.stream()
                .map(AvaliacaoResponse::fromEntity)
                .toList();

        return ResumoAvaliacoesDTO.builder()
                .mediaGeral(mediaGeral.setScale(2, RoundingMode.HALF_UP))
                .mediaGeralFormatada(mediaGeral.setScale(1, RoundingMode.HALF_UP).toString())
                .totalAvaliacoes(totalAvaliacoes)
                .avaliacoesComComentario(avaliacoesComComentario)
                .distribuicaoPorNota(distribuicaoPorNota)
                .percentualSatisfacao(Math.round(percentualSatisfacao * 10) / 10.0)
                .rankingProfissionais(rankingProfissionais)
                .ultimasAvaliacoes(ultimasAvaliacoes)
                .build();
    }
}
