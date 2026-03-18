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

    // Query para buscar usuários por salon (via profissional)
    @Query("SELECT DISTINCT u FROM Usuario u " +
           "LEFT JOIN Profissional p ON p.usuario = u " +
           "WHERE p.salon.id = :salonId OR u.role = 'ADMIN'")
    Page<Usuario> findBySalonId(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT DISTINCT u FROM Usuario u " +
           "LEFT JOIN Profissional p ON p.usuario = u " +
           "WHERE (p.salon.id = :salonId OR u.role = 'ADMIN') AND u.role = :role")
    Page<Usuario> findBySalonIdAndRole(@Param("salonId") Long salonId, @Param("role") Role role, Pageable pageable);

    // Buscar usuários CLIENTE que ainda não estão vinculados a um salão específico
    @Query("SELECT u FROM Usuario u WHERE u.role = 'CLIENTE' AND u.ativo = true " +
           "AND NOT EXISTS (SELECT c FROM Cliente c WHERE c.usuario = u AND c.salon.id = :salonId)")
    List<Usuario> findClientesNaoVinculadosAoSalon(@Param("salonId") Long salonId);
}
