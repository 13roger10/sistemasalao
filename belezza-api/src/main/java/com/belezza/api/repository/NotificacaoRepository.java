package com.belezza.api.repository;

import com.belezza.api.entity.Notificacao;
import com.belezza.api.entity.TipoNotificacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {

    Page<Notificacao> findByUsuarioIdOrderByCriadoEmDesc(Long usuarioId, Pageable pageable);

    List<Notificacao> findByUsuarioIdAndLidaFalseOrderByCriadoEmDesc(Long usuarioId);

    long countByUsuarioIdAndLidaFalse(Long usuarioId);

    @Modifying
    @Query("UPDATE Notificacao n SET n.lida = true, n.lidaEm = CURRENT_TIMESTAMP WHERE n.id = :id")
    void marcarComoLida(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Notificacao n SET n.lida = true, n.lidaEm = CURRENT_TIMESTAMP WHERE n.usuario.id = :usuarioId AND n.lida = false")
    void marcarTodasComoLidas(@Param("usuarioId") Long usuarioId);

    @Modifying
    @Query("UPDATE Notificacao n SET n.enviada = true, n.enviadaEm = CURRENT_TIMESTAMP WHERE n.id = :id")
    void marcarComoEnviada(@Param("id") Long id);

    List<Notificacao> findByEnviadaFalseAndCriadoEmAfter(LocalDateTime after);

    @Query("SELECT n FROM Notificacao n WHERE n.usuario.id = :usuarioId AND n.tipo = :tipo ORDER BY n.criadoEm DESC")
    List<Notificacao> findByUsuarioIdAndTipo(
        @Param("usuarioId") Long usuarioId,
        @Param("tipo") TipoNotificacao tipo,
        Pageable pageable
    );
}
