package com.belezza.api.service;

import com.belezza.api.dto.cliente.ClienteRequest;
import com.belezza.api.dto.cliente.ClienteResponse;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.FidelidadeClienteRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.belezza.api.security.annotation.Auditable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final FidelidadeClienteRepository fidelidadeRepository;
    private final SalonService salonService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public ClienteResponse criar(ClienteRequest request, String emailAdmin) {
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        Long salonId = request.getSalonId() != null ? request.getSalonId() : salon.getId();

        // Verificar se já existe um usuário com este email/telefone
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(request.getEmail())
                .orElseGet(() -> usuarioRepository.findByTelefone(request.getPhone())
                        .orElse(null));

        if (usuario == null) {
            // Criar novo usuário
            usuario = Usuario.builder()
                    .nome(request.getName())
                    .email(request.getEmail() != null ? request.getEmail() : request.getPhone() + "@cliente.belezza.ai")
                    .telefone(request.getPhone())
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(Role.CLIENTE)
                    .ativo(true)
                    .build();
            usuario = usuarioRepository.save(usuario);
            log.info("Usuário criado para cliente: {}", usuario.getId());
        }

        // Verificar se já é cliente deste salão
        if (clienteRepository.findByUsuarioIdAndSalonId(usuario.getId(), salonId).isPresent()) {
            throw new BusinessException("Cliente já cadastrado neste salão");
        }

        // Criar cliente
        Cliente cliente = Cliente.builder()
                .usuario(usuario)
                .salon(salonService.getSalonEntity(salonId))
                .whatsapp(request.getWhatsapp())
                .dataNascimento(request.getBirthDate())
                .observacoes(request.getNotes())
                .aceitaMarketing(request.getAcceptsMarketing() != null ? request.getAcceptsMarketing() : true)
                .aceitaWhatsApp(request.getAcceptsWhatsApp() != null ? request.getAcceptsWhatsApp() : true)
                .aceitaEmail(request.getAcceptsEmail() != null ? request.getAcceptsEmail() : true)
                .primeiraVisita(LocalDateTime.now())
                .build();

        cliente = clienteRepository.save(cliente);
        log.info("Cliente criado: {} no salão {}", cliente.getId(), salonId);

        return ClienteResponse.fromEntity(cliente);
    }

    @Transactional
    public ClienteResponse criarOuBuscar(Long salonId, String emailUsuario) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));

        Salon salon = salonService.getSalonEntity(salonId);

        return clienteRepository.findByUsuarioIdAndSalonId(usuario.getId(), salonId)
                .map(ClienteResponse::fromEntity)
                .orElseGet(() -> {
                    Cliente cliente = Cliente.builder()
                            .usuario(usuario)
                            .salon(salon)
                            .build();
                    cliente = clienteRepository.save(cliente);
                    log.info("Cliente criado: {} no salão {}", cliente.getId(), salonId);
                    return ClienteResponse.fromEntity(cliente);
                });
    }

    @Transactional(readOnly = true)
    public ClienteResponse buscarPorId(Long id) {
        Cliente cliente = clienteRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        var fidelidade = fidelidadeRepository.findByClienteIdAndAtivoTrue(id)
                .stream().findFirst().orElse(null);

        return ClienteResponse.fromEntity(cliente, fidelidade);
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> listarPorSalon(Long salonId) {
        return listarPorSalon(salonId, null, null, null);
    }

    @Transactional
    public List<ClienteResponse> listarPorSalon(Long salonId, String search, String status, String loyaltyLevel) {
        // Sincronizar usuários CLIENTE que ainda não estão vinculados a este salão
        sincronizarUsuariosCliente(salonId);

        List<Cliente> clientes = clienteRepository.findBySalonIdAndAtivoTrue(salonId);

        // Aplicar filtros
        return clientes.stream()
                .filter(c -> {
                    // Filtro de busca
                    if (search != null && !search.isEmpty()) {
                        String searchLower = search.toLowerCase();
                        return c.getUsuario().getNome().toLowerCase().contains(searchLower)
                                || (c.getUsuario().getTelefone() != null && c.getUsuario().getTelefone().contains(search))
                                || (c.getUsuario().getEmail() != null && c.getUsuario().getEmail().toLowerCase().contains(searchLower));
                    }
                    return true;
                })
                .filter(c -> {
                    // Filtro de status
                    if (status != null && !status.isEmpty()) {
                        if ("active".equals(status)) {
                            return c.isAtivo() && !c.isBloqueado();
                        } else if ("inactive".equals(status)) {
                            return !c.isAtivo() || c.isBloqueado();
                        }
                    }
                    return true;
                })
                .map(c -> {
                    var fidelidade = fidelidadeRepository.findByClienteIdAndAtivoTrue(c.getId())
                            .stream().findFirst().orElse(null);
                    return ClienteResponse.fromEntity(c, fidelidade);
                })
                .filter(response -> {
                    // Filtro de nível de fidelidade (aplicado após conversão)
                    if (loyaltyLevel != null && !loyaltyLevel.isEmpty()) {
                        return loyaltyLevel.equalsIgnoreCase(response.getLoyaltyLevel());
                    }
                    return true;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> listarBloqueados(Long salonId, int maxNoShows) {
        return clienteRepository.findByNoShowsExceeded(salonId, maxNoShows).stream()
                .map(ClienteResponse::fromEntity)
                .toList();
    }

    @Transactional
    public ClienteResponse atualizar(Long id, ClienteRequest request, String emailAdmin) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        if (!cliente.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Cliente não pertence a este salão");
        }

        // Atualizar dados do usuário se necessário
        Usuario usuario = cliente.getUsuario();
        if (request.getName() != null) {
            usuario.setNome(request.getName());
        }
        if (request.getPhone() != null) {
            usuario.setTelefone(request.getPhone());
        }
        if (request.getEmail() != null && !request.getEmail().endsWith("@cliente.belezza.ai")) {
            usuario.setEmail(request.getEmail());
        }
        usuarioRepository.save(usuario);

        // Atualizar dados do cliente
        if (request.getWhatsapp() != null) {
            cliente.setWhatsapp(request.getWhatsapp());
        }
        if (request.getBirthDate() != null) {
            cliente.setDataNascimento(request.getBirthDate());
        }
        if (request.getNotes() != null) {
            cliente.setObservacoes(request.getNotes());
        }
        if (request.getAcceptsMarketing() != null) {
            cliente.setAceitaMarketing(request.getAcceptsMarketing());
        }
        if (request.getAcceptsWhatsApp() != null) {
            cliente.setAceitaWhatsApp(request.getAcceptsWhatsApp());
        }
        if (request.getAcceptsEmail() != null) {
            cliente.setAceitaEmail(request.getAcceptsEmail());
        }

        cliente = clienteRepository.save(cliente);
        log.info("Cliente atualizado: {}", id);

        var fidelidade = fidelidadeRepository.findByClienteIdAndAtivoTrue(id)
                .stream().findFirst().orElse(null);

        return ClienteResponse.fromEntity(cliente, fidelidade);
    }

    @Transactional
    @Auditable(action = "DELETE", entityType = "Cliente", captureOldState = true)
    public void excluir(Long id, String emailAdmin) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        if (!cliente.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Cliente não pertence a este salão");
        }

        cliente.setAtivo(false);
        clienteRepository.save(cliente);
        log.info("Cliente excluído (soft delete): {}", id);
    }

    @Transactional
    public ClienteResponse atualizarObservacoes(Long id, String observacoes, String emailAdmin) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        if (!cliente.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Cliente não pertence a este salão");
        }

        cliente.setObservacoes(observacoes);
        cliente = clienteRepository.save(cliente);

        return ClienteResponse.fromEntity(cliente);
    }

    @Transactional
    @Auditable(action = "BLOCK", entityType = "Cliente", captureOldState = true, captureNewState = true)
    public void bloquear(Long id, String emailAdmin) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        if (!cliente.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Cliente não pertence a este salão");
        }

        cliente.setBloqueado(true);
        clienteRepository.save(cliente);
        log.info("Cliente bloqueado: {}", id);
    }

    @Transactional
    @Auditable(action = "UNBLOCK", entityType = "Cliente", captureOldState = true, captureNewState = true)
    public void desbloquear(Long id, String emailAdmin) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        if (!cliente.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Cliente não pertence a este salão");
        }

        cliente.setBloqueado(false);
        clienteRepository.save(cliente);
        log.info("Cliente desbloqueado: {}", id);
    }

    public Cliente getOrCreateCliente(Long salonId, String emailUsuario) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));

        Salon salon = salonService.getSalonEntity(salonId);

        return clienteRepository.findByUsuarioIdAndSalonId(usuario.getId(), salonId)
                .orElseGet(() -> {
                    Cliente cliente = Cliente.builder()
                            .usuario(usuario)
                            .salon(salon)
                            .build();
                    return clienteRepository.save(cliente);
                });
    }

    public Cliente getClienteEntity(Long id) {
        return clienteRepository.findById(id)
                .filter(Cliente::isAtivo)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
    }

    /**
     * Sincroniza usuários com role CLIENTE que ainda não estão vinculados ao salão.
     * Cria automaticamente a entrada na tabela de clientes para esses usuários.
     */
    @Transactional
    public void sincronizarUsuariosCliente(Long salonId) {
        List<Usuario> usuariosNaoVinculados = usuarioRepository.findClientesNaoVinculadosAoSalon(salonId);

        if (usuariosNaoVinculados.isEmpty()) {
            return;
        }

        Salon salon = salonService.getSalonEntity(salonId);

        for (Usuario usuario : usuariosNaoVinculados) {
            Cliente cliente = Cliente.builder()
                    .usuario(usuario)
                    .salon(salon)
                    .aceitaMarketing(true)
                    .aceitaWhatsApp(true)
                    .aceitaEmail(true)
                    .build();
            clienteRepository.save(cliente);
            log.info("Cliente sincronizado: usuário {} vinculado ao salão {}", usuario.getId(), salonId);
        }
    }
}
