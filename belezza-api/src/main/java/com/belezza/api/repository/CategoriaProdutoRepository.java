package com.belezza.api.repository;

import com.belezza.api.entity.CategoriaProduto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoriaProdutoRepository extends JpaRepository<CategoriaProduto, Long> {

    Optional<CategoriaProduto> findByIdAndSalonId(Long id, Long salonId);

    @Query("SELECT c FROM CategoriaProduto c WHERE c.salon.id = :salonId AND c.ativo = true ORDER BY c.ordem, c.nome")
    List<CategoriaProduto> findBySalonIdAndAtivoTrue(@Param("salonId") Long salonId);

    boolean existsByNomeAndSalonId(String nome, Long salonId);
}
