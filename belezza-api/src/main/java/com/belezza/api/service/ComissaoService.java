package com.belezza.api.service;

import com.belezza.api.dto.comissao.ComissaoResumoResponse;
import com.belezza.api.dto.comissao.ComissaoResponse;
import com.belezza.api.dto.comissao.ConfiguracaoComissaoRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ComissaoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.belezza.api.security.annotation.Auditable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComissaoService {

    private final ComissaoRepository comissaoRepository;
    private final ProfissionalRepository profissionalRepository;

    /**
     * Calculate commission for a completed appointment.
     * Called automatically when an appointment is marked as completed.
     */
    @Transactional
    @Auditable(action = "CREATE", entityType = "Comissao", captureNewState = true)
    public Comissao calcularComissao(Agendamento agendamento) {
        log.info("Calculando comissao para agendamento: {}", agendamento.getId());

        // Check if commission already exists
        if (comissaoRepository.findByAgendamentoId(agendamento.getId()).isPresent()) {
            log.warn("Comissao ja existe para agendamento: {}", agendamento.getId());
            throw new BusinessException("Comissao ja foi calculada para este agendamento");
        }

        Profissional profissional = agendamento.getProfissional();
        Salon salon = agendamento.getSalon();

        // Determine commission type and rate
        TipoComissao tipoComissao = profissional.getTipoComissao();
        BigDecimal taxaComissao = profissional.getValorComissao();

        // If professional has no specific commission, use salon default
        if (tipoComissao == null || taxaComissao == null) {
            tipoComissao = salon.getTipoComissaoPadrao();
            taxaComissao = salon.getValorComissaoPadrao();
        }

        // Handle case where no commission is configured
        if (tipoComissao == null || taxaComissao == null) {
            tipoComissao = TipoComissao.PORCENTAGEM;
            taxaComissao = BigDecimal.valueOf(10.00);
            log.warn("Usando comissao padrao de 10% para profissional: {}", profissional.getId());
        }

        // Get service value
        BigDecimal valorServico = agendamento.getValorCobrado();
        if (valorServico == null || valorServico.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Agendamento {} sem valor cobrado, usando valor dos servicos", agendamento.getId());
            valorServico = calcularValorServicos(agendamento);
        }

        // Calculate commission value
        BigDecimal valorComissao = calcularValorComissao(valorServico, tipoComissao, taxaComissao);

        // Create commission record
        Comissao comissao = Comissao.builder()
                .salon(salon)
                .profissional(profissional)
                .agendamento(agendamento)
                .valorServico(valorServico)
                .tipoComissao(tipoComissao)
                .taxaComissao(taxaComissao)
                .valorComissao(valorComissao)
                .status(StatusComissao.CALCULADA)
                .build();

        comissao = comissaoRepository.save(comissao);

        log.info("Comissao calculada: {} - Valor: {} ({} {})",
                comissao.getId(), valorComissao,
                tipoComissao == TipoComissao.PORCENTAGEM ? taxaComissao + "%" : "R$" + taxaComissao,
                tipoComissao.getDescription());

        return comissao;
    }

    /**
     * Calculate commission value based on type.
     */
    private BigDecimal calcularValorComissao(BigDecimal valorServico, TipoComissao tipo, BigDecimal taxa) {
        if (tipo == TipoComissao.PORCENTAGEM) {
            return valorServico
                    .multiply(taxa)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            // Fixed value - return the fixed amount or service value if lower
            return taxa.min(valorServico);
        }
    }

    /**
     * Calculate total service value from appointment.
     */
    private BigDecimal calcularValorServicos(Agendamento agendamento) {
        // Try multiple services first
        if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
            return agendamento.getServicos().stream()
                    .map(as -> as.getServico().getPreco())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // Fallback to single service
        if (agendamento.getServico() != null) {
            return agendamento.getServico().getPreco();
        }

        return BigDecimal.ZERO;
    }

    /**
     * Configure commission for a professional.
     */
    @Transactional
    public void configurarComissaoProfissional(Long profissionalId, ConfiguracaoComissaoRequest request) {
        Profissional profissional = profissionalRepository.findById(profissionalId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional", profissionalId));

        profissional.setTipoComissao(request.getTipoComissao());
        profissional.setValorComissao(request.getValorComissao());
        profissionalRepository.save(profissional);

        log.info("Comissao configurada para profissional {}: {} {}",
                profissionalId, request.getValorComissao(),
                request.getTipoComissao() == TipoComissao.PORCENTAGEM ? "%" : " fixo");
    }

    /**
     * Get commission by ID.
     */
    @Transactional(readOnly = true)
    public ComissaoResponse buscarPorId(Long id) {
        Comissao comissao = comissaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Comissao", id));
        return ComissaoResponse.fromEntity(comissao);
    }

    /**
     * List commissions by salon.
     */
    @Transactional(readOnly = true)
    public Page<ComissaoResponse> listarPorSalon(Long salonId, Pageable pageable) {
        return comissaoRepository.findBySalonId(salonId, pageable)
                .map(ComissaoResponse::fromEntity);
    }

    /**
     * List commissions by professional.
     */
    @Transactional(readOnly = true)
    public Page<ComissaoResponse> listarPorProfissional(Long profissionalId, Pageable pageable) {
        return comissaoRepository.findByProfissionalId(profissionalId, pageable)
                .map(ComissaoResponse::fromEntity);
    }

    /**
     * List commissions by professional and status.
     */
    @Transactional(readOnly = true)
    public Page<ComissaoResponse> listarPorProfissionalEStatus(
            Long profissionalId, StatusComissao status, Pageable pageable) {
        return comissaoRepository.findByProfissionalIdAndStatus(profissionalId, status, pageable)
                .map(ComissaoResponse::fromEntity);
    }

    /**
     * Get commission summary for a salon by period.
     */
    @Transactional(readOnly = true)
    public List<ComissaoResumoResponse> resumoPorSalon(Long salonId, LocalDate inicio, LocalDate fim) {
        LocalDateTime inicioDateTime = inicio.atStartOfDay();
        LocalDateTime fimDateTime = fim.atTime(LocalTime.MAX);

        List<Object[]> results = comissaoRepository.resumoPorProfissionalAndPeriod(
                salonId, inicioDateTime, fimDateTime);

        return results.stream()
                .map(row -> {
                    Long profissionalId = (Long) row[0];
                    String profissionalNome = (String) row[1];
                    Long totalServicos = (Long) row[2];
                    BigDecimal valorTotalServicos = (BigDecimal) row[3];
                    BigDecimal valorTotalComissoes = (BigDecimal) row[4];

                    // Get pending and paid counts
                    int pendentes = (int) comissaoRepository.countByProfissionalIdAndStatusAndPeriod(
                            profissionalId, StatusComissao.CALCULADA, inicioDateTime, fimDateTime);
                    int pagas = (int) comissaoRepository.countByProfissionalIdAndStatusAndPeriod(
                            profissionalId, StatusComissao.PAGA, inicioDateTime, fimDateTime);

                    return ComissaoResumoResponse.builder()
                            .profissionalId(profissionalId)
                            .profissionalNome(profissionalNome)
                            .totalServicos(totalServicos.intValue())
                            .valorTotalServicos(valorTotalServicos != null ? valorTotalServicos : BigDecimal.ZERO)
                            .valorTotalComissoes(valorTotalComissoes != null ? valorTotalComissoes : BigDecimal.ZERO)
                            .comissoesPendentes(pendentes)
                            .comissoesPagas(pagas)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Get total pending commissions for a professional.
     */
    @Transactional(readOnly = true)
    public BigDecimal totalComissoesPendentes(Long profissionalId) {
        BigDecimal total = comissaoRepository.sumValorComissaoByProfissionalIdAndStatus(
                profissionalId, StatusComissao.CALCULADA);
        return total != null ? total : BigDecimal.ZERO;
    }

    /**
     * Get unpaid commissions for a professional (for generating payment).
     */
    @Transactional(readOnly = true)
    public List<Comissao> buscarComissoesPendentes(Long profissionalId) {
        return comissaoRepository.findByProfissionalIdAndStatusAndPagamentoProfissionalIsNull(
                profissionalId, StatusComissao.CALCULADA);
    }

    /**
     * Cancel commission (e.g., when appointment is cancelled after completion).
     */
    @Transactional
    @Auditable(action = "CANCEL", entityType = "Comissao", captureOldState = true)
    public void cancelarComissao(Long agendamentoId) {
        comissaoRepository.findByAgendamentoId(agendamentoId)
                .ifPresent(comissao -> {
                    if (comissao.getStatus() == StatusComissao.PAGA) {
                        throw new BusinessException("Nao e possivel cancelar comissao ja paga");
                    }
                    comissao.setStatus(StatusComissao.CANCELADA);
                    comissaoRepository.save(comissao);
                    log.info("Comissao cancelada para agendamento: {}", agendamentoId);
                });
    }
}
