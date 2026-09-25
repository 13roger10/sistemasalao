package com.belezza.api.repository;

import com.belezza.api.entity.Caixa;
import com.belezza.api.entity.StatusCaixa;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CaixaRepository extends JpaRepository<Caixa, Long> {

    Optional<Caixa> findFirstBySalonIdAndStatus(Long salonId, StatusCaixa status);

    boolean existsBySalonIdAndStatus(Long salonId, StatusCaixa status);

    /**
     * Caixa travado para escrita — serializa fechamento, sangria e lançamentos concorrentes.
     * SQL nativo com FOR UPDATE: o @Lock(PESSIMISTIC_WRITE) do Hibernate gera "FOR NO KEY UPDATE",
     * que o PostgreSQL aceita mas o H2 (perfil local/testes) não.
     */
    @Query(value = "SELECT * FROM caixas WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<Caixa> findByIdForUpdate(@Param("id") Long id);

    Page<Caixa> findBySalonIdOrderByAbertoEmDesc(Long salonId, Pageable pageable);
}
