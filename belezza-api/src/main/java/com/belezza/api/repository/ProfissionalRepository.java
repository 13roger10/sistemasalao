package com.belezza.api.repository;

import com.belezza.api.entity.Profissional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProfissionalRepository extends JpaRepository<Profissional, Long> {

    Optional<Profissional> findByUsuarioId(Long usuarioId);

    Optional<Profissional> findByUsuarioIdAndAtivoTrue(Long usuarioId);

    List<Profissional> findBySalonIdAndAtivoTrue(Long salonId);

    List<Profissional> findBySalonId(Long salonId);

    boolean existsByUsuarioId(Long usuarioId);

    @Query("SELECT p FROM Profissional p JOIN p.servicos s WHERE s.id = :servicoId AND p.ativo = true")
    List<Profissional> findActiveByServicoId(@Param("servicoId") Long servicoId);

    @Query("SELECT p FROM Profissional p WHERE p.salon.id = :salonId AND p.aceitaAgendamentoOnline = true AND p.ativo = true")
    List<Profissional> findOnlineAvailableBySalonId(@Param("salonId") Long salonId);

    @Query("SELECT COUNT(p) FROM Profissional p WHERE p.salon.id = :salonId AND p.ativo = true")
    long countActiveBySalonId(@Param("salonId") Long salonId);
}
