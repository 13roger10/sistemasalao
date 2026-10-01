package com.belezza.api.repository;

import com.belezza.api.entity.RecepcionistaUnidade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecepcionistaUnidadeRepository extends JpaRepository<RecepcionistaUnidade, Long> {

    List<RecepcionistaUnidade> findByUsuarioId(Long usuarioId);

    boolean existsByUsuarioIdAndSalonId(Long usuarioId, Long salonId);
}
