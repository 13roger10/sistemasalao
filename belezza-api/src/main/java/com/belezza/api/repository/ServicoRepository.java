package com.belezza.api.repository;

import com.belezza.api.entity.Servico;
import com.belezza.api.entity.TipoServico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServicoRepository extends JpaRepository<Servico, Long> {

    List<Servico> findBySalonIdAndAtivoTrue(Long salonId);

    List<Servico> findBySalonId(Long salonId);

    Optional<Servico> findByIdAndSalonId(Long id, Long salonId);

    List<Servico> findBySalonIdAndTipoAndAtivoTrue(Long salonId, TipoServico tipo);

    boolean existsByNomeAndSalonId(String nome, Long salonId);

    @Query("SELECT s FROM Servico s JOIN s.salon sa WHERE sa.id = :salonId AND s.ativo = true ORDER BY s.tipo, s.nome")
    List<Servico> findActiveBySalonIdOrdered(@Param("salonId") Long salonId);

    @Query("SELECT COUNT(s) FROM Servico s WHERE s.salon.id = :salonId AND s.ativo = true")
    long countActiveBySalonId(@Param("salonId") Long salonId);
}
