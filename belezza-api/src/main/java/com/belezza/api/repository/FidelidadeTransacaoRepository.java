package com.belezza.api.repository;

import com.belezza.api.entity.FidelidadeTransacao;
import com.belezza.api.entity.TipoTransacaoFidelidade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FidelidadeTransacaoRepository extends JpaRepository<FidelidadeTransacao, Long> {

    Page<FidelidadeTransacao> findByFidelidadeClienteIdOrderByCriadoEmDesc(Long fidelidadeClienteId, Pageable pageable);

    List<FidelidadeTransacao> findByFidelidadeClienteIdOrderByCriadoEmDesc(Long fidelidadeClienteId);

    List<FidelidadeTransacao> findByAgendamentoId(Long agendamentoId);

    @Query("SELECT ft FROM FidelidadeTransacao ft WHERE ft.fidelidadeCliente.id = :fidelidadeClienteId " +
           "AND ft.criadoEm BETWEEN :inicio AND :fim ORDER BY ft.criadoEm DESC")
    List<FidelidadeTransacao> findByFidelidadeClienteIdAndPeriod(
        @Param("fidelidadeClienteId") Long fidelidadeClienteId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    @Query("SELECT ft FROM FidelidadeTransacao ft WHERE ft.fidelidadeCliente.cliente.id = :clienteId " +
           "ORDER BY ft.criadoEm DESC")
    Page<FidelidadeTransacao> findByClienteId(@Param("clienteId") Long clienteId, Pageable pageable);

    @Query("SELECT ft.tipo, COUNT(ft), SUM(ft.visitas), SUM(ft.creditos) " +
           "FROM FidelidadeTransacao ft WHERE ft.fidelidadeCliente.programa.salon.id = :salonId " +
           "AND ft.criadoEm BETWEEN :inicio AND :fim GROUP BY ft.tipo")
    List<Object[]> resumoTransacoesBySalonAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    @Query("SELECT COUNT(ft) FROM FidelidadeTransacao ft WHERE ft.fidelidadeCliente.id = :fidelidadeClienteId " +
           "AND ft.tipo = :tipo")
    long countByFidelidadeClienteIdAndTipo(
        @Param("fidelidadeClienteId") Long fidelidadeClienteId,
        @Param("tipo") TipoTransacaoFidelidade tipo
    );
}
