package com.belezza.api.repository;

import com.belezza.api.entity.BackupCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for BackupCode entity.
 */
@Repository
public interface BackupCodeRepository extends JpaRepository<BackupCode, Long> {

    List<BackupCode> findByUsuarioIdAndUsadoFalse(Long usuarioId);

    long countByUsuarioIdAndUsadoFalse(Long usuarioId);

    @Modifying
    @Query("DELETE FROM BackupCode bc WHERE bc.usuario.id = :usuarioId")
    void deleteAllByUsuarioId(@Param("usuarioId") Long usuarioId);
}
