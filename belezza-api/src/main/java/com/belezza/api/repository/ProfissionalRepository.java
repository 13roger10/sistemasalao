package com.belezza.api.repository;

import com.belezza.api.entity.CategoriaProfissional;
import com.belezza.api.entity.Profissional;
import com.belezza.api.security.TenantContext;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProfissionalRepository extends JpaRepository<Profissional, Long> {

    // Uma pessoa pode ter um cadastro de profissional em cada unidade do mesmo dono
    List<Profissional> findAllByUsuarioIdOrderByIdAsc(Long usuarioId);

    Optional<Profissional> findByUsuarioIdAndSalonId(Long usuarioId, Long salonId);

    /**
     * O cadastro de profissional do usuário na unidade da requisição (claim salonId do token).
     * Com unidade na requisição, só o cadastro daquela unidade (nunca o de outra — os dados de
     * cada unidade são separados). Sem unidade (login, tarefas agendadas), o primeiro ativo — ou o
     * primeiro. Quem chama "o profissional do usuário" passa a pegar o da unidade em uso.
     */
    default Optional<Profissional> findByUsuarioId(Long usuarioId) {
        Long unidade = TenantContext.getCurrentTenant();
        if (unidade != null) {
            return findByUsuarioIdAndSalonId(usuarioId, unidade);
        }
        List<Profissional> cadastros = findAllByUsuarioIdOrderByIdAsc(usuarioId);
        return cadastros.stream().filter(Profissional::isAtivo).findFirst()
                .or(() -> cadastros.stream().findFirst());
    }

    /** Como {@link #findByUsuarioId}, mas só se o cadastro estiver ativo. */
    default Optional<Profissional> findByUsuarioIdAndAtivoTrue(Long usuarioId) {
        return findByUsuarioId(usuarioId).filter(Profissional::isAtivo);
    }

    List<Profissional> findBySalonIdAndAtivoTrue(Long salonId);

    List<Profissional> findBySalonIdAndAtivoFalse(Long salonId);

    List<Profissional> findBySalonId(Long salonId);

    boolean existsByUsuarioId(Long usuarioId);

    @Query("SELECT p FROM Profissional p JOIN p.servicos s WHERE s.id = :servicoId AND p.ativo = true")
    List<Profissional> findActiveByServicoId(@Param("servicoId") Long servicoId);

    @Query("SELECT p FROM Profissional p WHERE p.salon.id = :salonId AND p.aceitaAgendamentoOnline = true AND p.ativo = true")
    List<Profissional> findOnlineAvailableBySalonId(@Param("salonId") Long salonId);

    @Query("SELECT COUNT(p) FROM Profissional p WHERE p.salon.id = :salonId AND p.ativo = true")
    long countActiveBySalonId(@Param("salonId") Long salonId);

    List<Profissional> findBySalonIdAndCategoriaAndAtivoTrue(Long salonId, CategoriaProfissional categoria);

    @Query("SELECT p FROM Profissional p WHERE p.salon.id = :salonId AND p.categoria = :categoria")
    List<Profissional> findBySalonIdAndCategoria(@Param("salonId") Long salonId, @Param("categoria") CategoriaProfissional categoria);

    @Query("SELECT DISTINCT p.categoria FROM Profissional p WHERE p.salon.id = :salonId AND p.ativo = true AND p.categoria IS NOT NULL")
    List<CategoriaProfissional> findDistinctCategoriasBySalonId(@Param("salonId") Long salonId);
}
