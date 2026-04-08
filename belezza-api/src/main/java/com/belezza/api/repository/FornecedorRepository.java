package com.belezza.api.repository;

import com.belezza.api.entity.Fornecedor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FornecedorRepository extends JpaRepository<Fornecedor, Long> {

    Optional<Fornecedor> findByIdAndSalonId(Long id, Long salonId);

    Optional<Fornecedor> findByCnpjAndSalonId(String cnpj, Long salonId);

    @Query("SELECT f FROM Fornecedor f WHERE f.salon.id = :salonId AND f.ativo = true ORDER BY f.nome")
    List<Fornecedor> findBySalonIdAndAtivoTrue(@Param("salonId") Long salonId);

    @Query("SELECT f FROM Fornecedor f WHERE f.salon.id = :salonId AND f.ativo = true")
    Page<Fornecedor> findBySalonIdAndAtivoTrue(@Param("salonId") Long salonId, Pageable pageable);

    boolean existsByCnpjAndSalonId(String cnpj, Long salonId);
}
