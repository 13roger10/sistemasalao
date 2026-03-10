package com.belezza.api.service;

import com.belezza.api.dto.servico.ServicoRequest;
import com.belezza.api.dto.servico.ServicoResponse;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Servico;
import com.belezza.api.entity.TipoServico;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ServicoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServicoService {

    private final ServicoRepository servicoRepository;
    private final SalonService salonService;

    @Transactional
    public ServicoResponse criar(ServicoRequest request, String emailAdmin) {
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);

        if (servicoRepository.existsByNomeAndSalonId(request.getNome().trim(), salon.getId())) {
            throw new DuplicateResourceException("Serviço", "nome", request.getNome());
        }

        Servico servico = Servico.builder()
                .nome(request.getNome().trim())
                .descricao(request.getDescricao())
                .preco(request.getPreco())
                .duracaoMinutos(request.getDuracaoMinutos())
                .tipo(request.getTipo())
                .salon(salon)
                .build();

        servico = servicoRepository.save(servico);
        log.info("Serviço criado: {} no salão {}", servico.getId(), salon.getId());

        return ServicoResponse.fromEntity(servico);
    }

    @Transactional(readOnly = true)
    public ServicoResponse buscarPorId(Long id) {
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço", id));
        return ServicoResponse.fromEntity(servico);
    }

    @Transactional(readOnly = true)
    public List<ServicoResponse> listarPorSalon(Long salonId) {
        return servicoRepository.findActiveBySalonIdOrdered(salonId).stream()
                .map(ServicoResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ServicoResponse> listarPorSalonETipo(Long salonId, TipoServico tipo) {
        return servicoRepository.findBySalonIdAndTipoAndAtivoTrue(salonId, tipo).stream()
                .map(ServicoResponse::fromEntity)
                .toList();
    }

    @Transactional
    public ServicoResponse atualizar(Long id, ServicoRequest request, String emailAdmin) {
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);

        Servico servico = servicoRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Serviço", id));

        servico.setNome(request.getNome().trim());
        if (request.getDescricao() != null) servico.setDescricao(request.getDescricao());
        servico.setPreco(request.getPreco());
        servico.setDuracaoMinutos(request.getDuracaoMinutos());
        servico.setTipo(request.getTipo());

        servico = servicoRepository.save(servico);
        log.info("Serviço atualizado: {}", servico.getId());

        return ServicoResponse.fromEntity(servico);
    }

    @Transactional
    public void desativar(Long id, String emailAdmin) {
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);

        Servico servico = servicoRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Serviço", id));

        servico.setAtivo(false);
        servicoRepository.save(servico);
        log.info("Serviço desativado: {}", id);
    }

    public Servico getServicoEntity(Long id) {
        return servicoRepository.findById(id)
                .filter(Servico::isAtivo)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço", id));
    }
}
