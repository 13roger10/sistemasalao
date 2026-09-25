package com.belezza.api.service;

import com.belezza.api.dto.pagamento.PagamentoRequest;
import com.belezza.api.dto.pagamento.PagamentoResponse;
import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.entity.StatusPagamento;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.belezza.api.security.annotation.Auditable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PagamentoService {

    private final PagamentoRepository pagamentoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;

    @Transactional
    @Auditable(action = "CREATE", entityType = "Pagamento", captureNewState = true)
    public PagamentoResponse registrar(PagamentoRequest request, Usuario operador) {
        Agendamento agendamento = agendamentoRepository.findById(request.getAgendamentoId())
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", request.getAgendamentoId()));

        // SEC-011: só registra pagamento de atendimento do próprio estabelecimento — sem isto,
        // qualquer membro da equipe lançava pagamento no caixa de outro salão pelo agendamentoId.
        assertTenant(agendamento.getSalon() != null ? agendamento.getSalon().getId() : null);

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
                .registradoPorId(operador.getId())
                .registradoPorNome(operador.getNome())
                .build();

        pagamento = pagamentoRepository.save(pagamento);
        log.info("Pagamento registrado: {} para agendamento {} por {} (id={})",
                pagamento.getId(), request.getAgendamentoId(), operador.getNome(), operador.getId());

        atualizarEstatisticasCliente(agendamento.getCliente(), request.getValor());

        return PagamentoResponse.fromEntity(pagamento);
    }

    /**
     * Atualiza o total gasto, o ticket médio e as datas de visita do cliente
     * sempre que um pagamento é registrado, para que essas estatísticas
     * reflitam os pagamentos reais em vez de ficarem paradas em zero.
     */
    private void atualizarEstatisticasCliente(Cliente cliente, BigDecimal valorPago) {
        LocalDateTime agora = LocalDateTime.now();

        cliente.setTotalGasto(cliente.getTotalGasto().add(valorPago));
        if (cliente.getPrimeiraVisita() == null) {
            cliente.setPrimeiraVisita(agora);
        }
        cliente.setUltimaVisita(agora);

        if (cliente.getTotalAgendamentos() > 0) {
            cliente.setTicketMedio(
                    cliente.getTotalGasto().divide(
                            BigDecimal.valueOf(cliente.getTotalAgendamentos()), 2, RoundingMode.HALF_UP));
        }

        clienteRepository.save(cliente);
    }

    /**
     * SEC-011: garante que o solicitante só acessa pagamentos do próprio estabelecimento.
     * Usa o salonId do JWT (TenantContext); exige que exista e coincida com o salão do recurso.
     */
    private void assertTenant(Long salonId) {
        Long tenant = TenantContext.getCurrentTenant();
        if (tenant == null || salonId == null || !tenant.equals(salonId)) {
            throw new AccessDeniedException("Acesso negado: recurso pertence a outro estabelecimento");
        }
    }

    @Transactional(readOnly = true)
    public PagamentoResponse buscarPorAgendamento(Long agendamentoId) {
        Pagamento pagamento = pagamentoRepository.findByAgendamentoId(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", "agendamento", agendamentoId.toString()));
        // SEC-011: bloqueia leitura de pagamento de outro estabelecimento por IDOR no agendamentoId.
        assertTenant(pagamento.getSalon() != null ? pagamento.getSalon().getId() : null);
        return PagamentoResponse.fromEntity(pagamento);
    }

    /**
     * Lista pagamentos do salão.
     * RECEPCIONISTA: somente os pagamentos que ela mesma registrou.
     * ADMIN / PROFISSIONAL: todos os pagamentos do salão.
     */
    @Transactional(readOnly = true)
    public Page<PagamentoResponse> listarPorSalon(Long salonId, Pageable pageable, Usuario solicitante) {
        assertTenant(salonId); // SEC-011: isolamento entre estabelecimentos
        if (solicitante.getRole() == Role.RECEPCIONISTA) {
            return pagamentoRepository
                    .findBySalonIdAndRegistradoPorId(salonId, solicitante.getId(), pageable)
                    .map(PagamentoResponse::fromEntity);
        }
        return pagamentoRepository.findBySalonId(salonId, pageable)
                .map(PagamentoResponse::fromEntity);
    }

    @Transactional
    public PagamentoResponse estornar(Long pagamentoId) {
        Pagamento pagamento = pagamentoRepository.findById(pagamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", pagamentoId));

        // SEC-011: bloqueia estorno de pagamento de outro estabelecimento por IDOR no pagamentoId.
        assertTenant(pagamento.getSalon() != null ? pagamento.getSalon().getId() : null);

        if (pagamento.getStatus() != StatusPagamento.APROVADO) {
            throw new BusinessException("Apenas pagamentos aprovados podem ser estornados");
        }

        pagamento.setStatus(StatusPagamento.ESTORNADO);
        pagamento = pagamentoRepository.save(pagamento);
        log.info("Pagamento estornado: {}", pagamentoId);

        return PagamentoResponse.fromEntity(pagamento);
    }
}
