package com.belezza.api.service;

import com.belezza.api.dto.profissional.ProfissionalRequest;
import com.belezza.api.dto.profissional.ProfissionalResponse;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Servico;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.ServicoRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfissionalService {

    private final ProfissionalRepository profissionalRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicoRepository servicoRepository;
    private final SalonService salonService;

    @Transactional
    public ProfissionalResponse criar(ProfissionalRequest request, String emailAdmin) {
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);

        Usuario usuario = usuarioRepository.findById(request.getUsuarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", request.getUsuarioId()));

        if (profissionalRepository.existsByUsuarioId(usuario.getId())) {
            throw new DuplicateResourceException("Profissional", "usuário", usuario.getEmail());
        }

        Profissional profissional = Profissional.builder()
                .usuario(usuario)
                .salon(salon)
                .especialidade(request.getEspecialidade())
                .bio(request.getBio())
                .aceitaAgendamentoOnline(request.getAceitaAgendamentoOnline() != null ? request.getAceitaAgendamentoOnline() : true)
                .servicos(new ArrayList<>())
                .build();

        if (request.getServicoIds() != null && !request.getServicoIds().isEmpty()) {
            List<Servico> servicos = servicoRepository.findAllById(request.getServicoIds());
            for (Servico s : servicos) {
                if (!s.getSalon().getId().equals(salon.getId())) {
                    throw new BusinessException("Serviço " + s.getId() + " não pertence a este salão");
                }
            }
            profissional.setServicos(servicos);
        }

        profissional = profissionalRepository.save(profissional);
        log.info("Profissional criado: {} no salão {}", profissional.getId(), salon.getId());

        return ProfissionalResponse.fromEntity(profissional);
    }

    @Transactional(readOnly = true)
    public ProfissionalResponse buscarPorId(Long id) {
        Profissional profissional = profissionalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional", id));
        return ProfissionalResponse.fromEntity(profissional);
    }

    @Transactional(readOnly = true)
    public List<ProfissionalResponse> listarPorSalon(Long salonId) {
        return profissionalRepository.findBySalonIdAndAtivoTrue(salonId).stream()
                .map(ProfissionalResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfissionalResponse> listarPorServico(Long servicoId) {
        return profissionalRepository.findActiveByServicoId(servicoId).stream()
                .map(ProfissionalResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfissionalResponse> listarDisponiveisOnline(Long salonId) {
        return profissionalRepository.findOnlineAvailableBySalonId(salonId).stream()
                .map(ProfissionalResponse::fromEntity)
                .toList();
    }

    @Transactional
    public ProfissionalResponse atualizar(Long id, ProfissionalRequest request, String emailAdmin) {
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);

        Profissional profissional = profissionalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional", id));

        if (!profissional.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Profissional não pertence a este salão");
        }

        if (request.getEspecialidade() != null) profissional.setEspecialidade(request.getEspecialidade());
        if (request.getBio() != null) profissional.setBio(request.getBio());
        if (request.getAceitaAgendamentoOnline() != null) profissional.setAceitaAgendamentoOnline(request.getAceitaAgendamentoOnline());

        if (request.getServicoIds() != null) {
            List<Servico> servicos = servicoRepository.findAllById(request.getServicoIds());
            for (Servico s : servicos) {
                if (!s.getSalon().getId().equals(salon.getId())) {
                    throw new BusinessException("Serviço " + s.getId() + " não pertence a este salão");
                }
            }
            profissional.setServicos(servicos);
        }

        profissional = profissionalRepository.save(profissional);
        log.info("Profissional atualizado: {}", profissional.getId());

        return ProfissionalResponse.fromEntity(profissional);
    }

    @Transactional
    public void desativar(Long id, String emailAdmin) {
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);

        Profissional profissional = profissionalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional", id));

        if (!profissional.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Profissional não pertence a este salão");
        }

        profissional.setAtivo(false);
        profissionalRepository.save(profissional);
        log.info("Profissional desativado: {}", id);
    }

    public Profissional getProfissionalEntity(Long id) {
        return profissionalRepository.findById(id)
                .filter(Profissional::isAtivo)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional", id));
    }

    public Profissional getProfissionalByUsuarioEmail(String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));
        return profissionalRepository.findByUsuarioIdAndAtivoTrue(usuario.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Profissional", "usuário", email));
    }
}
