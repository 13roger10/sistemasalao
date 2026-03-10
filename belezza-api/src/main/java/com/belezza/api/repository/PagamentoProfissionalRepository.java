package com.belezza.api.repository;

import com.belezza.api.entity.PagamentoProfissional;
import com.belezza.api.entity.StatusPagamentoProfissional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PagamentoProfissionalRepository extends JpaRepository<PagamentoProfissional, Long> {

    Page<PagamentoProfissional> findBySalonId(Long salonId, Pageable pageable);

    Page<PagamentoProfissional> findByProfissionalId(Long profissionalId, Pageable pageable);

    Page<PagamentoProfissional> findBySalonIdAndStatus(Long salonId, StatusPagamentoProfissional status, Pageable pageable);

    List<PagamentoProfissional> findByProfissionalIdAndStatus(Long profissionalId, StatusPagamentoProfissional status);

    @Query("SELECT p FROM PagamentoProfissional p " +
           "WHERE p.profissional.id = :profissionalId " +
           "AND ((p.periodoInicio <= :inicio AND p.periodoFim >= :inicio) " +
           "OR (p.periodoInicio <= :fim AND p.periodoFim >= :fim) " +
           "OR (p.periodoInicio >= :inicio AND p.periodoFim <= :fim))")
    List<PagamentoProfissional> findByProfissionalIdAndPeriodOverlap(
        @Param("profissionalId") Long profissionalId,
        @Param("inicio") LocalDate inicio,
        @Param("fim") LocalDate fim
    );

    @Query("SELECT SUM(p.valorTotalComissoes) FROM PagamentoProfissional p " +
           "WHERE p.profissional.id = :profissionalId AND p.status = 'PAGO'")
    BigDecimal sumTotalPagoByProfissionalId(@Param("profissionalId") Long profissionalId);

    @Query("SELECT SUM(p.valorTotalComissoes) FROM PagamentoProfissional p " +
           "WHERE p.salon.id = :salonId AND p.status = 'PAGO' " +
           "AND p.pagoEm BETWEEN :inicio AND :fim")
    BigDecimal sumTotalPagoBySalonIdAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") java.time.LocalDateTime inicio,
        @Param("fim") java.time.LocalDateTime fim
    );

    @Query("SELECT COUNT(p) FROM PagamentoProfissional p " +
           "WHERE p.profissional.id = :profissionalId AND p.status = :status")
    long countByProfissionalIdAndStatus(
        @Param("profissionalId") Long profissionalId,
        @Param("status") StatusPagamentoProfissional status
    );
}
