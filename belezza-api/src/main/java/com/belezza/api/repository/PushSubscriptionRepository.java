package com.belezza.api.repository;

import com.belezza.api.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    List<PushSubscription> findByUsuarioIdAndAtivoTrue(Long usuarioId);

    Optional<PushSubscription> findByEndpointHash(String endpointHash);

    boolean existsByEndpointHash(String endpointHash);

    @Modifying
    @Query("DELETE FROM PushSubscription p WHERE p.endpointHash = :endpointHash")
    void deleteByEndpointHash(@Param("endpointHash") String endpointHash);

    @Modifying
    @Query("UPDATE PushSubscription p SET p.ativo = false WHERE p.endpointHash = :endpointHash")
    void desativarByEndpointHash(@Param("endpointHash") String endpointHash);

    @Modifying
    @Query("UPDATE PushSubscription p SET p.ultimoUsoEm = CURRENT_TIMESTAMP WHERE p.id = :id")
    void atualizarUltimoUso(@Param("id") Long id);

    @Query("SELECT p FROM PushSubscription p WHERE p.usuario.id IN :usuarioIds AND p.ativo = true")
    List<PushSubscription> findByUsuarioIdsAndAtivoTrue(@Param("usuarioIds") List<Long> usuarioIds);
}
