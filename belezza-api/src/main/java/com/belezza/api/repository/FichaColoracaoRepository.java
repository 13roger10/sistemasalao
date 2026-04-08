package com.belezza.api.repository;

import com.belezza.api.entity.FichaColoracao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FichaColoracaoRepository extends JpaRepository<FichaColoracao, Long> {

    Optional<FichaColoracao> findByClienteIdAndSalonId(Long clienteId, Long salonId);

    @Query("SELECT f FROM FichaColoracao f WHERE f.salon.id = :salonId")
    Page<FichaColoracao> findBySalonId(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT f FROM FichaColoracao f WHERE f.salon.id = :salonId")
    List<FichaColoracao> findBySalonId(@Param("salonId") Long salonId);

    boolean existsByClienteIdAndSalonId(Long clienteId, Long salonId);

    @Query("SELECT f FROM FichaColoracao f WHERE f.salon.id = :salonId AND f.temAlergia = true")
    List<FichaColoracao> findClientesComAlergia(@Param("salonId") Long salonId);
}
