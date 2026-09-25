package com.belezza.api.repository;

import com.belezza.api.entity.MovimentacaoCaixa;
import com.belezza.api.entity.TipoMovimentacaoCaixa;
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
public interface MovimentacaoCaixaRepository extends JpaRepository<MovimentacaoCaixa, Long> {

    List<MovimentacaoCaixa> findByCaixaId(Long caixaId);

    @Query("SELECT m FROM MovimentacaoCaixa m WHERE m.caixa.salon.id = :salonId ORDER BY m.criadoEm DESC")
    Page<MovimentacaoCaixa> findBySalonId(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(m.valor), 0) FROM MovimentacaoCaixa m WHERE m.caixa.salon.id = :salonId " +
           "AND m.tipo = :tipo AND m.criadoEm >= :inicio AND m.criadoEm < :fim")
    BigDecimal sumBySalonAndTipoAndPeriod(@Param("salonId") Long salonId,
                                          @Param("tipo") TipoMovimentacaoCaixa tipo,
                                          @Param("inicio") LocalDateTime inicio,
                                          @Param("fim") LocalDateTime fim);

    @Query("SELECT m.categoria, SUM(m.valor) FROM MovimentacaoCaixa m WHERE m.caixa.salon.id = :salonId " +
           "AND m.tipo = :tipo AND m.criadoEm >= :inicio AND m.criadoEm < :fim GROUP BY m.categoria")
    List<Object[]> sumByCategoriaAndPeriod(@Param("salonId") Long salonId,
                                           @Param("tipo") TipoMovimentacaoCaixa tipo,
                                           @Param("inicio") LocalDateTime inicio,
                                           @Param("fim") LocalDateTime fim);
}
