package com.belezza.api.repository;

import com.belezza.api.entity.FidelidadeCliente;
import com.belezza.api.entity.NivelFidelidade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FidelidadeClienteRepository extends JpaRepository<FidelidadeCliente, Long> {

    Optional<FidelidadeCliente> findByClienteIdAndProgramaId(Long clienteId, Long programaId);

    List<FidelidadeCliente> findByClienteIdAndAtivoTrue(Long clienteId);

    List<FidelidadeCliente> findByProgramaIdAndAtivoTrue(Long programaId);

    boolean existsByClienteIdAndProgramaId(Long clienteId, Long programaId);

    @Query("SELECT fc FROM FidelidadeCliente fc WHERE fc.cliente.id = :clienteId AND fc.ativo = true ORDER BY fc.nivel DESC, fc.pontosNivel DESC")
    List<FidelidadeCliente> findAllActiveByCliente(@Param("clienteId") Long clienteId);

    @Query("SELECT fc FROM FidelidadeCliente fc WHERE fc.programa.salon.id = :salonId AND fc.ativo = true ORDER BY fc.pontosNivel DESC")
    Page<FidelidadeCliente> findAllBySalonId(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT fc FROM FidelidadeCliente fc WHERE fc.programa.salon.id = :salonId AND fc.nivel = :nivel AND fc.ativo = true ORDER BY fc.pontosNivel DESC")
    List<FidelidadeCliente> findByNivelAndSalonId(@Param("salonId") Long salonId, @Param("nivel") NivelFidelidade nivel);

    @Query("SELECT fc.nivel, COUNT(fc) FROM FidelidadeCliente fc WHERE fc.programa.salon.id = :salonId AND fc.ativo = true GROUP BY fc.nivel")
    List<Object[]> countByNivelBySalonId(@Param("salonId") Long salonId);

    @Query("SELECT fc FROM FidelidadeCliente fc WHERE fc.creditosDisponiveis > 0 AND fc.programa.salon.id = :salonId AND fc.ativo = true")
    List<FidelidadeCliente> findWithCreditosDisponiveis(@Param("salonId") Long salonId);

    @Query("SELECT fc FROM FidelidadeCliente fc WHERE fc.cliente.salon.id = :salonId AND fc.programa.salon.id = :salonId AND fc.ativo = true ORDER BY fc.pontosNivel DESC")
    List<FidelidadeCliente> findTopClientesByPontos(@Param("salonId") Long salonId, Pageable pageable);
}
