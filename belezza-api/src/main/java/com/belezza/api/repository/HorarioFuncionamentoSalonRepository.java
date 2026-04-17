package com.belezza.api.repository;

import com.belezza.api.entity.DiaSemana;
import com.belezza.api.entity.HorarioFuncionamentoSalon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HorarioFuncionamentoSalonRepository extends JpaRepository<HorarioFuncionamentoSalon, Long> {

    List<HorarioFuncionamentoSalon> findBySalonId(Long salonId);

    Optional<HorarioFuncionamentoSalon> findBySalonIdAndDiaSemana(Long salonId, DiaSemana diaSemana);
}
