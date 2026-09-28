package com.belezza.api.repository;

import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.StatusPagamento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {

    /** Partes de pagamento de um atendimento (pagamento dividido gera várias), mais antigas primeiro. */
    List<Pagamento> findByAgendamentoIdOrderByCriadoEmAsc(Long agendamentoId);

    /** Total já pago (aprovado, sem estornos) de um atendimento. */
    @Query("SELECT COALESCE(SUM(p.valor), 0) FROM Pagamento p WHERE p.agendamento.id = :agendamentoId " +
           "AND p.status = 'APROVADO'")
    BigDecimal sumAprovadoByAgendamentoId(@Param("agendamentoId") Long agendamentoId);

    /** Pagamentos aprovados de um caixa, somados por forma: [forma, soma]. */
    @Query("SELECT p.forma, SUM(p.valor) FROM Pagamento p WHERE p.caixa.id = :caixaId " +
           "AND p.status = 'APROVADO' GROUP BY p.forma")
    List<Object[]> sumAprovadosByCaixaGroupByForma(@Param("caixaId") Long caixaId);

    List<Pagamento> findByAgendamentoClienteId(Long clienteId);

    Page<Pagamento> findBySalonId(Long salonId, Pageable pageable);

    Page<Pagamento> findBySalonIdAndRegistradoPorId(Long salonId, Long registradoPorId, Pageable pageable);

    List<Pagamento> findBySalonIdAndStatus(Long salonId, StatusPagamento status);

    @Query("SELECT SUM(p.valor) FROM Pagamento p WHERE p.salon.id = :salonId " +
           "AND p.status = 'APROVADO' AND p.processadoEm BETWEEN :inicio AND :fim")
    BigDecimal sumFaturamentoBySalonIdAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    @Query("SELECT p.forma, COUNT(p), SUM(p.valor) FROM Pagamento p " +
           "WHERE p.salon.id = :salonId AND p.status = 'APROVADO' " +
           "AND p.processadoEm BETWEEN :inicio AND :fim " +
           "GROUP BY p.forma")
    List<Object[]> sumByFormaPagamentoAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    /** Atendimentos distintos com pagamento aprovado no período. */
    @Query("SELECT COUNT(DISTINCT p.agendamento.id) FROM Pagamento p WHERE p.salon.id = :salonId " +
           "AND p.status = 'APROVADO' AND p.processadoEm BETWEEN :inicio AND :fim")
    long countAtendimentosPagosBySalonIdAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    /**
     * Ticket médio = faturamento ÷ atendimentos pagos (não a média por linha de pagamento: um
     * pagamento dividido em duas partes contaria como dois tickets pela metade). Nulo sem pagamentos.
     */
    default BigDecimal avgTicketMedioBySalonIdAndPeriod(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        long atendimentos = countAtendimentosPagosBySalonIdAndPeriod(salonId, inicio, fim);
        if (atendimentos == 0) return null;
        BigDecimal total = sumFaturamentoBySalonIdAndPeriod(salonId, inicio, fim);
        return (total != null ? total : BigDecimal.ZERO)
                .divide(BigDecimal.valueOf(atendimentos), 2, java.math.RoundingMode.HALF_UP);
    }

    // Find payments by salon, status and period (for metrics)
    @Query("SELECT p FROM Pagamento p WHERE p.salon.id = :salonId " +
           "AND p.status = :status AND p.processadoEm BETWEEN :inicio AND :fim " +
           "ORDER BY p.processadoEm")
    List<Pagamento> findBySalonIdAndStatusAndPeriod(
        @Param("salonId") Long salonId,
        @Param("status") StatusPagamento status,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );
}
