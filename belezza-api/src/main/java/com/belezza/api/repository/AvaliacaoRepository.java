package com.belezza.api.repository;

import com.belezza.api.entity.Avaliacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AvaliacaoRepository extends JpaRepository<Avaliacao, Long> {

    Optional<Avaliacao> findByAgendamentoId(Long agendamentoId);

    boolean existsByAgendamentoId(Long agendamentoId);

    Page<Avaliacao> findBySalonId(Long salonId, Pageable pageable);

    Page<Avaliacao> findByProfissionalId(Long profissionalId, Pageable pageable);

    @Query("SELECT AVG(a.nota) FROM Avaliacao a WHERE a.salon.id = :salonId")
    Double findAverageNotaBySalonId(@Param("salonId") Long salonId);

    @Query("SELECT AVG(a.nota) FROM Avaliacao a WHERE a.profissional.id = :profissionalId")
    Double findAverageNotaByProfissionalId(@Param("profissionalId") Long profissionalId);

    @Query("SELECT COUNT(a) FROM Avaliacao a WHERE a.salon.id = :salonId")
    long countBySalonId(@Param("salonId") Long salonId);

    @Query("SELECT COUNT(a) FROM Avaliacao a WHERE a.profissional.id = :profissionalId")
    long countByProfissionalId(@Param("profissionalId") Long profissionalId);

    // Dashboard: Média de avaliação como BigDecimal
    @Query("SELECT COALESCE(AVG(a.nota), 0) FROM Avaliacao a WHERE a.profissional.id = :profissionalId")
    java.math.BigDecimal avgNotaByProfissionalId(@Param("profissionalId") Long profissionalId);

    // Ranking: Profissionais por média de nota
    @Query("SELECT a.profissional.id, a.profissional.usuario.nome, a.profissional.fotoUrl, " +
           "AVG(a.nota), COUNT(a), " +
           "SUM(CASE WHEN a.nota = 5 THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN a.nota = 4 THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN a.nota = 3 THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN a.nota = 2 THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN a.nota = 1 THEN 1 ELSE 0 END) " +
           "FROM Avaliacao a WHERE a.salon.id = :salonId " +
           "GROUP BY a.profissional.id, a.profissional.usuario.nome, a.profissional.fotoUrl " +
           "ORDER BY AVG(a.nota) DESC, COUNT(a) DESC")
    java.util.List<Object[]> findRankingPorNotaBySalonId(@Param("salonId") Long salonId);

    // Distribuição de notas por salão
    @Query("SELECT a.nota, COUNT(a) FROM Avaliacao a WHERE a.salon.id = :salonId GROUP BY a.nota ORDER BY a.nota DESC")
    java.util.List<Object[]> countByNotaBySalonId(@Param("salonId") Long salonId);

    // Avaliações com comentário
    @Query("SELECT COUNT(a) FROM Avaliacao a WHERE a.salon.id = :salonId AND a.comentario IS NOT NULL AND LENGTH(a.comentario) > 0")
    long countComComentarioBySalonId(@Param("salonId") Long salonId);

    // Últimas avaliações
    @Query("SELECT a FROM Avaliacao a WHERE a.salon.id = :salonId ORDER BY a.criadoEm DESC")
    java.util.List<Avaliacao> findUltimasBySalonId(@Param("salonId") Long salonId, org.springframework.data.domain.Pageable pageable);

    // Média geral do salão como BigDecimal
    @Query("SELECT COALESCE(AVG(a.nota), 0) FROM Avaliacao a WHERE a.salon.id = :salonId")
    java.math.BigDecimal avgNotaBySalonId(@Param("salonId") Long salonId);
}
