package com.belezza.api.service;

import com.belezza.api.dto.equipe.MembroStudioResponse;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.MembroStudioRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Manages team membership and role-based access control for the Social Studio module.
 *
 * <p>Permission hierarchy: PROPRIETARIO > GESTOR > EDITOR > VISUALIZADOR.
 * System-level {@link Role#ADMIN} always bypasses studio-level checks.
 *
 * <p>Action matrix:
 * <pre>
 *   Action                  | PROP | GEST | EDIT | VIEW
 *   View posts/analytics    |  ✓   |  ✓   |  ✓   |  ✓
 *   Create / edit posts     |  ✓   |  ✓   |  ✓   |  ✗
 *   Schedule posts          |  ✓   |  ✓   |  ✓   |  ✗
 *   Publish immediately     |  ✓   |  ✓   |  ✗   |  ✗
 *   Connect social accounts |  ✓   |  ✗   |  ✗   |  ✗
 *   Manage team             |  ✓   |  ✗   |  ✗   |  ✗
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EquipeStudioService {

    private final MembroStudioRepository membroStudioRepository;
    private final SalonRepository salonRepository;
    private final UsuarioRepository usuarioRepository;

    // ─── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MembroStudioResponse> listarMembros(Long salonId, String requesterEmail) {
        // SEC-006: a listagem da equipe vazava nomes/e-mails/funções de qualquer salão
        // para qualquer usuário autenticado (incl. CLIENTE). Agora o solicitante precisa
        // ser o ADMIN dono deste salão ou um membro da própria equipe.
        assertPodeVerEquipe(salonId, requesterEmail);
        return membroStudioRepository.findBySalonId(salonId)
                .stream()
                .map(MembroStudioResponse::fromEntity)
                .toList();
    }

    /**
     * SEC-006: valida que o solicitante pode ver a equipe deste salão.
     * ADMIN do sistema só acessa o próprio estabelecimento (isolamento de tenant);
     * demais usuários precisam ser membros da equipe do salão.
     */
    @Transactional(readOnly = true)
    public void assertPodeVerEquipe(Long salonId, String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email).orElse(null);
        if (usuario == null) {
            throw new AccessDeniedException("Autenticação necessária");
        }
        if (usuario.getRole() == Role.ADMIN) {
            Salon salon = getSalon(salonId);
            if (salon.getAdmin() == null || !salon.getAdmin().getId().equals(usuario.getId())) {
                throw new AccessDeniedException("Acesso negado: estabelecimento de outro administrador");
            }
            return;
        }
        if (getFuncao(salonId, email) == null) {
            throw new AccessDeniedException("Acesso negado: você não pertence à equipe deste estabelecimento");
        }
    }

    @Transactional(readOnly = true)
    public FuncaoStudio getFuncao(Long salonId, String email) {
        return membroStudioRepository.findBySalonIdAndUsuarioEmail(salonId, email)
                .map(MembroStudio::getFuncao)
                .orElse(null);
    }

    // ─── Mutate ───────────────────────────────────────────────────────────────

    @SuppressWarnings("null")
    public MembroStudioResponse adicionarMembro(Long salonId, String email, FuncaoStudio funcao,
                                                String requesterEmail) {
        Salon salon = getSalon(salonId);
        requireProprietario(salonId, requesterEmail);

        if (funcao == FuncaoStudio.PROPRIETARIO) {
            throw new BusinessException("Não é possível adicionar outro Proprietário. " +
                    "Use a função Gestor para delegar acesso amplo.");
        }

        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        if (membroStudioRepository.existsBySalonIdAndUsuarioId(salonId, usuario.getId())) {
            throw new BusinessException("Usuário já é membro desta equipe.");
        }

        MembroStudio membro = MembroStudio.builder()
                .salon(salon)
                .usuario(usuario)
                .funcao(funcao)
                .build();

        membro = membroStudioRepository.save(membro);
        log.info("Membro adicionado ao studio: usuário={} salon={} funcao={}", email, salonId, funcao);
        return MembroStudioResponse.fromEntity(membro);
    }

    @SuppressWarnings("null")
    public MembroStudioResponse alterarFuncao(Long salonId, Long membroId, FuncaoStudio novaFuncao,
                                              String requesterEmail) {
        requireProprietario(salonId, requesterEmail);

        if (novaFuncao == FuncaoStudio.PROPRIETARIO) {
            throw new BusinessException("Não é possível promover um membro a Proprietário.");
        }

        MembroStudio membro = membroStudioRepository.findById(membroId)
                .orElseThrow(() -> new ResourceNotFoundException("Membro", membroId));

        if (!membro.getSalon().getId().equals(salonId)) {
            throw new ResourceNotFoundException("Membro", membroId);
        }

        membroStudioRepository.updateFuncao(membroId, novaFuncao);
        membro.setFuncao(novaFuncao);
        log.info("Função alterada: membro={} novaFuncao={} salon={}", membroId, novaFuncao, salonId);
        return MembroStudioResponse.fromEntity(membro);
    }

    @SuppressWarnings("null")
    public void removerMembro(Long salonId, Long membroId, String requesterEmail) {
        requireProprietario(salonId, requesterEmail);

        MembroStudio membro = membroStudioRepository.findById(membroId)
                .orElseThrow(() -> new ResourceNotFoundException("Membro", membroId));

        if (!membro.getSalon().getId().equals(salonId)) {
            throw new ResourceNotFoundException("Membro", membroId);
        }

        membroStudioRepository.delete(membro);
        log.info("Membro removido do studio: membro={} salon={}", membroId, salonId);
    }

    // ─── Permission check ─────────────────────────────────────────────────────

    /**
     * Verifies that the user identified by {@code email} has at least {@code funcaoMinima}
     * in the given salon.
     *
     * <p>System-level ADMIN users always pass this check.
     * <p>PROPRIETARIO members always pass this check (highest studio role).
     *
     * @throws BusinessException with HTTP 403 semantics if access is denied
     */
    @Transactional(readOnly = true)
    public void verificarAcesso(Long salonId, String email, FuncaoStudio funcaoMinima) {
        // System ADMINs bypass all studio checks
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email).orElse(null);
        if (usuario != null && usuario.getRole() == Role.ADMIN) {
            return;
        }

        FuncaoStudio funcao = getFuncao(salonId, email);
        if (funcao == null || !funcao.temAcesso(funcaoMinima)) {
            throw new BusinessException(
                    String.format("Acesso negado. Função mínima necessária: %s.", funcaoMinima.name()));
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private void requireProprietario(Long salonId, String requesterEmail) {
        // System ADMINs are treated as PROPRIETARIO
        Usuario requester = usuarioRepository.findByEmailAndAtivoTrue(requesterEmail).orElse(null);
        if (requester != null && requester.getRole() == Role.ADMIN) {
            return;
        }

        FuncaoStudio funcao = getFuncao(salonId, requesterEmail);
        if (funcao != FuncaoStudio.PROPRIETARIO) {
            throw new BusinessException("Apenas o Proprietário pode gerenciar a equipe.");
        }
    }

    @SuppressWarnings("null")
    private Salon getSalon(Long salonId) {
        return salonRepository.findById(salonId)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", salonId));
    }
}
