package com.belezza.api.repository;

import com.belezza.api.entity.Imagem;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
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
public interface ImagemRepository extends JpaRepository<Imagem, Long> {

    // Find by salon
    Page<Imagem> findBySalonAndAtivoTrue(Salon salon, Pageable pageable);

    List<Imagem> findBySalonAndAtivoTrue(Salon salon);

    // Find by creator
    Page<Imagem> findByCriadorAndAtivoTrue(Usuario criador, Pageable pageable);

    // Find by ID and salon (for security)
    Optional<Imagem> findByIdAndSalon(Long id, Salon salon);

    // Find by date range
    @Query("SELECT i FROM Imagem i WHERE i.salon = :salon AND i.ativo = true " +
           "AND i.criadoEm BETWEEN :inicio AND :fim ORDER BY i.criadoEm DESC")
    List<Imagem> findBySalonAndDateRange(
        @Param("salon") Salon salon,
        @Param("inicio") LocalDateTime inicio,
        @Param("fim") LocalDateTime fim
    );

    // Count images by salon
    long countBySalonAndAtivoTrue(Salon salon);

    // Count total storage used by salon
    @Query("SELECT COALESCE(SUM(i.tamanhoBytes), 0) FROM Imagem i " +
           "WHERE i.salon = :salon AND i.ativo = true")
    long calculateTotalStorageBytes(@Param("salon") Salon salon);

    // Find oldest images for cleanup
    @Query("SELECT i FROM Imagem i WHERE i.salon = :salon AND i.ativo = true " +
           "ORDER BY i.criadoEm ASC")
    List<Imagem> findOldestImages(@Param("salon") Salon salon, Pageable pageable);
}
