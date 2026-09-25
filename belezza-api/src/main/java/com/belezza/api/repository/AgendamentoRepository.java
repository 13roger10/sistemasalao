package com.belezza.api.repository;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.StatusAgendamento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {

    Optional<Agendamento> findByTokenConfirmacao(String token);

    Page<Agendamento> findBySalonId(Long salonId, Pageable pageable);

    Page<Agendamento> findByClienteId(Long clienteId, Pageable pageable);

    Page<Agendamento> findByProfissionalId(Long profissionalId, Pageable pageable);

    List<Agendamento> findBySalonIdAndStatus(Long salonId, StatusAgendamento status);

    // Check for scheduling conflicts
    @Query("SELECT a FROM Agendamento a WHERE a.profissional.id = :profId " +
           "AND a.status NOT IN ('CANCELADO', 'NO_SHOW') " +
           "AND a.dataHora < :fim AND a.fimPrevisto > :inicio")
    List<Agendamento> findConflicts(
        @Param("profId") Long profissionalId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Find appointments that need 24h reminder
    @Query("SELECT a FROM Agendamento a WHERE a.status = 'CONFIRMADO' " +
           "AND a.lembreteEnviado24h = false " +
           "AND a.dataHora BETWEEN :inicio AND :fim")
    List<Agendamento> findNeedingReminder24h(
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Find appointments that need 2h reminder
    @Query("SELECT a FROM Agendamento a WHERE a.status = 'CONFIRMADO' " +
           "AND a.lembreteEnviado2h = false " +
           "AND a.dataHora BETWEEN :inicio AND :fim")
    List<Agendamento> findNeedingReminder2h(
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Find no-show candidates (past appointment time, still confirmed)
    @Query("SELECT a FROM Agendamento a WHERE a.status = 'CONFIRMADO' " +
           "AND a.dataHora < :cutoff")
    List<Agendamento> findNoShowCandidates(@Param("cutoff") LocalDateTime cutoff);

    // Daily appointments for a professional
    @Query("SELECT a FROM Agendamento a WHERE a.profissional.id = :profId " +
           "AND a.dataHora >= :dayStart AND a.dataHora < :dayEnd " +
           "AND a.status NOT IN ('CANCELADO', 'NO_SHOW') " +
           "ORDER BY a.dataHora")
    List<Agendamento> findDailyByProfissional(
        @Param("profId") Long profissionalId,
        @Param("dayStart") LocalDateTime dayStart,
        @Param("dayEnd") LocalDateTime dayEnd
    );

    // Count by status for metrics
    @Query("SELECT a.status, COUNT(a) FROM Agendamento a " +
           "WHERE a.salon.id = :salonId AND a.dataHora BETWEEN :inicio AND :fim " +
           "GROUP BY a.status")
    List<Object[]> countByStatusAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Count appointments in a period for a salon
    @Query("SELECT COUNT(a) FROM Agendamento a WHERE a.salon.id = :salonId " +
           "AND a.criadoEm BETWEEN :inicio AND :fim")
    long countBySalonIdAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Find appointments by salon and date range (for metrics)
    @Query("SELECT a FROM Agendamento a WHERE a.salon.id = :salonId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "ORDER BY a.dataHora")
    List<Agendamento> findBySalonIdAndDataHoraBetween(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Dashboard: Agendamentos por hora
    @Query("SELECT EXTRACT(HOUR FROM a.dataHora) as hora, COUNT(a) " +
           "FROM Agendamento a WHERE a.salon.id = :salonId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status NOT IN ('CANCELADO', 'NO_SHOW') " +
           "GROUP BY EXTRACT(HOUR FROM a.dataHora) " +
           "ORDER BY hora")
    List<Object[]> countByHourAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Dashboard: Serviços mais populares
    @Query("SELECT a.servico.id, a.servico.nome, a.servico.tipo, a.servico.preco, COUNT(a), SUM(a.valorCobrado) " +
           "FROM Agendamento a WHERE a.salon.id = :salonId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status = 'CONCLUIDO' " +
           "AND a.servico IS NOT NULL " +
           "GROUP BY a.servico.id, a.servico.nome, a.servico.tipo, a.servico.preco " +
           "ORDER BY COUNT(a) DESC")
    List<Object[]> findTopServicosByPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim,
        Pageable pageable
    );

    // Dashboard: Ranking de profissionais
    @Query("SELECT a.profissional.id, a.profissional.usuario.nome, a.profissional.fotoUrl, " +
           "COUNT(a), SUM(a.valorCobrado) " +
           "FROM Agendamento a WHERE a.salon.id = :salonId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status = 'CONCLUIDO' " +
           "GROUP BY a.profissional.id, a.profissional.usuario.nome, a.profissional.fotoUrl " +
           "ORDER BY SUM(a.valorCobrado) DESC")
    List<Object[]> findRankingProfissionaisByPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Dashboard: Total concluídos
    @Query("SELECT COUNT(a) FROM Agendamento a WHERE a.salon.id = :salonId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status = :status")
    long countBySalonIdAndPeriodAndStatus(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim,
        @Param("status") StatusAgendamento status
    );

    // Dashboard: Clientes únicos atendidos no período
    @Query("SELECT COUNT(DISTINCT a.cliente.id) FROM Agendamento a WHERE a.salon.id = :salonId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status = 'CONCLUIDO'")
    long countDistinctClientesAtendidosByPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Dashboard: Clientes recorrentes (mais de um agendamento no período)
    @Query("SELECT COUNT(DISTINCT c.id) FROM Agendamento a JOIN a.cliente c " +
           "WHERE a.salon.id = :salonId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status = 'CONCLUIDO' " +
           "GROUP BY c.id HAVING COUNT(a) > 1")
    Long countClientesRecorrentesByPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Find appointments by the authenticated user (via Cliente -> Usuario relationship)
    @Query("SELECT a FROM Agendamento a " +
           "JOIN a.cliente c " +
           "WHERE c.usuario.id = :usuarioId " +
           "ORDER BY a.dataHora DESC")
    Page<Agendamento> findByClienteUsuarioId(@Param("usuarioId") Long usuarioId, Pageable pageable);

    // Find appointments by user with status filter
    @Query("SELECT a FROM Agendamento a " +
           "JOIN a.cliente c " +
           "WHERE c.usuario.id = :usuarioId " +
           "AND a.status = :status " +
           "ORDER BY a.dataHora DESC")
    Page<Agendamento> findByClienteUsuarioIdAndStatus(
        @Param("usuarioId") Long usuarioId,
        @Param("status") StatusAgendamento status,
        Pageable pageable
    );

    // Meta: Calcular faturamento do salão no período
    @Query("SELECT COALESCE(SUM(a.valorCobrado), 0) FROM Agendamento a " +
           "WHERE a.salon.id = :salonId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status = 'CONCLUIDO'")
    java.math.BigDecimal calcularFaturamento(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Meta: Calcular faturamento por profissional no período
    @Query("SELECT COALESCE(SUM(a.valorCobrado), 0) FROM Agendamento a " +
           "WHERE a.salon.id = :salonId " +
           "AND a.profissional.id = :profissionalId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status = 'CONCLUIDO'")
    java.math.BigDecimal calcularFaturamentoPorProfissional(
        @Param("salonId") Long salonId,
        @Param("profissionalId") Long profissionalId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Meta: Contar atendimentos do salão no período
    @Query("SELECT COUNT(a) FROM Agendamento a " +
           "WHERE a.salon.id = :salonId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status = 'CONCLUIDO'")
    long contarAtendimentos(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Meta: Contar atendimentos por profissional no período
    @Query("SELECT COUNT(a) FROM Agendamento a " +
           "WHERE a.salon.id = :salonId " +
           "AND a.profissional.id = :profissionalId " +
           "AND a.dataHora BETWEEN :inicio AND :fim " +
           "AND a.status = 'CONCLUIDO'")
    long contarAtendimentosPorProfissional(
        @Param("salonId") Long salonId,
        @Param("profissionalId") Long profissionalId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    /** Agendamentos em que o usuário participa como cliente ou como profissional (histórico). */
    @Query("SELECT COUNT(a) FROM Agendamento a WHERE a.cliente.usuario.id = :usuarioId OR a.profissional.usuario.id = :usuarioId")
    long countEnvolvendoUsuario(@Param("usuarioId") Long usuarioId);
}
