package com.belezza.api.service;

import com.belezza.api.dto.comissao.ConfirmarPagamentoRequest;
import com.belezza.api.dto.comissao.GerarPagamentoRequest;
import com.belezza.api.dto.comissao.PagamentoProfissionalResponse;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ComissaoRepository;
import com.belezza.api.repository.PagamentoProfissionalRepository;
import com.belezza.api.repository.ProfissionalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PagamentoProfissionalService {

    private final PagamentoProfissionalRepository pagamentoProfissionalRepository;
    private final ComissaoRepository comissaoRepository;
    private final ProfissionalRepository profissionalRepository;

    /**
     * Generate a payment consolidating commissions for a professional in a period.
     */
    @Transactional
    public PagamentoProfissionalResponse gerarPagamento(Long salonId, GerarPagamentoRequest request) {
        log.info("Gerando pagamento para profissional {} - Periodo: {} a {}",
                request.getProfissionalId(), request.getPeriodoInicio(), request.getPeriodoFim());

        // Validate period
        if (request.getPeriodoFim().isBefore(request.getPeriodoInicio())) {
            throw new BusinessException("Data de fim deve ser posterior a data de inicio");
        }

        // Check for overlapping payments
        List<PagamentoProfissional> overlapping = pagamentoProfissionalRepository
                .findByProfissionalIdAndPeriodOverlap(
                        request.getProfissionalId(),
                        request.getPeriodoInicio(),
                        request.getPeriodoFim());

        if (!overlapping.isEmpty()) {
            throw new BusinessException("Ja existe pagamento registrado para este periodo");
        }

        // Get professional
        Profissional profissional = profissionalRepository.findById(request.getProfissionalId())
                .orElseThrow(() -> new ResourceNotFoundException("Profissional", request.getProfissionalId()));

        // Validate professional belongs to salon
        if (!profissional.getSalon().getId().equals(salonId)) {
            throw new BusinessException("Profissional nao pertence a este salao");
        }

        // Get pending commissions for the period
        LocalDateTime inicioDateTime = request.getPeriodoInicio().atStartOfDay();
        LocalDateTime fimDateTime = request.getPeriodoFim().atTime(LocalTime.MAX);

        List<Comissao> comissoes = comissaoRepository.findByProfissionalIdAndStatusAndPeriod(
                request.getProfissionalId(), StatusComissao.CALCULADA, inicioDateTime, fimDateTime);

        if (comissoes.isEmpty()) {
            throw new BusinessException("Nao ha comissoes pendentes para este periodo");
        }

        // Calculate totals
        int totalServicos = comissoes.size();
        BigDecimal valorTotalServicos = comissoes.stream()
                .map(Comissao::getValorServico)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal valorTotalComissoes = comissoes.stream()
                .map(Comissao::getValorComissao)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Create payment
        PagamentoProfissional pagamento = PagamentoProfissional.builder()
                .salon(profissional.getSalon())
                .profissional(profissional)
                .periodoInicio(request.getPeriodoInicio())
                .periodoFim(request.getPeriodoFim())
                .totalServicos(totalServicos)
                .valorTotalServicos(valorTotalServicos)
                .valorTotalComissoes(valorTotalComissoes)
                .status(StatusPagamentoProfissional.PENDENTE)
                .observacoes(request.getObservacoes())
                .build();

        pagamento = pagamentoProfissionalRepository.save(pagamento);

        // Link commissions to payment
        for (Comissao comissao : comissoes) {
            comissao.setPagamentoProfissional(pagamento);
            comissaoRepository.save(comissao);
        }

        log.info("Pagamento gerado: {} - {} servicos - R$ {}",
                pagamento.getId(), totalServicos, valorTotalComissoes);

        return PagamentoProfissionalResponse.fromEntity(pagamento);
    }

    /**
     * Mark payment as processing (payment in progress).
     */
    @Transactional
    public PagamentoProfissionalResponse iniciarProcessamento(Long id) {
        PagamentoProfissional pagamento = getPagamento(id);

        if (pagamento.getStatus() != StatusPagamentoProfissional.PENDENTE) {
            throw new BusinessException("Apenas pagamentos pendentes podem ser processados");
        }

        pagamento.setStatus(StatusPagamentoProfissional.PROCESSANDO);
        pagamento = pagamentoProfissionalRepository.save(pagamento);

        log.info("Pagamento {} iniciando processamento", id);

        return PagamentoProfissionalResponse.fromEntity(pagamento);
    }

    /**
     * Confirm payment completion.
     */
    @Transactional
    public PagamentoProfissionalResponse confirmarPagamento(Long id, ConfirmarPagamentoRequest request) {
        PagamentoProfissional pagamento = getPagamento(id);

        if (pagamento.getStatus() != StatusPagamentoProfissional.PENDENTE &&
            pagamento.getStatus() != StatusPagamentoProfissional.PROCESSANDO) {
            throw new BusinessException("Este pagamento nao pode ser confirmado");
        }

        pagamento.setStatus(StatusPagamentoProfissional.PAGO);
        pagamento.setReferenciaTransacao(request.getReferenciaTransacao());
        pagamento.setPagoEm(LocalDateTime.now());

        if (request.getObservacoes() != null) {
            String obs = pagamento.getObservacoes() != null ?
                    pagamento.getObservacoes() + "\n" + request.getObservacoes() :
                    request.getObservacoes();
            pagamento.setObservacoes(obs);
        }

        pagamento = pagamentoProfissionalRepository.save(pagamento);

        // Update all linked commissions as paid
        List<Comissao> comissoes = comissaoRepository.findByProfissionalIdAndStatusAndPagamentoProfissionalIsNull(
                pagamento.getProfissional().getId(), StatusComissao.CALCULADA);

        // Also update commissions linked to this payment
        pagamento.getComissoes().forEach(comissao -> {
            comissao.setStatus(StatusComissao.PAGA);
            comissaoRepository.save(comissao);
        });

        log.info("Pagamento {} confirmado - Referencia: {}", id, request.getReferenciaTransacao());

        return PagamentoProfissionalResponse.fromEntity(pagamento);
    }

    /**
     * Cancel a pending payment.
     */
    @Transactional
    public PagamentoProfissionalResponse cancelarPagamento(Long id) {
        PagamentoProfissional pagamento = getPagamento(id);

        if (pagamento.getStatus() == StatusPagamentoProfissional.PAGO) {
            throw new BusinessException("Nao e possivel cancelar pagamento ja realizado");
        }

        // Unlink commissions from payment
        pagamento.getComissoes().forEach(comissao -> {
            comissao.setPagamentoProfissional(null);
            comissaoRepository.save(comissao);
        });

        pagamento.setStatus(StatusPagamentoProfissional.CANCELADO);
        pagamento = pagamentoProfissionalRepository.save(pagamento);

        log.info("Pagamento {} cancelado", id);

        return PagamentoProfissionalResponse.fromEntity(pagamento);
    }

    /**
     * Get payment by ID.
     */
    @Transactional(readOnly = true)
    public PagamentoProfissionalResponse buscarPorId(Long id) {
        PagamentoProfissional pagamento = getPagamento(id);
        return PagamentoProfissionalResponse.fromEntity(pagamento);
    }

    /**
     * List payments by salon.
     */
    @Transactional(readOnly = true)
    public Page<PagamentoProfissionalResponse> listarPorSalon(Long salonId, Pageable pageable) {
        return pagamentoProfissionalRepository.findBySalonId(salonId, pageable)
                .map(PagamentoProfissionalResponse::fromEntity);
    }

    /**
     * List payments by professional.
     */
    @Transactional(readOnly = true)
    public Page<PagamentoProfissionalResponse> listarPorProfissional(Long profissionalId, Pageable pageable) {
        return pagamentoProfissionalRepository.findByProfissionalId(profissionalId, pageable)
                .map(PagamentoProfissionalResponse::fromEntity);
    }

    /**
     * List payments by salon and status.
     */
    @Transactional(readOnly = true)
    public Page<PagamentoProfissionalResponse> listarPorSalonEStatus(
            Long salonId, StatusPagamentoProfissional status, Pageable pageable) {
        return pagamentoProfissionalRepository.findBySalonIdAndStatus(salonId, status, pageable)
                .map(PagamentoProfissionalResponse::fromEntity);
    }

    /**
     * Get total paid to professionals in a period.
     */
    @Transactional(readOnly = true)
    public BigDecimal totalPagoPorSalon(Long salonId, LocalDate inicio, LocalDate fim) {
        LocalDateTime inicioDateTime = inicio.atStartOfDay();
        LocalDateTime fimDateTime = fim.atTime(LocalTime.MAX);

        BigDecimal total = pagamentoProfissionalRepository.sumTotalPagoBySalonIdAndPeriod(
                salonId, inicioDateTime, fimDateTime);

        return total != null ? total : BigDecimal.ZERO;
    }

    private PagamentoProfissional getPagamento(Long id) {
        return pagamentoProfissionalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PagamentoProfissional", id));
    }
}
