package com.belezza.api.service;

import com.belezza.api.dto.estoque.FornecedorRequest;
import com.belezza.api.dto.estoque.FornecedorResponse;
import com.belezza.api.entity.Fornecedor;
import com.belezza.api.entity.Salon;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.FornecedorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FornecedorService {

    private final FornecedorRepository fornecedorRepository;
    private final SalonService salonService;

    @Transactional
    @SuppressWarnings("null")
    public FornecedorResponse criar(FornecedorRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);

        if (request.getCnpj() != null && fornecedorRepository.existsByCnpjAndSalonId(request.getCnpj(), salon.getId())) {
            throw new DuplicateResourceException("Fornecedor", "CNPJ", request.getCnpj());
        }

        Fornecedor fornecedor = Fornecedor.builder()
                .nome(request.getNome().trim())
                .nomeFantasia(request.getNomeFantasia())
                .cnpj(request.getCnpj())
                .contatoNome(request.getContatoNome())
                .telefone(request.getTelefone())
                .email(request.getEmail())
                .website(request.getWebsite())
                .endereco(request.getEndereco())
                .cidade(request.getCidade())
                .estado(request.getEstado())
                .cep(request.getCep())
                .condicoesPagamento(request.getCondicoesPagamento())
                .observacoes(request.getObservacoes())
                .salon(salon)
                .build();

        fornecedor = fornecedorRepository.save(fornecedor);
        log.info("Fornecedor criado: {} no salão {}", fornecedor.getId(), salon.getId());

        return FornecedorResponse.fromEntity(fornecedor);
    }

    @Transactional(readOnly = true)
    public Page<FornecedorResponse> listar(String emailUsuario, Pageable pageable) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return fornecedorRepository.findBySalonIdAndAtivoTrue(salon.getId(), pageable)
                .map(FornecedorResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<FornecedorResponse> listarTodos(String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return fornecedorRepository.findBySalonIdAndAtivoTrue(salon.getId()).stream()
                .map(FornecedorResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public FornecedorResponse buscarPorId(Long id, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Fornecedor fornecedor = fornecedorRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", id));
        return FornecedorResponse.fromEntity(fornecedor);
    }

    @Transactional
    public FornecedorResponse atualizar(Long id, FornecedorRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Fornecedor fornecedor = fornecedorRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", id));

        fornecedor.setNome(request.getNome().trim());
        fornecedor.setNomeFantasia(request.getNomeFantasia());
        fornecedor.setCnpj(request.getCnpj());
        fornecedor.setContatoNome(request.getContatoNome());
        fornecedor.setTelefone(request.getTelefone());
        fornecedor.setEmail(request.getEmail());
        fornecedor.setWebsite(request.getWebsite());
        fornecedor.setEndereco(request.getEndereco());
        fornecedor.setCidade(request.getCidade());
        fornecedor.setEstado(request.getEstado());
        fornecedor.setCep(request.getCep());
        fornecedor.setCondicoesPagamento(request.getCondicoesPagamento());
        fornecedor.setObservacoes(request.getObservacoes());

        fornecedor = fornecedorRepository.save(fornecedor);
        log.info("Fornecedor atualizado: {}", fornecedor.getId());

        return FornecedorResponse.fromEntity(fornecedor);
    }

    @Transactional
    public void desativar(Long id, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Fornecedor fornecedor = fornecedorRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", id));
        fornecedor.setAtivo(false);
        fornecedorRepository.save(fornecedor);
        log.info("Fornecedor desativado: {}", id);
    }
}
