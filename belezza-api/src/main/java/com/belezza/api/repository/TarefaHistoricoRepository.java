package com.belezza.api.repository;

import com.belezza.api.entity.TarefaHistorico;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TarefaHistoricoRepository extends JpaRepository<TarefaHistorico, Long> {

    List<TarefaHistorico> findByTarefaIdOrderByCriadoEmDesc(Long tarefaId);

    Page<TarefaHistorico> findByTarefaId(Long tarefaId, Pageable pageable);
}
