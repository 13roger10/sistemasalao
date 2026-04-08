package com.belezza.api.repository;

import com.belezza.api.entity.Meta;
import com.belezza.api.entity.PeriodoMeta;
import com.belezza.api.entity.TipoMeta;
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
public interface MetaRepository extends JpaRepository<Meta, Long> {

    Optional<Meta> findByIdAndSalonId(Long id, Long salonId);

    @Query("SELECT m FROM Meta m WHERE m.salon.id = :salonId AND m.ativo = true ORDER BY m.dataFim DESC")
    List<Meta> findBySalonIdAndAtivoTrue(@Param("salonId") Long salonId);

    @Query("SELECT m FROM Meta m WHERE m.salon.id = :salonId AND m.ativo = true")
    Page<Meta> findBySalonIdAndAtivoTrue(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT m FROM Meta m WHERE m.salon.id = :salonId AND m.dataInicio <= :hoje AND m.dataFim >= :hoje AND m.ativo = true")
    List<Meta> findMetasAtuais(@Param("salonId") Long salonId, @Param("hoje") LocalDate hoje);

    @Query("SELECT m FROM Meta m WHERE m.salon.id = :salonId AND m.tipo = :tipo AND m.ativo = true ORDER BY m.dataFim DESC")
    List<Meta> findByTipo(@Param("salonId") Long salonId, @Param("tipo") TipoMeta tipo);

    @Query("SELECT m FROM Meta m WHERE m.salon.id = :salonId AND m.periodo = :periodo AND m.ativo = true")
    List<Meta> findByPeriodo(@Param("salonId") Long salonId, @Param("periodo") PeriodoMeta periodo);

    @Query("SELECT m FROM Meta m WHERE m.profissional.id = :profissionalId AND m.ativo = true ORDER BY m.dataFim DESC")
    List<Meta> findByProfissionalId(@Param("profissionalId") Long profissionalId);

    @Query("SELECT m FROM Meta m WHERE m.dataInicio <= :hoje AND m.dataFim >= :hoje AND m.ativo = true AND m.notificarProgresso = true")
    List<Meta> findMetasParaAtualizar(@Param("hoje") LocalDate hoje);

    @Query("SELECT COUNT(m) FROM Meta m WHERE m.salon.id = :salonId AND m.valorAtual >= m.valorMeta AND m.dataFim >= :hoje AND m.ativo = true")
    long countMetasAtingidas(@Param("salonId") Long salonId, @Param("hoje") LocalDate hoje);
}
