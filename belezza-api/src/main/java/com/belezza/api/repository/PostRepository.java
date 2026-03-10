package com.belezza.api.repository;

import com.belezza.api.entity.Post;
import com.belezza.api.entity.StatusPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    Page<Post> findBySalonId(Long salonId, Pageable pageable);

    Page<Post> findBySalonIdAndStatus(Long salonId, StatusPost status, Pageable pageable);

    // Methods with Salon entity
    Page<Post> findBySalon(com.belezza.api.entity.Salon salon, Pageable pageable);

    Page<Post> findBySalonAndStatus(com.belezza.api.entity.Salon salon, StatusPost status, Pageable pageable);

    java.util.Optional<Post> findByIdAndSalon(Long id, com.belezza.api.entity.Salon salon);

    List<Post> findByCriadorId(Long criadorId);

    // Find posts scheduled for publishing
    @Query("SELECT p FROM Post p WHERE p.status = 'AGENDADO' " +
           "AND p.agendadoPara <= :now")
    List<Post> findReadyToPublish(@Param("now") LocalDateTime now);

    // Find failed posts that can be retried
    @Query("SELECT p FROM Post p WHERE p.status = 'FALHOU' AND p.tentativasPublicacao < 3")
    List<Post> findRetryable();

    // Count posts by status for metrics
    @Query("SELECT p.status, COUNT(p) FROM Post p " +
           "WHERE p.salon.id = :salonId AND p.criadoEm BETWEEN :inicio AND :fim " +
           "GROUP BY p.status")
    List<Object[]> countByStatusAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Social engagement metrics
    @Query("SELECT SUM(p.curtidas), SUM(p.comentarios), SUM(p.compartilhamentos), SUM(p.alcance) " +
           "FROM Post p WHERE p.salon.id = :salonId AND p.status = 'PUBLICADO' " +
           "AND p.publicadoEm BETWEEN :inicio AND :fim")
    List<Object[]> sumEngagementBySalonIdAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    @Query("SELECT COUNT(p) FROM Post p WHERE p.salon.id = :salonId " +
           "AND p.criadoEm BETWEEN :inicio AND :fim")
    long countBySalonIdAndPeriod(
        @Param("salonId") Long salonId,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Find published posts by salon and date range (for social metrics)
    @Query("SELECT p FROM Post p WHERE p.salon.id = :salonId " +
           "AND p.status = :status AND p.publicadoEm BETWEEN :inicio AND :fim " +
           "ORDER BY p.publicadoEm DESC")
    List<Post> findBySalonIdAndStatusAndPublicadoEmBetween(
        @Param("salonId") Long salonId,
        @Param("status") StatusPost status,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );
}
