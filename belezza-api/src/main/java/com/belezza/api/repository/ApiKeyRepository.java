package com.belezza.api.repository;

import com.belezza.api.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {

    Optional<ApiKey> findByKeyHash(String keyHash);

    List<ApiKey> findBySalonIdOrderByCriadoEmDesc(Long salonId);

    List<ApiKey> findBySalonIdAndAtivoOrderByCriadoEmDesc(Long salonId, Boolean ativo);

    @Modifying
    @Query("UPDATE ApiKey k SET k.ultimoUsoEm = :ts WHERE k.id = :id")
    void updateUltimoUso(@Param("id") Long id, @Param("ts") LocalDateTime ts);
}
