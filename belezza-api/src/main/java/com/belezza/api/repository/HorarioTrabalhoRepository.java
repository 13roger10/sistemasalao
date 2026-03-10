package com.belezza.api.repository;

import com.belezza.api.entity.DiaSemana;
import com.belezza.api.entity.HorarioTrabalho;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HorarioTrabalhoRepository extends JpaRepository<HorarioTrabalho, Long> {

    List<HorarioTrabalho> findByProfissionalIdAndAtivoTrue(Long profissionalId);

    List<HorarioTrabalho> findByProfissionalId(Long profissionalId);

    Optional<HorarioTrabalho> findByProfissionalIdAndDiaSemana(Long profissionalId, DiaSemana diaSemana);

    boolean existsByProfissionalIdAndDiaSemana(Long profissionalId, DiaSemana diaSemana);
}
