package com.belezza.api.repository;

import com.belezza.api.entity.HistoricoMeta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HistoricoMetaRepository extends JpaRepository<HistoricoMeta, Long> {

    @Query("SELECT h FROM HistoricoMeta h WHERE h.meta.id = :metaId ORDER BY h.dataRegistro DESC")
    List<HistoricoMeta> findByMetaId(@Param("metaId") Long metaId);

    Page<HistoricoMeta> findByMetaIdOrderByDataRegistroDesc(Long metaId, Pageable pageable);

    @Query("SELECT h FROM HistoricoMeta h WHERE h.meta.id = :metaId AND h.dataRegistro BETWEEN :inicio AND :fim ORDER BY h.dataRegistro")
    List<HistoricoMeta> findByMetaIdAndPeriodo(@Param("metaId") Long metaId, @Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim);
}
