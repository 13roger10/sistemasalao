package com.belezza.api.service;

import com.belezza.api.entity.HorarioTrabalho;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.RecepcionistaUnidade;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.HorarioTrabalhoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.RecepcionistaUnidadeRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.TenantContext;
import com.belezza.api.security.annotation.Auditable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Profissionais e recepcionistas em várias unidades do mesmo dono — o mesmo padrão do cliente.
 * Profissional: um cadastro de profissional por unidade (serviços, horários e comissões de cada
 * uma). Recepcionista: lista de unidades em que pode trabalhar; a unidade em uso é Usuario.salon.
 * Quem está em mais de uma unidade troca de unidade pelo topo (AuthService.trocarUnidade).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EquipeUnidadeService {

    private final UsuarioRepository usuarioRepository;
    private final ProfissionalRepository profissionalRepository;
    private final RecepcionistaUnidadeRepository recepcionistaUnidadeRepository;
    private final HorarioTrabalhoRepository horarioTrabalhoRepository;
    private final SalonService salonService;

    /** Unidades em que o profissional/recepcionista logado pode trabalhar (atual = a do token). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> minhasUnidades(String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));
        Long atual = TenantContext.getCurrentTenant();
        return unidadesVinculadas(usuario).stream()
                .filter(Salon::isAtivo)
                .map(s -> Map.<String, Object>of("id", s.getId(), "nome", s.getNome(), "atual", s.getId().equals(atual)))
                .toList();
    }

    /**
     * Unidades do estabelecimento (mesmo dono da unidade do admin) e se o membro da equipe está
     * vinculado a cada uma. O membro precisa ser da unidade em que o admin está.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> unidadesDoMembro(Long usuarioId, Long salonAtualId) {
        Usuario membro = membroDaUnidade(usuarioId, salonAtualId);
        Set<Long> vinculadas = new HashSet<>();
        unidadesVinculadas(membro).forEach(s -> vinculadas.add(s.getId()));
        return salonService.unidadesDoMesmoDono(salonAtualId).stream()
                .map(s -> Map.<String, Object>of(
                        "id", s.getId(),
                        "nome", s.getNome(),
                        "vinculado", vinculadas.contains(s.getId()),
                        "atual", s.getId().equals(salonAtualId)))
                .toList();
    }

    /**
     * Define as unidades do estabelecimento a que o profissional/recepcionista fica vinculado. A
     * unidade em que o admin está continua sempre (para tirá-lo dela, desative o usuário).
     * Profissional: vincular cria o cadastro na unidade (especialidade, bio, comissão e horários de
     * trabalho; os serviços são de cada unidade) ou reativa um antigo; desvincular o desativa.
     */
    @Transactional
    @Auditable(action = "UPDATE", entityType = "Usuario", details = "vínculo da equipe com unidades")
    public List<Map<String, Object>> atualizarUnidades(Long usuarioId, Collection<Long> salonIds, Long salonAtualId) {
        Usuario membro = membroDaUnidade(usuarioId, salonAtualId);
        Map<Long, Salon> permitidas = new LinkedHashMap<>();
        salonService.unidadesDoMesmoDono(salonAtualId).forEach(s -> permitidas.put(s.getId(), s));
        Set<Long> desejadas = new HashSet<>(salonIds != null ? salonIds : List.of());
        if (!permitidas.keySet().containsAll(desejadas)) {
            throw new AccessDeniedException("Só é possível vincular às unidades deste estabelecimento");
        }
        desejadas.add(salonAtualId);

        if (membro.getRole() == Role.PROFISSIONAL) {
            atualizarProfissional(membro, permitidas, desejadas, salonAtualId);
        } else {
            atualizarRecepcionista(membro, permitidas, desejadas, salonAtualId);
        }
        return unidadesDoMembro(usuarioId, salonAtualId);
    }

    private void atualizarProfissional(Usuario membro, Map<Long, Salon> permitidas, Set<Long> desejadas, Long salonAtualId) {
        Profissional base = profissionalRepository.findByUsuarioIdAndSalonId(membro.getId(), salonAtualId)
                .orElseThrow(() -> new BusinessException("Este usuário não tem cadastro de profissional nesta unidade"));
        for (Salon unidade : permitidas.values()) {
            if (unidade.getId().equals(salonAtualId)) {
                continue;
            }
            Profissional existente = profissionalRepository.findByUsuarioIdAndSalonId(membro.getId(), unidade.getId()).orElse(null);
            if (desejadas.contains(unidade.getId())) {
                if (existente == null) {
                    Profissional novo = profissionalRepository.save(Profissional.builder()
                            .usuario(membro)
                            .salon(unidade)
                            .categoria(base.getCategoria())
                            .nivel(base.getNivel())
                            .especialidade(base.getEspecialidade())
                            .especializacoes(base.getEspecializacoes())
                            .bio(base.getBio())
                            .fotoUrl(base.getFotoUrl())
                            .aceitaAgendamentoOnline(base.isAceitaAgendamentoOnline())
                            .tipoComissao(base.getTipoComissao())
                            .valorComissao(base.getValorComissao())
                            .build());
                    for (HorarioTrabalho h : horarioTrabalhoRepository.findByProfissionalId(base.getId())) {
                        horarioTrabalhoRepository.save(HorarioTrabalho.builder()
                                .profissional(novo)
                                .diaSemana(h.getDiaSemana())
                                .horaInicio(h.getHoraInicio())
                                .horaFim(h.getHoraFim())
                                .intervaloInicio(h.getIntervaloInicio())
                                .intervaloFim(h.getIntervaloFim())
                                .ativo(h.isAtivo())
                                .build());
                    }
                    log.info("Profissional (usuário {}) vinculado à unidade {}", membro.getId(), unidade.getId());
                } else if (!existente.isAtivo()) {
                    existente.setAtivo(true);
                    profissionalRepository.save(existente);
                    log.info("Profissional (usuário {}): vínculo com a unidade {} reativado", membro.getId(), unidade.getId());
                }
            } else if (existente != null && existente.isAtivo()) {
                existente.setAtivo(false);
                profissionalRepository.save(existente);
                log.info("Profissional (usuário {}) desvinculado da unidade {}", membro.getId(), unidade.getId());
            }
        }
    }

    private void atualizarRecepcionista(Usuario membro, Map<Long, Salon> permitidas, Set<Long> desejadas, Long salonAtualId) {
        Map<Long, RecepcionistaUnidade> vinculos = new LinkedHashMap<>();
        recepcionistaUnidadeRepository.findByUsuarioId(membro.getId()).forEach(v -> vinculos.put(v.getSalon().getId(), v));
        for (Salon unidade : permitidas.values()) {
            boolean quer = desejadas.contains(unidade.getId());
            RecepcionistaUnidade existente = vinculos.get(unidade.getId());
            if (quer && existente == null) {
                recepcionistaUnidadeRepository.save(RecepcionistaUnidade.builder().usuario(membro).salon(unidade).build());
            } else if (!quer && existente != null) {
                recepcionistaUnidadeRepository.delete(existente);
            }
        }
        // A unidade em uso dela saiu da lista: passa a ser a unidade do admin
        if (membro.getSalon() == null || !desejadas.contains(membro.getSalon().getId())) {
            membro.setSalon(permitidas.get(salonAtualId));
            usuarioRepository.save(membro);
        }
        log.info("Recepcionista (usuário {}) vinculada às unidades {}", membro.getId(), desejadas);
    }

    /** Unidades a que a pessoa está vinculada (cadastros ativos do profissional; vínculos da recepção). */
    private List<Salon> unidadesVinculadas(Usuario usuario) {
        if (usuario.getRole() == Role.PROFISSIONAL) {
            return profissionalRepository.findAllByUsuarioIdOrderByIdAsc(usuario.getId()).stream()
                    .filter(Profissional::isAtivo)
                    .map(Profissional::getSalon)
                    .toList();
        }
        if (usuario.getRole() == Role.RECEPCIONISTA) {
            Map<Long, Salon> unidades = new LinkedHashMap<>();
            if (usuario.getSalon() != null) {
                unidades.put(usuario.getSalon().getId(), usuario.getSalon());
            }
            recepcionistaUnidadeRepository.findByUsuarioId(usuario.getId())
                    .forEach(v -> unidades.putIfAbsent(v.getSalon().getId(), v.getSalon()));
            return List.copyOf(unidades.values());
        }
        return List.of();
    }

    /** O usuário precisa ser profissional ou recepcionista vinculado à unidade em que o admin está. */
    private Usuario membroDaUnidade(Long usuarioId, Long salonAtualId) {
        Usuario membro = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", usuarioId));
        if (membro.getRole() != Role.PROFISSIONAL && membro.getRole() != Role.RECEPCIONISTA) {
            throw new BusinessException("Só profissionais e recepcionistas são vinculados a unidades por aqui");
        }
        boolean daUnidade = salonAtualId != null && unidadesVinculadas(membro).stream()
                .anyMatch(s -> s.getId().equals(salonAtualId));
        if (!daUnidade) {
            throw new AccessDeniedException("Acesso negado: usuário pertence a outro estabelecimento");
        }
        return membro;
    }
}
