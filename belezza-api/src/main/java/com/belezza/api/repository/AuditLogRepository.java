package com.belezza.api.repository;

import com.belezza.api.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * Repository for AuditLog entity.
 * Provides methods to query audit logs with various filters.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Find audit logs for a specific entity and its ID.
     */
    Page<AuditLog> findByEntidadeAndEntidadeId(String entidade, Long entidadeId, Pageable pageable);

    /**
     * Find audit logs by user.
     */
    Page<AuditLog> findByUsuarioId(Long usuarioId, Pageable pageable);

    /**
     * Find audit logs by action type.
     */
    Page<AuditLog> findByAcao(String acao, Pageable pageable);

    /**
     * Find audit logs by entity type.
     */
    Page<AuditLog> findByEntidade(String entidade, Pageable pageable);

    /**
     * Find all audit logs ordered by creation date (most recent first).
     */
    Page<AuditLog> findAllByOrderByCriadoEmDesc(Pageable pageable);

    /**
     * Find audit logs within a date range.
     */
    Page<AuditLog> findByCriadoEmBetween(LocalDateTime inicio, LocalDateTime fim, Pageable pageable);

    /**
     * Find failed audit logs (when sucesso = false).
     */
    Page<AuditLog> findBySucessoFalse(Pageable pageable);

    /**
     * Complex search with multiple optional filters.
     */
    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:usuarioId IS NULL OR a.usuarioId = :usuarioId) AND " +
           "(:entidade IS NULL OR a.entidade = :entidade) AND " +
           "(:acao IS NULL OR a.acao = :acao) AND " +
           "(:inicio IS NULL OR a.criadoEm >= :inicio) AND " +
           "(:fim IS NULL OR a.criadoEm <= :fim) " +
           "ORDER BY a.criadoEm DESC")
    Page<AuditLog> searchWithFilters(
        @Param("usuarioId") Long usuarioId,
        @Param("entidade") String entidade,
        @Param("acao") String acao,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim,
        Pageable pageable
    );
}
