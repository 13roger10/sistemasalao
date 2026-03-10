package com.belezza.api.repository;

import com.belezza.api.entity.BloqueioHorario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BloqueioHorarioRepository extends JpaRepository<BloqueioHorario, Long> {

    List<BloqueioHorario> findByProfissionalId(Long profissionalId);

    // Check if a professional has a block during a time range
    @Query("SELECT b FROM BloqueioHorario b WHERE b.profissional.id = :profId " +
           "AND b.dataInicio < :fim AND b.dataFim > :inicio")
    List<BloqueioHorario> findConflicts(
        @Param("profId") Long profissionalId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Find active blocks for a professional in a date range
    @Query("SELECT b FROM BloqueioHorario b WHERE b.profissional.id = :profId " +
           "AND b.dataFim >= :inicio AND b.dataInicio <= :fim " +
           "ORDER BY b.dataInicio")
    List<BloqueioHorario> findByProfissionalIdAndPeriod(
        @Param("profId") Long profissionalId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );
}
