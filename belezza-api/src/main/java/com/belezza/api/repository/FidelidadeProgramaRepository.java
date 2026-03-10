package com.belezza.api.repository;

import com.belezza.api.entity.FidelidadePrograma;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FidelidadeProgramaRepository extends JpaRepository<FidelidadePrograma, Long> {

    List<FidelidadePrograma> findBySalonIdAndAtivoTrue(Long salonId);

    Optional<FidelidadePrograma> findByIdAndSalonIdAndAtivoTrue(Long id, Long salonId);

    Optional<FidelidadePrograma> findByIdAndAtivoTrue(Long id);

    boolean existsBySalonIdAndNome(Long salonId, String nome);

    @Query("SELECT fp FROM FidelidadePrograma fp WHERE fp.salon.id = :salonId AND fp.ativo = true ORDER BY fp.criadoEm DESC")
    List<FidelidadePrograma> findAllActiveBySalon(@Param("salonId") Long salonId);

    @Query("SELECT COUNT(fp) FROM FidelidadePrograma fp WHERE fp.salon.id = :salonId AND fp.ativo = true")
    long countActiveBySalonId(@Param("salonId") Long salonId);
}
