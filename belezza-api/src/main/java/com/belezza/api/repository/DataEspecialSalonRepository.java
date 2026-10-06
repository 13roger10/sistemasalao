package com.belezza.api.repository;

import com.belezza.api.entity.DataEspecialSalon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DataEspecialSalonRepository extends JpaRepository<DataEspecialSalon, Long> {

    List<DataEspecialSalon> findBySalonIdAndCategoriaOrderByDataAsc(Long salonId, String categoria);

    Optional<DataEspecialSalon> findByIdAndSalonIdAndCategoria(Long id, Long salonId, String categoria);

    /** Candidatas a valer no dia: a data exata ou as recorrentes (o dia/mês é conferido em Java). */
    @Query("SELECT d FROM DataEspecialSalon d WHERE d.salonId = :salonId AND (d.data = :dia OR d.recorrente = true)")
    List<DataEspecialSalon> candidatasDoDia(@Param("salonId") Long salonId, @Param("dia") LocalDate dia);
}
