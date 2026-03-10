package com.belezza.api.repository;

import com.belezza.api.entity.Salon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalonRepository extends JpaRepository<Salon, Long> {

    Optional<Salon> findByAdminId(Long adminId);

    Optional<Salon> findByIdAndAtivoTrue(Long id);

    Optional<Salon> findByAdminIdAndAtivoTrue(Long adminId);

    boolean existsByAdminId(Long adminId);

    List<Salon> findByAtivoTrue();

    @Query("SELECT s FROM Salon s WHERE s.cidade = :cidade AND s.ativo = true")
    List<Salon> findActiveByCidade(@Param("cidade") String cidade);

    @Query("SELECT s FROM Salon s WHERE s.estado = :estado AND s.ativo = true")
    List<Salon> findActiveByEstado(@Param("estado") String estado);

    @Query("SELECT COUNT(s) FROM Salon s WHERE s.ativo = true")
    long countActive();
}
