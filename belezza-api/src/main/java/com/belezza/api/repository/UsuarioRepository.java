package com.belezza.api.repository;

import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Usuario entity operations.
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    Optional<Usuario> findByEmailAndAtivoTrue(String email);

    boolean existsByEmail(String email);

    boolean existsByTelefone(String telefone);

    Optional<Usuario> findByTelefone(String telefone);

    Optional<Usuario> findByResetPasswordToken(String token);

    Optional<Usuario> findByEmailVerificationToken(String token);

    List<Usuario> findByRoleAndAtivoTrue(Role role);

    @Modifying
    @Query("UPDATE Usuario u SET u.ultimoLogin = :loginTime WHERE u.id = :userId")
    void updateLastLogin(@Param("userId") Long userId, @Param("loginTime") LocalDateTime loginTime);

    @Query("SELECT u FROM Usuario u WHERE u.ativo = true AND u.role = :role")
    List<Usuario> findActiveByRole(@Param("role") Role role);

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.ativo = true")
    long countActiveUsers();

    // Queries para gestão de usuários com paginação e filtros
    Page<Usuario> findAllByOrderByCriadoEmDesc(Pageable pageable);

    @Query("SELECT u FROM Usuario u WHERE u.ativo = :ativo ORDER BY u.criadoEm DESC")
    Page<Usuario> findByAtivo(@Param("ativo") boolean ativo, Pageable pageable);

    @Query("SELECT u FROM Usuario u WHERE u.role = :role ORDER BY u.criadoEm DESC")
    Page<Usuario> findByRole(@Param("role") Role role, Pageable pageable);

    @Query("SELECT u FROM Usuario u WHERE u.role = :role AND u.ativo = :ativo ORDER BY u.criadoEm DESC")
    Page<Usuario> findByRoleAndAtivo(@Param("role") Role role, @Param("ativo") boolean ativo, Pageable pageable);

    @Query("SELECT u FROM Usuario u WHERE " +
           "(LOWER(u.nome) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY u.criadoEm DESC")
    Page<Usuario> searchByNomeOrEmail(@Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM Usuario u WHERE " +
           "(LOWER(u.nome) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND u.role = :role ORDER BY u.criadoEm DESC")
    Page<Usuario> searchByNomeOrEmailAndRole(@Param("search") String search, @Param("role") Role role, Pageable pageable);

    // Equipe de um salão: profissionais, recepcionistas (vínculo direto) e o admin dono DESSE salão
    // (antes a condição "u.role = 'ADMIN'" trazia os administradores de todos os salões).
    @Query("SELECT DISTINCT u FROM Usuario u " +
           "LEFT JOIN Profissional p ON p.usuario = u " +
           "WHERE p.salon.id = :salonId OR u.salon.id = :salonId " +
           "OR EXISTS (SELECT s FROM Salon s WHERE s.admin = u AND s.id = :salonId)")
    Page<Usuario> findBySalonId(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT DISTINCT u FROM Usuario u " +
           "LEFT JOIN Profissional p ON p.usuario = u " +
           "WHERE (p.salon.id = :salonId OR u.salon.id = :salonId " +
           "OR EXISTS (SELECT s FROM Salon s WHERE s.admin = u AND s.id = :salonId)) AND u.role = :role")
    Page<Usuario> findBySalonIdAndRole(@Param("salonId") Long salonId, @Param("role") Role role, Pageable pageable);

    // Todos os usuários vinculados a um salão — equipe, admin dono e clientes do salão —, com busca
    // por nome/e-mail (search vazio = todos). Usado na listagem do ADMIN, restrita ao próprio salão.
    String VINCULADO_AO_SALAO =
           "(u.salon.id = :salonId " +
           "OR EXISTS (SELECT p FROM Profissional p WHERE p.usuario = u AND p.salon.id = :salonId) " +
           "OR EXISTS (SELECT c FROM Cliente c WHERE c.usuario = u AND c.salon.id = :salonId) " +
           "OR EXISTS (SELECT s FROM Salon s WHERE s.admin = u AND s.id = :salonId))";
    String BUSCA_NOME_EMAIL =
           "(LOWER(u.nome) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))";

    @Query("SELECT u FROM Usuario u WHERE " + VINCULADO_AO_SALAO + " AND " + BUSCA_NOME_EMAIL +
           " ORDER BY u.criadoEm DESC")
    Page<Usuario> searchVinculadosAoSalao(@Param("salonId") Long salonId, @Param("search") String search,
                                           Pageable pageable);

    @Query("SELECT u FROM Usuario u WHERE " + VINCULADO_AO_SALAO + " AND " + BUSCA_NOME_EMAIL +
           " AND u.role = :role ORDER BY u.criadoEm DESC")
    Page<Usuario> searchVinculadosAoSalaoAndRole(@Param("salonId") Long salonId, @Param("search") String search,
                                                  @Param("role") Role role, Pageable pageable);

    // Recepcionistas ativos vinculados diretamente a um salão (para notificações da equipe)
    List<Usuario> findByRoleAndSalonIdAndAtivoTrue(Role role, Long salonId);
}
