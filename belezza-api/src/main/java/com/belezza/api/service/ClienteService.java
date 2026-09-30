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
import com.belezza.api.exception.DuplicateResourceException;
import org.springframework.security.access.AccessDeniedException;
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
import com.belezza.api.util.Telefones;
import com.belezza.api.util.Textos;

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
        Usuario usuario = contaExistente(request);

        if (usuario == null) {
            // Criar novo usuário
            usuario = Usuario.builder()
                    .nome(request.getName())
                    .email(request.getEmail() != null ? request.getEmail() : emailProvisorio(request.getPhone()))
                    .telefone(request.getPhone().trim())
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(Role.CLIENTE)
                    .ativo(true)
                    .build();
            usuario = usuarioRepository.save(usuario);
            log.info("Usuário criado para cliente: {}", usuario.getId());
        }

        // Verificar se já é cliente deste salão
        if (clienteRepository.findByUsuarioIdAndSalonId(usuario.getId(), salonId).isPresent()) {
            throw clienteDuplicado(usuario, request);
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
        Usuario usuario = contaExistente(request);

        if (usuario == null) {
            usuario = Usuario.builder()
                    .nome(request.getName())
                    .email(request.getEmail() != null ? request.getEmail() : emailProvisorio(request.getPhone()))
                    .telefone(request.getPhone().trim())
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(Role.CLIENTE)
                    .ativo(true)
                    .build();
            usuario = usuarioRepository.save(usuario);
        }

        if (clienteRepository.findByUsuarioIdAndSalonId(usuario.getId(), salonId).isPresent()) {
            throw clienteDuplicado(usuario, request);
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

    /**
     * Conta já existente com o e-mail ou com o telefone informados — o telefone em qualquer
     * formato: antes "(11) 96…" não achava a conta de "1196…" e criava outra (BUG-031).
     */
    private Usuario contaExistente(ClienteRequest request) {
        return usuarioRepository.findByEmailAndAtivoTrue(request.getEmail())
                .orElseGet(() -> usuarioRepository.findByTelefoneDigitos(Telefones.digitos(request.getPhone()))
                        .stream().findFirst().orElse(null));
    }

    /**
     * Cliente já cadastrado no salão: 409 dizendo o campo que bateu (BUG-039 — antes era 400
     * genérico, e a tela não tinha como marcar o telefone ou o email como duplicado).
     */
    private static DuplicateResourceException clienteDuplicado(Usuario existente, ClienteRequest request) {
        boolean peloEmail = request.getEmail() != null && request.getEmail().equalsIgnoreCase(existente.getEmail());
        return new DuplicateResourceException("Cliente já cadastrado neste salão com este " + (peloEmail ? "email" : "telefone"));
    }

    /** E-mail provisório de quem não informou e-mail: só dígitos (antes saía "(11) 96203-5710@…"). */
    private static String emailProvisorio(String telefone) {
        return Telefones.digitos(telefone) + "@cliente.belezza.ai";
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

            // Valor realmente pago (soma das partes aprovadas — pagamento dividido gera várias); nulo se nada aprovado
            BigDecimal valorPagoAprovado = pagamentoRepository.findByAgendamentoIdOrderByCriadoEmAsc(agendamento.getId()).stream()
                    .filter(p -> p.getStatus() == StatusPagamento.APROVADO)
                    .map(Pagamento::getValor)
                    .reduce(BigDecimal::add)
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

    @Transactional(readOnly = true)
    public List<ClienteResponse> listarPorSalon(Long salonId, String search, String status, String loyaltyLevel) {
        return listarPorSalon(salonId, search, status, loyaltyLevel, false);
    }

    /**
     * Compara só os dígitos: "(11) 99999-1234", "11999991234" e "+55 11 99999-1234" batem entre si.
     * Exige ao menos 3 dígitos na busca, para "Ana" ou um único número não casar com todo mundo.
     */
    private static boolean telefoneContem(String telefone, String busca) {
        if (telefone == null) return false;
        String digitosBusca = busca.replaceAll("\\D", "");
        return digitosBusca.length() >= 3 && telefone.replaceAll("\\D", "").contains(digitosBusca);
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> listarPorSalon(Long salonId, String search, String status, String loyaltyLevel, boolean restrictSensitiveData) {
        // Lista apenas quem tem cadastro de cliente neste salão. (Antes, listar "sincronizava"
        // todo usuário CLIENTE da plataforma, cadastrando no salão os clientes de todos os outros.)
        // O filtro "Inativos" busca os excluídos; antes a lista só carregava ativos e vinha vazia.
        List<Cliente> clientes = "inactive".equals(status)
                ? clienteRepository.findBySalonIdAndAtivoFalse(salonId)
                : clienteRepository.findBySalonIdAndAtivoTrue(salonId);

        // Aplicar filtros
        return clientes.stream()
                .filter(c -> {
                    // Filtro de busca — usa nome mesmo para PROFISSIONAL
                    if (search != null && !search.isBlank()) {
                        // Sem acentos e maiúsculas: "jose cao" encontra "José Ção" (BUG-040)
                        return Textos.contem(c.getUsuario().getNome(), search)
                                || (!restrictSensitiveData && (telefoneContem(c.getUsuario().getTelefone(), search)
                                        || telefoneContem(c.getWhatsapp(), search)))
                                || (!restrictSensitiveData && Textos.contem(c.getUsuario().getEmail(), search));
                    }
                    return true;
                })
                .filter(c -> {
                    // Filtro de status
                    if (status != null && !status.isEmpty()) {
                        if ("active".equals(status)) {
                            return c.isAtivo() && !c.isBloqueado();
                        } else if ("blocked".equals(status)) {
                            return c.isAtivo() && c.isBloqueado();
                        } else if ("inactive".equals(status)) {
                            return !c.isAtivo();
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
    /**
     * Atualiza o cliente pelo salão de quem edita (admin ou recepção). Antes o salão era buscado
     * pelo e-mail do admin, e a recepcionista recebia erro ao salvar qualquer cliente.
     */
    public ClienteResponse atualizar(Long id, ClienteRequest request, Long salonIdOperador) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        if (salonIdOperador == null || !cliente.getSalon().getId().equals(salonIdOperador)) {
            throw new AccessDeniedException("Acesso negado: cliente pertence a outro estabelecimento");
        }

        // Atualizar dados do usuário se necessário
        Usuario usuario = cliente.getUsuario();
        if (request.getName() != null) {
            usuario.setNome(request.getName());
        }
        if (request.getPhone() != null) {
            // Telefone de outra conta (em qualquer formato) é recusado; o mesmo número com outra
            // formatação passa — contas antigas podem compartilhar o telefone (BUG-031)
            boolean mudou = !Telefones.digitos(request.getPhone()).equals(Telefones.digitos(usuario.getTelefone()));
            if (mudou && usuarioRepository.telefoneEmUso(request.getPhone(), usuario.getId())) {
                throw new DuplicateResourceException("Já existe uma conta com este telefone");
            }
            usuario.setTelefone(request.getPhone().trim());
        }
        if (request.getEmail() != null && !request.getEmail().endsWith("@cliente.belezza.ai")
                && !request.getEmail().equalsIgnoreCase(usuario.getEmail())) {
            // E-mail de outra conta: antes estourava na restrição única do banco (erro 500)
            if (usuarioRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Já existe uma conta com este email");
            }
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
            throw new AccessDeniedException("Cliente não pertence a este salão");
        }

        cliente.setAtivo(false);
        clienteRepository.save(cliente);

        // Antes só o cadastro no salão era desativado e a pessoa continuava entrando no app. O
        // login é desativado quando ela é só cliente (não equipe) e não é cliente ativa em outro
        // salão; como toda requisição confere se o usuário está ativo, a sessão aberta cai também.
        Usuario usuario = cliente.getUsuario();
        if (usuario.getRole() == Role.CLIENTE && usuario.isAtivo()
                && !clienteRepository.existsByUsuarioIdAndAtivoTrueAndIdNot(usuario.getId(), cliente.getId())) {
            usuario.setAtivo(false);
            usuarioRepository.save(usuario);
            log.info("Cliente excluído (soft delete): {} — login do usuário {} desativado", id, usuario.getId());
        } else {
            log.info("Cliente excluído (soft delete): {}", id);
        }
    }

    /** Desfaz a exclusão: o cadastro no salão e o login voltam a valer. */
    @Transactional
    @Auditable(action = "REACTIVATE", entityType = "Cliente", captureNewState = true)
    @SuppressWarnings("null")
    public ClienteResponse reativar(Long id, Long salonIdOperador) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
        if (salonIdOperador == null || !cliente.getSalon().getId().equals(salonIdOperador)) {
            throw new AccessDeniedException("Acesso negado: cliente pertence a outro estabelecimento");
        }
        if (cliente.isAtivo()) {
            throw new BusinessException("Este cliente já está ativo");
        }
        cliente.setAtivo(true);
        cliente = clienteRepository.save(cliente);
        Usuario usuario = cliente.getUsuario();
        if (!usuario.isAtivo()) {
            usuario.setAtivo(true);
            usuarioRepository.save(usuario);
        }
        log.info("Cliente reativado: {}", id);
        var fidelidade = fidelidadeRepository.findByClienteIdAndAtivoTrue(id).stream().findFirst().orElse(null);
        return ClienteResponse.fromEntity(cliente, fidelidade);
    }

    @Transactional
    @SuppressWarnings("null")
    public ClienteResponse atualizarObservacoes(Long id, String observacoes, String emailAdmin) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", id));

        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        if (!cliente.getSalon().getId().equals(salon.getId())) {
            throw new AccessDeniedException("Cliente não pertence a este salão");
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
            throw new AccessDeniedException("Cliente não pertence a este salão");
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
            throw new AccessDeniedException("Cliente não pertence a este salão");
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
                .map(existente -> {
                    // Cadastro excluído pelo salão: antes era reaproveitado e o agendamento passava
                    if (!existente.isAtivo()) {
                        throw new BusinessException("Seu cadastro neste salão foi desativado. Entre em contato com o salão.");
                    }
                    return existente;
                })
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
}
