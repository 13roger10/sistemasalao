package com.belezza.api.repository;

import com.belezza.api.entity.HistoricoColoracao;
import com.belezza.api.entity.TecnicaColoracao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface HistoricoColoracaoRepository extends JpaRepository<HistoricoColoracao, Long> {

    @Query("SELECT h FROM HistoricoColoracao h WHERE h.cliente.id = :clienteId ORDER BY h.dataServico DESC")
    List<HistoricoColoracao> findByClienteId(@Param("clienteId") Long clienteId);

    @Query("SELECT h FROM HistoricoColoracao h WHERE h.ficha.id = :fichaId ORDER BY h.dataServico DESC")
    List<HistoricoColoracao> findByFichaId(@Param("fichaId") Long fichaId);

    Page<HistoricoColoracao> findByFichaIdOrderByDataServicoDesc(Long fichaId, Pageable pageable);

    @Query("SELECT h FROM HistoricoColoracao h WHERE h.profissional.id = :profissionalId ORDER BY h.dataServico DESC")
    List<HistoricoColoracao> findByProfissionalId(@Param("profissionalId") Long profissionalId);

    @Query("SELECT h FROM HistoricoColoracao h WHERE h.ficha.salon.id = :salonId AND h.dataServico BETWEEN :inicio AND :fim ORDER BY h.dataServico DESC")
    List<HistoricoColoracao> findBySalonIdAndPeriodo(@Param("salonId") Long salonId, @Param("inicio") LocalDateTime inicio, @Param("fim") LocalDateTime fim);

    @Query("SELECT h FROM HistoricoColoracao h WHERE h.ficha.salon.id = :salonId AND h.tecnica = :tecnica ORDER BY h.dataServico DESC")
    List<HistoricoColoracao> findByTecnica(@Param("salonId") Long salonId, @Param("tecnica") TecnicaColoracao tecnica);

    @Query("SELECT h FROM HistoricoColoracao h WHERE h.cliente.id = :clienteId ORDER BY h.dataServico DESC LIMIT 1")
    Optional<HistoricoColoracao> findUltimaColoracao(@Param("clienteId") Long clienteId);
}
