package com.belezza.api.repository;

import com.belezza.api.entity.MovimentacaoEstoque;
import com.belezza.api.entity.TipoMovimentacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MovimentacaoEstoqueRepository extends JpaRepository<MovimentacaoEstoque, Long> {

    @Query("SELECT m FROM MovimentacaoEstoque m WHERE m.salon.id = :salonId ORDER BY m.criadoEm DESC")
    Page<MovimentacaoEstoque> findBySalonId(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT m FROM MovimentacaoEstoque m WHERE m.produto.id = :produtoId ORDER BY m.criadoEm DESC")
    Page<MovimentacaoEstoque> findByProdutoId(@Param("produtoId") Long produtoId, Pageable pageable);

    @Query("SELECT m FROM MovimentacaoEstoque m WHERE m.salon.id = :salonId AND m.tipo = :tipo ORDER BY m.criadoEm DESC")
    List<MovimentacaoEstoque> findByTipo(@Param("salonId") Long salonId, @Param("tipo") TipoMovimentacao tipo);

    @Query("SELECT m FROM MovimentacaoEstoque m WHERE m.salon.id = :salonId AND m.criadoEm BETWEEN :inicio AND :fim ORDER BY m.criadoEm DESC")
    List<MovimentacaoEstoque> findByPeriodo(@Param("salonId") Long salonId, @Param("inicio") LocalDateTime inicio, @Param("fim") LocalDateTime fim);

    @Query("SELECT m FROM MovimentacaoEstoque m WHERE m.salon.id = :salonId ORDER BY m.criadoEm DESC")
    List<MovimentacaoEstoque> findRecentes(@Param("salonId") Long salonId, Pageable pageable);
}
