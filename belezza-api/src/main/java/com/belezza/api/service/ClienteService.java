package com.belezza.api.service;

import com.belezza.api.dto.cliente.ClienteHistoryResponse;
import com.belezza.api.dto.cliente.ClienteRequest;
import com.belezza.api.dto.cliente.ClienteResponse;
import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.AgendamentoServico;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Servico;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.entity.StatusPagamento;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.FidelidadeClienteRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.belezza.api.security.annotation.Auditable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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
    private final AgendamentoRepository agendamentoRepository;
    private final PagamentoRepository pagamentoRepository;

    @Transactional
    @SuppressWarnings("null")
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

    /** Creates a client directly with a known salonId — used by the receptionist role. */
    @Transactional
    @SuppressWarnings("null")
    public ClienteResponse criarComSalonId(ClienteRequest request, Long salonId) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(request.getEmail())
                .orElseGet(() -> usuarioRepository.findByTelefone(request.getPhone())
                        .orElse(null));

        if (usuario == null) {
            usuario = Usuario.builder()
                    .nome(request.getName())
                    .email(request.getEmail() != null ? request.getEmail() : request.getPhone() + "@cliente.belezza.ai")
                    .telefone(request.getPhone())
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(Role.CLIENTE)
                    .ativo(true)
                    .build();
            usuario = usuarioRepository.save(usuario);
        }

        if (clienteRepository.findByUsuarioIdAndSalonId(usuario.getId(), salonId).isPresent()) {
            throw new BusinessException("Cliente já cadastrado neste salão");
        }

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
        log.info("Cliente criado pela recepção: {} no salão {}", cliente.getId(), salonId);
        return ClienteResponse.fromEntity(cliente);
    }

    @Transactional
    @SuppressWarnings("null")
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
        return buscarPorId(id, false);
    }

    @Transactional(readOnly = true)
    public ClienteResponse buscarPorId(Long id, boolean restrictSensitiveData) {
        Cliente cliente = clienteRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        var fidelidade = fidelidadeRepository.findByClienteIdAndAtivoTrue(id)
                .stream().findFirst().orElse(null);

        return restrictSensitiveData
                ? ClienteResponse.fromEntityForProfessional(cliente, fidelidade)
                : ClienteResponse.fromEntity(cliente, fidelidade);
    }

    /**
     * Monta o histórico de atendimentos e gastos do cliente a partir dos
     * agendamentos e pagamentos reais associados a ele.
     */
    @Transactional(readOnly = true)
    public ClienteHistoryResponse buscarHistorico(Long clienteId) {
        if (!clienteRepository.existsById(clienteId)) {
            throw new ResourceNotFoundException("Cliente", clienteId);
        }

        List<Agendamento> agendamentos = agendamentoRepository
                .findByClienteId(clienteId, PageRequest.of(0, 200, Sort.by(Sort.Direction.DESC, "dataHora")))
                .getContent();

        List<ClienteHistoryResponse.AppointmentHistoryDTO> appointments = new ArrayList<>();
        Map<Long, String> servicoNomes = new java.util.LinkedHashMap<>();
        Map<Long, Long> servicoContagem = new java.util.LinkedHashMap<>();
        Map<Long, String> profissionalNomes = new java.util.LinkedHashMap<>();
        Map<Long, Long> profissionalContagem = new java.util.LinkedHashMap<>();
        BigDecimal totalSpent = BigDecimal.ZERO;

        for (Agendamento agendamento : agendamentos) {
            List<String> nomesServicos = agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()
                    ? agendamento.getServicos().stream()
                        .map(AgendamentoServico::getServico)
                        .filter(java.util.Objects::nonNull)
                        .map(Servico::getNome)
                        .collect(Collectors.toList())
                    : agendamento.getServico() != null
                        ? List.of(agendamento.getServico().getNome())
                        : List.of();

            String profissionalNome = agendamento.getProfissional() != null
                    && agendamento.getProfissional().getUsuario() != null
                    ? agendamento.getProfissional().getUsuario().getNome()
                    : "—";

            // Valor de um pagamento realmente aprovado para este agendamento (se houver)
            BigDecimal valorPagoAprovado = pagamentoRepository.findByAgendamentoId(agendamento.getId())
                    .filter(p -> p.getStatus() == StatusPagamento.APROVADO)
                    .map(Pagamento::getValor)
                    .orElse(null);

            // "Total gasto" só soma o que foi de fato pago; agendamentos sem pagamento aprovado não contam
            if (valorPagoAprovado != null) {
                totalSpent = totalSpent.add(valorPagoAprovado);
            }

            // Na listagem, mostra o valor pago ou, na falta dele, o valor cobrado (previsto) do agendamento
            BigDecimal valorExibido = valorPagoAprovado != null
                    ? valorPagoAprovado
                    : agendamento.getValorCobrado() != null ? agendamento.getValorCobrado() : BigDecimal.ZERO;

            appointments.add(ClienteHistoryResponse.AppointmentHistoryDTO.builder()
                    .id(agendamento.getId())
                    .date(agendamento.getDataHora())
                    .services(nomesServicos)
                    .professional(profissionalNome)
                    .total(valorExibido)
                    .status(mapStatusParaFrontend(agendamento.getStatus()))
                    .build());

            if (agendamento.getServico() != null) {
                Long servicoId = agendamento.getServico().getId();
                servicoNomes.putIfAbsent(servicoId, agendamento.getServico().getNome());
                servicoContagem.merge(servicoId, 1L, Long::sum);
            }
            if (agendamento.getProfissional() != null) {
                Long profissionalId = agendamento.getProfissional().getId();
                profissionalNomes.putIfAbsent(profissionalId, profissionalNome);
                profissionalContagem.merge(profissionalId, 1L, Long::sum);
            }
        }

        List<ClienteHistoryResponse.FavoriteServiceDTO> favoriteServices = servicoContagem.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .map(entry -> ClienteHistoryResponse.FavoriteServiceDTO.builder()
                        .serviceId(entry.getKey())
                        .serviceName(servicoNomes.get(entry.getKey()))
                        .count(entry.getValue())
                        .build())
                .collect(Collectors.toList());

        ClienteHistoryResponse.FavoriteProfessionalDTO favoriteProfessional = profissionalContagem.entrySet().stream()
                .max(Comparator.comparingLong(Map.Entry::getValue))
                .map(entry -> ClienteHistoryResponse.FavoriteProfessionalDTO.builder()
                        .professionalId(entry.getKey())
                        .professionalName(profissionalNomes.get(entry.getKey()))
                        .count(entry.getValue())
                        .build())
                .orElse(null);

        return ClienteHistoryResponse.builder()
                .appointments(appointments)
                .totalAppointments(appointments.size())
                .totalSpent(totalSpent)
                .favoriteServices(favoriteServices)
                .favoriteProfessional(favoriteProfessional)
                .build();
    }

    /**
     * Recalcula totalGasto, ticketMedio, primeiraVisita e ultimaVisita de todos os
     * clientes ativos do salão a partir dos pagamentos aprovados reais.
     * Útil para reconciliar estatísticas de pagamentos registrados antes de esse
     * cálculo automático existir, ou após qualquer divergência de dados.
     */
    @Transactional
    public int recalcularEstatisticas(Long salonId) {
        List<Cliente> clientes = clienteRepository.findBySalonIdAndAtivoTrue(salonId);

        for (Cliente cliente : clientes) {
            List<Pagamento> pagamentos = pagamentoRepository.findByAgendamentoClienteId(cliente.getId()).stream()
                    .filter(p -> p.getStatus() == StatusPagamento.APROVADO)
                    .toList();

            BigDecimal totalGasto = pagamentos.stream()
                    .map(Pagamento::getValor)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            cliente.setTotalGasto(totalGasto);
            cliente.setTicketMedio(cliente.getTotalAgendamentos() > 0
                    ? totalGasto.divide(BigDecimal.valueOf(cliente.getTotalAgendamentos()), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO);

            pagamentos.stream().map(Pagamento::getCriadoEm).min(Comparator.naturalOrder())
                    .ifPresent(cliente::setPrimeiraVisita);
            pagamentos.stream().map(Pagamento::getCriadoEm).max(Comparator.naturalOrder())
                    .ifPresent(cliente::setUltimaVisita);

            clienteRepository.save(cliente);
        }

        log.info("Estatísticas recalculadas para {} clientes do salon {}", clientes.size(), salonId);
        return clientes.size();
    }

    /**
     * Converte o status do agendamento para as strings em inglês que o frontend já usa
     * (AppointmentStatus), para que o histórico do cliente exiba os badges corretamente.
     */
    private String mapStatusParaFrontend(StatusAgendamento status) {
        return switch (status) {
            case PENDENTE -> "pending";
            case CONFIRMADO -> "confirmed";
            case EM_ANDAMENTO -> "in_progress";
            case CONCLUIDO -> "completed";
            case CANCELADO -> "canceled";
            case NO_SHOW -> "no_show";
        };
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> listarPorSalon(Long salonId) {
        return listarPorSalon(salonId, null, null, null);
    }

    @Transactional
    public List<ClienteResponse> listarPorSalon(Long salonId, String search, String status, String loyaltyLevel) {
        return listarPorSalon(salonId, search, status, loyaltyLevel, false);
    }

    @Transactional
    public List<ClienteResponse> listarPorSalon(Long salonId, String search, String status, String loyaltyLevel, boolean restrictSensitiveData) {
        // Sincronizar usuários CLIENTE que ainda não estão vinculados a este salão
        sincronizarUsuariosCliente(salonId);

        List<Cliente> clientes = clienteRepository.findBySalonIdAndAtivoTrue(salonId);

        // Aplicar filtros
        return clientes.stream()
                .filter(c -> {
                    // Filtro de busca — usa nome mesmo para PROFISSIONAL
                    if (search != null && !search.isEmpty()) {
                        String searchLower = search.toLowerCase();
                        return c.getUsuario().getNome().toLowerCase().contains(searchLower)
                                || (!restrictSensitiveData && c.getUsuario().getTelefone() != null && c.getUsuario().getTelefone().contains(search))
                                || (!restrictSensitiveData && c.getUsuario().getEmail() != null && c.getUsuario().getEmail().toLowerCase().contains(searchLower));
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
                    return restrictSensitiveData
                            ? ClienteResponse.fromEntityForProfessional(c, fidelidade)
                            : ClienteResponse.fromEntity(c, fidelidade);
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
    @SuppressWarnings("null")
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
    @SuppressWarnings("null")
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
    @SuppressWarnings("null")
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
    @SuppressWarnings("null")
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
    @SuppressWarnings("null")
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

    @SuppressWarnings("null")
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

    @SuppressWarnings("null")
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
    @SuppressWarnings("null")
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
