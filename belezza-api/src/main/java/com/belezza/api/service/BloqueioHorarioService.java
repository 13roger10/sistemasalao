package com.belezza.api.service;

import com.belezza.api.dto.horario.BloqueioHorarioRequest;
import com.belezza.api.dto.horario.BloqueioHorarioResponse;
import com.belezza.api.entity.BloqueioHorario;
import com.belezza.api.entity.Profissional;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.BloqueioHorarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BloqueioHorarioService {

    private final BloqueioHorarioRepository bloqueioHorarioRepository;
    private final ProfissionalService profissionalService;

    @Transactional
    public BloqueioHorarioResponse criar(Long profissionalId, BloqueioHorarioRequest request) {
        Profissional profissional = profissionalService.getProfissionalEntity(profissionalId);

        if (request.getDataInicio().isAfter(request.getDataFim()) || request.getDataInicio().equals(request.getDataFim())) {
            throw new BusinessException("Data de início deve ser antes da data de fim");
        }

        // Check for overlapping blocks
        List<BloqueioHorario> conflitos = bloqueioHorarioRepository.findConflicts(
                profissionalId, request.getDataInicio(), request.getDataFim());

        if (!conflitos.isEmpty()) {
            throw new BusinessException("Já existe um bloqueio neste período");
        }

        BloqueioHorario bloqueio = BloqueioHorario.builder()
                .profissional(profissional)
                .dataInicio(request.getDataInicio())
                .dataFim(request.getDataFim())
                .motivo(request.getMotivo())
                .recorrente(request.isRecorrente())
                .build();

        bloqueio = bloqueioHorarioRepository.save(bloqueio);
        log.info("Bloqueio criado para profissional {}: {} a {}", profissionalId, request.getDataInicio(), request.getDataFim());

        return BloqueioHorarioResponse.fromEntity(bloqueio);
    }

    @Transactional(readOnly = true)
    public List<BloqueioHorarioResponse> listarPorProfissional(Long profissionalId) {
        return bloqueioHorarioRepository.findByProfissionalId(profissionalId).stream()
                .map(BloqueioHorarioResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BloqueioHorarioResponse> listarPorPeriodo(Long profissionalId, LocalDateTime inicio, LocalDateTime fim) {
        return bloqueioHorarioRepository.findByProfissionalIdAndPeriod(profissionalId, inicio, fim).stream()
                .map(BloqueioHorarioResponse::fromEntity)
                .toList();
    }

    @Transactional
    public void remover(Long bloqueioId) {
        BloqueioHorario bloqueio = bloqueioHorarioRepository.findById(bloqueioId)
                .orElseThrow(() -> new ResourceNotFoundException("Bloqueio", bloqueioId));

        bloqueioHorarioRepository.delete(bloqueio);
        log.info("Bloqueio removido: {}", bloqueioId);
    }

    public boolean temBloqueio(Long profissionalId, LocalDateTime inicio, LocalDateTime fim) {
        return !bloqueioHorarioRepository.findConflicts(profissionalId, inicio, fim).isEmpty();
    }
}
