package com.belezza.api.repository;

import com.belezza.api.entity.ContaSocial;
import com.belezza.api.entity.PlataformaSocial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContaSocialRepository extends JpaRepository<ContaSocial, Long> {

    List<ContaSocial> findBySalonIdAndAtivaTrue(Long salonId);

    List<ContaSocial> findBySalonId(Long salonId);

    Optional<ContaSocial> findBySalonIdAndPlataformaAndAtivaTrue(Long salonId, PlataformaSocial plataforma);

    Optional<ContaSocial> findBySalonIdAndAccountId(Long salonId, String accountId);

    // Find accounts with expiring tokens (for auto-refresh)
    @Query("SELECT c FROM ContaSocial c WHERE c.ativa = true AND c.tokenExpira < :limit")
    List<ContaSocial> findWithExpiringTokens(@Param("limit") LocalDateTime limit);

    @Query("SELECT COUNT(c) FROM ContaSocial c WHERE c.salon.id = :salonId AND c.plataforma = :plataforma AND c.ativa = true")
    long countActiveBySalonIdAndPlataforma(
        @Param("salonId") Long salonId,
        @Param("plataforma") PlataformaSocial plataforma
    );
}
