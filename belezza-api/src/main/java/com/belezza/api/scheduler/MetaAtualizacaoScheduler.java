package com.belezza.api.scheduler;

import com.belezza.api.entity.Meta;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.MetaRepository;
import com.belezza.api.service.MetaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Scheduler para atualização automática do progresso das metas.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MetaAtualizacaoScheduler {

    private final MetaRepository metaRepository;
    private final MetaService metaService;
    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;

    /**
     * Executa a cada hora para atualizar o progresso das metas.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void atualizarProgressoMetas() {
        log.info("Iniciando atualização do progresso das metas...");

        LocalDate hoje = LocalDate.now();
        List<Meta> metasAtivas = metaRepository.findMetasParaAtualizar(hoje);
        int metasAtualizadas = 0;

        for (Meta meta : metasAtivas) {
            try {
                BigDecimal novoValor = calcularValorAtual(meta);
                if (novoValor.compareTo(meta.getValorAtual()) != 0) {
                    metaService.atualizarValorMeta(meta.getId(), novoValor);
                    metasAtualizadas++;
                }
            } catch (Exception e) {
                log.error("Erro ao atualizar meta {}: {}", meta.getId(), e.getMessage());
            }
        }

        log.info("Atualização de metas concluída. {} metas atualizadas.", metasAtualizadas);
    }

    private BigDecimal calcularValorAtual(Meta meta) {
        Long salonId = meta.getSalon().getId();
        LocalDate inicio = meta.getDataInicio();
        LocalDate fim = meta.getDataFim();

        return switch (meta.getTipo()) {
            case FATURAMENTO -> calcularFaturamento(salonId, inicio, fim, meta.getProfissional() != null ? meta.getProfissional().getId() : null);
            case ATENDIMENTOS -> BigDecimal.valueOf(contarAtendimentos(salonId, inicio, fim, meta.getProfissional() != null ? meta.getProfissional().getId() : null));
            case NOVOS_CLIENTES -> BigDecimal.valueOf(contarNovosClientes(salonId, inicio, fim));
            case TICKET_MEDIO -> calcularTicketMedio(salonId, inicio, fim);
            default -> meta.getValorAtual();
        };
    }

    private BigDecimal calcularFaturamento(Long salonId, LocalDate inicio, LocalDate fim, Long profissionalId) {
        // Implementação simplificada - deve consultar agendamentos concluídos
        try {
            if (profissionalId != null) {
                return agendamentoRepository.calcularFaturamentoPorProfissional(salonId, profissionalId, inicio.atStartOfDay(), fim.atTime(23, 59, 59));
            }
            return agendamentoRepository.calcularFaturamento(salonId, inicio.atStartOfDay(), fim.atTime(23, 59, 59));
        } catch (Exception e) {
            log.warn("Erro ao calcular faturamento: {}", e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    private long contarAtendimentos(Long salonId, LocalDate inicio, LocalDate fim, Long profissionalId) {
        try {
            if (profissionalId != null) {
                return agendamentoRepository.contarAtendimentosPorProfissional(salonId, profissionalId, inicio.atStartOfDay(), fim.atTime(23, 59, 59));
            }
            return agendamentoRepository.contarAtendimentos(salonId, inicio.atStartOfDay(), fim.atTime(23, 59, 59));
        } catch (Exception e) {
            log.warn("Erro ao contar atendimentos: {}", e.getMessage());
            return 0;
        }
    }

    private long contarNovosClientes(Long salonId, LocalDate inicio, LocalDate fim) {
        try {
            return clienteRepository.contarNovosClientes(salonId, inicio.atStartOfDay(), fim.atTime(23, 59, 59));
        } catch (Exception e) {
            log.warn("Erro ao contar novos clientes: {}", e.getMessage());
            return 0;
        }
    }

    private BigDecimal calcularTicketMedio(Long salonId, LocalDate inicio, LocalDate fim) {
        try {
            BigDecimal faturamento = calcularFaturamento(salonId, inicio, fim, null);
            long atendimentos = contarAtendimentos(salonId, inicio, fim, null);
            if (atendimentos == 0) return BigDecimal.ZERO;
            return faturamento.divide(BigDecimal.valueOf(atendimentos), 2, java.math.RoundingMode.HALF_UP);
        } catch (Exception e) {
            log.warn("Erro ao calcular ticket médio: {}", e.getMessage());
            return BigDecimal.ZERO;
        }
    }
}
