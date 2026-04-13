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
    public List<MembroStudioResponse> listarMembros(Long salonId) {
        return membroStudioRepository.findBySalonId(salonId)
                .stream()
                .map(MembroStudioResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public FuncaoStudio getFuncao(Long salonId, String email) {
        return membroStudioRepository.findBySalonIdAndUsuarioEmail(salonId, email)
                .map(MembroStudio::getFuncao)
                .orElse(null);
    }

    // ─── Mutate ───────────────────────────────────────────────────────────────

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

    private Salon getSalon(Long salonId) {
        return salonRepository.findById(salonId)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", salonId));
    }
}
