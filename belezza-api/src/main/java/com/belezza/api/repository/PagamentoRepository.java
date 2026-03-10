package com.belezza.api.repository;

import com.belezza.api.entity.FormaPagamento;
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
import java.util.Optional;

@Repository
public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {

    Optional<Pagamento> findByAgendamentoId(Long agendamentoId);

    Page<Pagamento> findBySalonId(Long salonId, Pageable pageable);

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

    @Query("SELECT AVG(p.valor) FROM Pagamento p WHERE p.salon.id = :salonId " +
           "AND p.status = 'APROVADO' AND p.processadoEm BETWEEN :inicio AND :fim")
    BigDecimal avgTicketMedioBySalonIdAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

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
