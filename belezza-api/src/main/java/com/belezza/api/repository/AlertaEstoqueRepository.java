package com.belezza.api.repository;

import com.belezza.api.entity.AlertaEstoque;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertaEstoqueRepository extends JpaRepository<AlertaEstoque, Long> {

    @Query("SELECT a FROM AlertaEstoque a WHERE a.salon.id = :salonId ORDER BY a.criadoEm DESC")
    Page<AlertaEstoque> findBySalonId(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT a FROM AlertaEstoque a WHERE a.salon.id = :salonId AND a.reconhecido = false ORDER BY a.criadoEm DESC")
    List<AlertaEstoque> findNaoReconhecidos(@Param("salonId") Long salonId);

    @Query("SELECT COUNT(a) FROM AlertaEstoque a WHERE a.salon.id = :salonId AND a.reconhecido = false")
    long countNaoReconhecidos(@Param("salonId") Long salonId);

    @Query("SELECT a FROM AlertaEstoque a WHERE a.produto.id = :produtoId AND a.reconhecido = false")
    List<AlertaEstoque> findByProdutoNaoReconhecidos(@Param("produtoId") Long produtoId);

    boolean existsByProdutoIdAndTipoAndReconhecidoFalse(Long produtoId, String tipo);
}
