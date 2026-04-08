package com.belezza.api.repository;

import com.belezza.api.entity.StatusTarefa;
import com.belezza.api.entity.TarefaSalon;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TarefaRepository extends JpaRepository<TarefaSalon, Long> {

    Optional<TarefaSalon> findByIdAndSalonId(Long id, Long salonId);

    @Query("SELECT t FROM TarefaSalon t WHERE t.salon.id = :salonId AND t.ativo = true ORDER BY t.prioridade DESC, t.dataPrevista ASC")
    List<TarefaSalon> findBySalonIdAndAtivoTrue(@Param("salonId") Long salonId);

    @Query("SELECT t FROM TarefaSalon t WHERE t.salon.id = :salonId AND t.ativo = true")
    Page<TarefaSalon> findBySalonIdAndAtivoTrue(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT t FROM TarefaSalon t WHERE t.atribuidoA.id = :usuarioId AND t.ativo = true AND t.status != 'CONCLUIDA' ORDER BY t.prioridade DESC, t.dataPrevista ASC")
    List<TarefaSalon> findMinhasTarefas(@Param("usuarioId") Long usuarioId);

    @Query("SELECT t FROM TarefaSalon t WHERE t.salon.id = :salonId AND t.dataPrevista = :data AND t.ativo = true ORDER BY t.prioridade DESC, t.horaPrevista ASC")
    List<TarefaSalon> findTarefasDoDia(@Param("salonId") Long salonId, @Param("data") LocalDate data);

    @Query("SELECT t FROM TarefaSalon t WHERE t.salon.id = :salonId AND t.status = :status AND t.ativo = true ORDER BY t.prioridade DESC, t.dataPrevista ASC")
    List<TarefaSalon> findByStatusAndSalonId(@Param("salonId") Long salonId, @Param("status") StatusTarefa status);

    @Query("SELECT t FROM TarefaSalon t WHERE t.salon.id = :salonId AND t.atribuidoA.id = :usuarioId AND t.ativo = true")
    Page<TarefaSalon> findByAtribuidoAndSalonId(@Param("salonId") Long salonId, @Param("usuarioId") Long usuarioId, Pageable pageable);

    @Query("SELECT t FROM TarefaSalon t WHERE t.recorrencia != 'NENHUMA' AND t.status = 'CONCLUIDA' AND t.ativo = true")
    List<TarefaSalon> findTarefasRecorrentes();

    @Query("SELECT t FROM TarefaSalon t WHERE t.salon.id = :salonId AND t.dataPrevista < :hoje AND t.status NOT IN ('CONCLUIDA', 'CANCELADA') AND t.ativo = true")
    List<TarefaSalon> findTarefasAtrasadas(@Param("salonId") Long salonId, @Param("hoje") LocalDate hoje);

    @Query("SELECT COUNT(t) FROM TarefaSalon t WHERE t.salon.id = :salonId AND t.status = :status AND t.ativo = true")
    long countByStatusAndSalonId(@Param("salonId") Long salonId, @Param("status") StatusTarefa status);

    @Query("SELECT COUNT(t) FROM TarefaSalon t WHERE t.atribuidoA.id = :usuarioId AND t.status NOT IN ('CONCLUIDA', 'CANCELADA') AND t.ativo = true")
    long countTarefasPendentes(@Param("usuarioId") Long usuarioId);

    @Query("SELECT t FROM TarefaSalon t WHERE t.salon.id = :salonId AND t.categoria = :categoria AND t.ativo = true ORDER BY t.dataPrevista DESC")
    List<TarefaSalon> findByCategoria(@Param("salonId") Long salonId, @Param("categoria") String categoria);

    @Query("SELECT DISTINCT t.categoria FROM TarefaSalon t WHERE t.salon.id = :salonId AND t.categoria IS NOT NULL AND t.ativo = true")
    List<String> findCategoriasBySalonId(@Param("salonId") Long salonId);
}
