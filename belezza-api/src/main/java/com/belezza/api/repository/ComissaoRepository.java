package com.belezza.api.repository;

import com.belezza.api.entity.Comissao;
import com.belezza.api.entity.StatusComissao;
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
public interface ComissaoRepository extends JpaRepository<Comissao, Long> {

    Optional<Comissao> findByAgendamentoId(Long agendamentoId);

    Page<Comissao> findBySalonId(Long salonId, Pageable pageable);

    Page<Comissao> findByProfissionalId(Long profissionalId, Pageable pageable);

    Page<Comissao> findByProfissionalIdAndStatus(Long profissionalId, StatusComissao status, Pageable pageable);

    List<Comissao> findByProfissionalIdAndStatusAndPagamentoProfissionalIsNull(
            Long profissionalId, StatusComissao status);

    @Query("SELECT c FROM Comissao c WHERE c.profissional.id = :profissionalId " +
           "AND c.status = :status AND c.criadoEm BETWEEN :inicio AND :fim")
    List<Comissao> findByProfissionalIdAndStatusAndPeriod(
        @Param("profissionalId") Long profissionalId,
        @Param("status") StatusComissao status,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    @Query("SELECT SUM(c.valorComissao) FROM Comissao c " +
           "WHERE c.profissional.id = :profissionalId AND c.status = :status")
    BigDecimal sumValorComissaoByProfissionalIdAndStatus(
        @Param("profissionalId") Long profissionalId,
        @Param("status") StatusComissao status
    );

    @Query("SELECT SUM(c.valorComissao) FROM Comissao c " +
           "WHERE c.profissional.id = :profissionalId " +
           "AND c.status = :status AND c.criadoEm BETWEEN :inicio AND :fim")
    BigDecimal sumValorComissaoByProfissionalIdAndStatusAndPeriod(
        @Param("profissionalId") Long profissionalId,
        @Param("status") StatusComissao status,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    @Query("SELECT SUM(c.valorServico) FROM Comissao c " +
           "WHERE c.profissional.id = :profissionalId " +
           "AND c.status = :status AND c.criadoEm BETWEEN :inicio AND :fim")
    BigDecimal sumValorServicoByProfissionalIdAndStatusAndPeriod(
        @Param("profissionalId") Long profissionalId,
        @Param("status") StatusComissao status,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    @Query("SELECT COUNT(c) FROM Comissao c " +
           "WHERE c.profissional.id = :profissionalId AND c.status = :status")
    long countByProfissionalIdAndStatus(
        @Param("profissionalId") Long profissionalId,
        @Param("status") StatusComissao status
    );

    @Query("SELECT COUNT(c) FROM Comissao c " +
           "WHERE c.profissional.id = :profissionalId " +
           "AND c.status = :status AND c.criadoEm BETWEEN :inicio AND :fim")
    long countByProfissionalIdAndStatusAndPeriod(
        @Param("profissionalId") Long profissionalId,
        @Param("status") StatusComissao status,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    @Query("SELECT c FROM Comissao c WHERE c.salon.id = :salonId " +
           "AND c.criadoEm BETWEEN :inicio AND :fim ORDER BY c.criadoEm DESC")
    List<Comissao> findBySalonIdAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    @Query("SELECT c.profissional.id, c.profissional.usuario.nome, " +
           "COUNT(c), SUM(c.valorServico), SUM(c.valorComissao) " +
           "FROM Comissao c WHERE c.salon.id = :salonId " +
           "AND c.criadoEm BETWEEN :inicio AND :fim " +
           "GROUP BY c.profissional.id, c.profissional.usuario.nome")
    List<Object[]> resumoPorProfissionalAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Dashboard: Total de comissões por status no período
    @Query("SELECT c.status, COUNT(c), SUM(c.valorComissao) " +
           "FROM Comissao c WHERE c.salon.id = :salonId " +
           "AND c.criadoEm BETWEEN :inicio AND :fim " +
           "GROUP BY c.status")
    List<Object[]> sumByStatusAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Dashboard: Total geral de comissões no período
    @Query("SELECT SUM(c.valorComissao) FROM Comissao c " +
           "WHERE c.salon.id = :salonId " +
           "AND c.criadoEm BETWEEN :inicio AND :fim")
    BigDecimal sumTotalBySalonIdAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );
}
