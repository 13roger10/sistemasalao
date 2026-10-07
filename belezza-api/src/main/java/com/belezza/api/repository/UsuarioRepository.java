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

    // BUG-017: o e-mail é gravado em minúsculas e sem espaços, e as buscas normalizam o que chega.
    // Antes "ADMIN.A@X" não achava "admin.a@x", passava pela checagem de duplicado e o cadastro
    // estourava na restrição única do banco (erro 500).

    @Query("SELECT u FROM Usuario u WHERE u.email = LOWER(TRIM(:email))")
    Optional<Usuario> findByEmail(@Param("email") String email);

    @Query("SELECT u FROM Usuario u WHERE u.email = LOWER(TRIM(:email)) AND u.ativo = true")
    Optional<Usuario> findByEmailAndAtivoTrue(@Param("email") String email);

    @Query("SELECT COUNT(u) > 0 FROM Usuario u WHERE u.email = LOWER(TRIM(:email))")
    boolean existsByEmail(@Param("email") String email);

    boolean existsByTelefone(String telefone);

    Optional<Usuario> findByTelefone(String telefone);

    /**
     * Usuários com o mesmo telefone, qualquer que seja o formato gravado ("(11) 96…" = "1196…" =
     * "+55 11 96…"). {@code digitos} vem de {@link com.belezza.api.util.Telefones#digitos}.
     */
    @Query(value = "SELECT * FROM usuarios WHERE regexp_replace(telefone, '[^0-9]', '', 'g') IN (:digitos, CONCAT('55', :digitos)) " +
                   "ORDER BY ativo DESC, id", nativeQuery = true)
    List<Usuario> findByTelefoneDigitos(@Param("digitos") String digitos);

    /** Telefone já usado por outra conta (qualquer formato); {@code ignorarUsuarioId} é a própria conta. */
    default boolean telefoneEmUso(String telefone, Long ignorarUsuarioId) {
        if (telefone == null || telefone.isBlank()) {
            return false;
        }
        return findByTelefoneDigitos(com.belezza.api.util.Telefones.digitos(telefone)).stream()
                .anyMatch(u -> !u.getId().equals(ignorarUsuarioId));
    }

    Optional<Usuario> findByResetPasswordToken(String token);

    Optional<Usuario> findByEmailVerificationToken(String token);

    List<Usuario> findByRoleAndAtivoTrue(Role role);

    // --- Bloqueio da conta por senhas erradas (e-mail já normalizado: minúsculas, sem espaços) ---

    @Modifying
    @Query("UPDATE Usuario u SET u.tentativasLoginFalhas = u.tentativasLoginFalhas + 1 WHERE LOWER(u.email) = :email")
    int incrementarFalhasLogin(@Param("email") String email);

    @Modifying
    @Query("UPDATE Usuario u SET u.loginBloqueadoEm = :agora WHERE LOWER(u.email) = :email " +
           "AND u.tentativasLoginFalhas >= :max AND u.loginBloqueadoEm IS NULL")
    int bloquearLoginSeAtingiuLimite(@Param("email") String email, @Param("max") int max, @Param("agora") LocalDateTime agora);

    @Modifying
    @Query("UPDATE Usuario u SET u.tentativasLoginFalhas = 0, u.loginBloqueadoEm = NULL WHERE LOWER(u.email) = :email " +
           "AND (u.tentativasLoginFalhas > 0 OR u.loginBloqueadoEm IS NOT NULL)")
    int zerarFalhasLogin(@Param("email") String email);

    @Query("SELECT COUNT(u) > 0 FROM Usuario u WHERE LOWER(u.email) = :email AND u.loginBloqueadoEm IS NOT NULL")
    boolean isLoginBloqueado(@Param("email") String email);

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
           "OR EXISTS (SELECT r FROM RecepcionistaUnidade r WHERE r.usuario = u AND r.salon.id = :salonId) " +
           "OR EXISTS (SELECT s FROM Salon s WHERE s.admin = u AND s.id = :salonId)")
    Page<Usuario> findBySalonId(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT DISTINCT u FROM Usuario u " +
           "LEFT JOIN Profissional p ON p.usuario = u " +
           "WHERE (p.salon.id = :salonId OR u.salon.id = :salonId " +
           "OR EXISTS (SELECT r FROM RecepcionistaUnidade r WHERE r.usuario = u AND r.salon.id = :salonId) " +
           "OR EXISTS (SELECT s FROM Salon s WHERE s.admin = u AND s.id = :salonId)) AND u.role = :role")
    Page<Usuario> findBySalonIdAndRole(@Param("salonId") Long salonId, @Param("role") Role role, Pageable pageable);

    // Todos os usuários vinculados a um salão — equipe, admin dono e clientes do salão —, com busca
    // por nome/e-mail (search vazio = todos). Usado na listagem do ADMIN, restrita ao próprio salão.
    String VINCULADO_AO_SALAO =
           "(u.salon.id = :salonId " +
           "OR EXISTS (SELECT p FROM Profissional p WHERE p.usuario = u AND p.salon.id = :salonId) " +
           "OR EXISTS (SELECT r FROM RecepcionistaUnidade r WHERE r.usuario = u AND r.salon.id = :salonId) " +
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
