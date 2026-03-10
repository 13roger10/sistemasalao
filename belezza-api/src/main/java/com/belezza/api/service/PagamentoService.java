package com.belezza.api.service;

import com.belezza.api.dto.pagamento.PagamentoRequest;
import com.belezza.api.dto.pagamento.PagamentoResponse;
import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.entity.StatusPagamento;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.PagamentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.belezza.api.security.annotation.Auditable;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PagamentoService {

    private final PagamentoRepository pagamentoRepository;
    private final AgendamentoRepository agendamentoRepository;

    @Transactional
    @Auditable(action = "CREATE", entityType = "Pagamento", captureNewState = true)
    public PagamentoResponse registrar(PagamentoRequest request) {
        Agendamento agendamento = agendamentoRepository.findById(request.getAgendamentoId())
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", request.getAgendamentoId()));

        if (agendamento.getStatus() != StatusAgendamento.CONCLUIDO &&
            agendamento.getStatus() != StatusAgendamento.EM_ANDAMENTO) {
            throw new BusinessException("Pagamento só pode ser registrado para agendamentos concluídos ou em andamento");
        }

        if (pagamentoRepository.findByAgendamentoId(request.getAgendamentoId()).isPresent()) {
            throw new BusinessException("Já existe um pagamento para este agendamento");
        }

        Pagamento pagamento = Pagamento.builder()
                .agendamento(agendamento)
                .salon(agendamento.getSalon())
                .valor(request.getValor())
                .forma(request.getForma())
                .status(StatusPagamento.APROVADO)
                .processadoEm(LocalDateTime.now())
                .build();

        pagamento = pagamentoRepository.save(pagamento);
        log.info("Pagamento registrado: {} para agendamento {}", pagamento.getId(), request.getAgendamentoId());

        return PagamentoResponse.fromEntity(pagamento);
    }

    @Transactional(readOnly = true)
    public PagamentoResponse buscarPorAgendamento(Long agendamentoId) {
        Pagamento pagamento = pagamentoRepository.findByAgendamentoId(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", "agendamento", agendamentoId.toString()));
        return PagamentoResponse.fromEntity(pagamento);
    }

    @Transactional(readOnly = true)
    public Page<PagamentoResponse> listarPorSalon(Long salonId, Pageable pageable) {
        return pagamentoRepository.findBySalonId(salonId, pageable)
                .map(PagamentoResponse::fromEntity);
    }

    @Transactional
    public PagamentoResponse estornar(Long pagamentoId) {
        Pagamento pagamento = pagamentoRepository.findById(pagamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", pagamentoId));

        if (pagamento.getStatus() != StatusPagamento.APROVADO) {
            throw new BusinessException("Apenas pagamentos aprovados podem ser estornados");
        }

        pagamento.setStatus(StatusPagamento.ESTORNADO);
        pagamento = pagamentoRepository.save(pagamento);
        log.info("Pagamento estornado: {}", pagamentoId);

        return PagamentoResponse.fromEntity(pagamento);
    }
}
