package com.belezza.api.service;

import com.belezza.api.dto.agendamento.AgendamentoRequest;
import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.agendamento.CancelamentoRequest;
import com.belezza.api.dto.agendamento.ReagendamentoRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.integration.WhatsAppService;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.HorarioTrabalhoRepository;
import com.belezza.api.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.belezza.api.security.annotation.Auditable;

import com.belezza.api.dto.agendamento.MeuAgendamentoDTO;
import com.belezza.api.dto.agendamento.MeusAgendamentosResponse;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgendamentoService {

    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;
    private final HorarioTrabalhoRepository horarioTrabalhoRepository;
    private final TenantIsolationService tenantIsolationService;
    private final ProfissionalService profissionalService;
    private final ServicoService servicoService;
    private final ClienteService clienteService;
    private final BloqueioHorarioService bloqueioHorarioService;
    private final WhatsAppService whatsAppService;
    private final ComissaoService comissaoService;
    private final NotificacaoService notificacaoService;
    private final EmailService emailService;
    @Lazy
    private final FidelidadeService fidelidadeService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Transactional
    @Auditable(action = "CREATE", entityType = "Agendamento", captureNewState = true)
    public AgendamentoResponse criar(AgendamentoRequest request, String emailUsuarioAutenticado) {
        log.info("Criando agendamento - usuário autenticado: {}, clienteId fornecido: {}",
                emailUsuarioAutenticado, request.getClienteId());

        // Validate request
        if (!request.isValid()) {
            throw new BusinessException(request.getValidationError());
        }

        Profissional profissional = profissionalService.getProfissionalEntity(request.getProfissionalId());
        Salon salon = profissional.getSalon();

        // Get client: use clienteId from request if provided, otherwise use authenticated user
        Cliente cliente;
        if (request.getClienteId() != null) {
            // Admin/receptionist creating appointment for a specific client
            cliente = clienteRepository.findById(request.getClienteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente", request.getClienteId()));
            log.info("Usando cliente fornecido: {} (ID: {})",
                    cliente.getUsuario() != null ? cliente.getUsuario().getNome() : "N/A",
                    cliente.getId());
        } else if (emailUsuarioAutenticado != null && !emailUsuarioAutenticado.isBlank()) {
            // Client booking their own appointment
            cliente = clienteService.getOrCreateCliente(salon.getId(), emailUsuarioAutenticado);
            log.info("Usando cliente autenticado: {} (ID: {})",
                    cliente.getUsuario() != null ? cliente.getUsuario().getNome() : "N/A",
                    cliente.getId());
        } else {
            throw new BusinessException("É necessário fornecer o clienteId ou estar autenticado para criar um agendamento");
        }

        // Check if multiple services or single service
        if (request.hasMultipleServices()) {
            return criarComMultiplosServicos(request, profissional, salon, cliente);
        } else {
            return criarComServicoUnico(request, profissional, salon, cliente);
        }
    }

    /**
     * Create appointment with single service (legacy approach).
     */
    @SuppressWarnings("deprecation")
    private AgendamentoResponse criarComServicoUnico(AgendamentoRequest request,
                                                      Profissional profissional, Salon salon, Cliente cliente) {
        Servico servico = servicoService.getServicoEntity(request.getServicoId());

        // Validate everything
        validarAgendamento(salon, profissional, servico, cliente, request.getDataHora());

        // Calculate end time
        LocalDateTime fimPrevisto = request.getDataHora().plusMinutes(servico.getDuracaoMinutos());

        // Check for conflicts
        validarConflitos(profissional.getId(), request.getDataHora(), fimPrevisto);

        // Create appointment
        Agendamento agendamento = Agendamento.builder()
                .salon(salon)
                .cliente(cliente)
                .profissional(profissional)
                .servico(servico)
                .dataHora(request.getDataHora())
                .fimPrevisto(fimPrevisto)
                .status(StatusAgendamento.PENDENTE)
                .observacoes(request.getObservacoes())
                .notasInternas(request.getNotasInternas())
                .valorCobrado(servico.getPreco())
                .tokenConfirmacao(UUID.randomUUID().toString())
                .build();

        agendamento = agendamentoRepository.save(agendamento);

        // Increment client appointment count
        clienteRepository.incrementTotalAgendamentos(cliente.getId());

        String clienteEmail = cliente.getUsuario() != null ? cliente.getUsuario().getEmail() : "N/A";
        log.info("Agendamento criado: {} para {} em {}", agendamento.getId(), clienteEmail, request.getDataHora());

        // Enviar confirmação via WhatsApp
        enviarNotificacaoConfirmacao(agendamento);

        // Criar notificação no sistema + enviar email
        enviarNotificacoesSistemaConfirmacao(agendamento);

        return AgendamentoResponse.fromEntity(agendamento);
    }

    /**
     * Create appointment with multiple services (new approach).
     */
    @SuppressWarnings("deprecation")
    private AgendamentoResponse criarComMultiplosServicos(AgendamentoRequest request,
                                                           Profissional profissional, Salon salon, Cliente cliente) {
        log.info("Criando agendamento com {} serviços", request.getServicoIds().size());

        // Load all services
        List<Servico> servicos = request.getServicoIds().stream()
            .map(servicoService::getServicoEntity)
            .collect(java.util.stream.Collectors.toList());

        // Validate all services belong to the same salon
        boolean allFromSameSalon = servicos.stream()
            .allMatch(s -> s.getSalon().getId().equals(salon.getId()));
        if (!allFromSameSalon) {
            throw new BusinessException("Todos os serviços devem pertencer ao mesmo salão");
        }

        // Calculate total duration
        int tempoPreparacao = request.getTempoPreparacaoEntreServicosMinutos() != null
            ? request.getTempoPreparacaoEntreServicosMinutos() : 0;
        int duracaoTotal = servicos.stream()
            .mapToInt(Servico::getDuracaoMinutos)
            .sum();
        if (servicos.size() > 1) {
            duracaoTotal += tempoPreparacao * (servicos.size() - 1); // Add prep time between services
        }

        LocalDateTime fimPrevisto = request.getDataHora().plusMinutes(duracaoTotal);

        // Validate
        for (Servico servico : servicos) {
            validarAgendamento(salon, profissional, servico, cliente, request.getDataHora());
        }

        // Check for conflicts
        validarConflitos(profissional.getId(), request.getDataHora(), fimPrevisto);

        // Calculate total price
        BigDecimal valorTotal = servicos.stream()
            .map(Servico::getPreco)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Create appointment (without servico for new approach)
        Agendamento agendamento = Agendamento.builder()
                .salon(salon)
                .cliente(cliente)
                .profissional(profissional)
                .servico(null) // No single service for multiple services
                .dataHora(request.getDataHora())
                .fimPrevisto(fimPrevisto)
                .status(StatusAgendamento.PENDENTE)
                .observacoes(request.getObservacoes())
                .notasInternas(request.getNotasInternas())
                .valorCobrado(valorTotal)
                .tokenConfirmacao(UUID.randomUUID().toString())
                .build();

        agendamento = agendamentoRepository.save(agendamento);

        // Add services to appointment
        for (int i = 0; i < servicos.size(); i++) {
            Servico servico = servicos.get(i);
            int prepTime = (i == 0) ? 0 : tempoPreparacao; // First service has no prep time
            agendamento.addServico(servico, servico.getDuracaoMinutos(), prepTime);
        }

        agendamento = agendamentoRepository.save(agendamento);

        // Increment client appointment count
        clienteRepository.incrementTotalAgendamentos(cliente.getId());

        String clienteEmail = cliente.getUsuario() != null ? cliente.getUsuario().getEmail() : "N/A";
        log.info("Agendamento com múltiplos serviços criado: {} para {} em {}",
            agendamento.getId(), clienteEmail, request.getDataHora());

        // Enviar confirmação via WhatsApp
        enviarNotificacaoConfirmacao(agendamento);

        // Criar notificação no sistema + enviar email
        enviarNotificacoesSistemaConfirmacao(agendamento);

        return AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional(readOnly = true)
    public AgendamentoResponse buscarPorId(Long id) {
        return buscarPorId(id, false);
    }

    @Transactional(readOnly = true)
    public AgendamentoResponse buscarPorId(Long id, boolean restrictSensitiveData) {
        return buscarPorId(id, restrictSensitiveData, restrictSensitiveData);
    }

    /**
     * @param hideInternalNotes If true, excludes notasInternas — must be true for CLIENTE/anonymous callers,
     *                          false for staff (ADMIN/PROFISSIONAL/RECEPCIONISTA).
     */
    @Transactional(readOnly = true)
    public AgendamentoResponse buscarPorId(Long id, boolean restrictSensitiveData, boolean hideInternalNotes) {
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", id));
        tenantIsolationService.assertCurrentTenant(agendamento.getSalon().getId());
        return AgendamentoResponse.fromEntity(agendamento, restrictSensitiveData, hideInternalNotes);
    }

    @Transactional(readOnly = true)
    public Page<AgendamentoResponse> listarPorSalon(Long salonId, Pageable pageable, boolean restrictSensitiveData) {
        tenantIsolationService.assertRequestedSalon(salonId);
        return agendamentoRepository.findBySalonId(salonId, pageable)
                .map(a -> restrictSensitiveData ? AgendamentoResponse.fromEntityForProfessional(a) : AgendamentoResponse.fromEntity(a));
    }

    @Transactional(readOnly = true)
    public Page<AgendamentoResponse> listarPorCliente(Long clienteId, Pageable pageable, boolean restrictSensitiveData) {
        return agendamentoRepository.findByClienteId(clienteId, pageable)
                .map(a -> restrictSensitiveData ? AgendamentoResponse.fromEntityForProfessional(a) : AgendamentoResponse.fromEntity(a));
    }

    @Transactional(readOnly = true)
    public Page<AgendamentoResponse> listarPorProfissional(Long profissionalId, Pageable pageable) {
        return listarPorProfissional(profissionalId, pageable, false);
    }

    /**
     * Lists appointments for a professional with optional data restriction.
     *
     * @param profissionalId The professional's ID
     * @param pageable Pagination info
     * @param restrictSensitiveData If true, excludes client phone and appointment notes
     * @return Page of appointments
     */
    @Transactional(readOnly = true)
    public Page<AgendamentoResponse> listarPorProfissional(Long profissionalId, Pageable pageable, boolean restrictSensitiveData) {
        return agendamentoRepository.findByProfissionalId(profissionalId, pageable)
                .map(a -> restrictSensitiveData ? AgendamentoResponse.fromEntityForProfessional(a) : AgendamentoResponse.fromEntity(a));
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponse> listarAgendaDiaria(Long profissionalId, LocalDateTime data) {
        return listarAgendaDiaria(profissionalId, data, false);
    }

    /**
     * Lists daily schedule for a professional with optional data restriction.
     *
     * @param profissionalId The professional's ID
     * @param data The date to query
     * @param restrictSensitiveData If true, excludes client phone and appointment notes
     * @return List of appointments
     */
    @Transactional(readOnly = true)
    public List<AgendamentoResponse> listarAgendaDiaria(Long profissionalId, LocalDateTime data, boolean restrictSensitiveData) {
        LocalDateTime dayStart = data.toLocalDate().atStartOfDay();
        LocalDateTime dayEnd = dayStart.plusDays(1);

        return agendamentoRepository.findDailyByProfissional(profissionalId, dayStart, dayEnd).stream()
                .map(a -> restrictSensitiveData ? AgendamentoResponse.fromEntityForProfessional(a) : AgendamentoResponse.fromEntity(a))
                .toList();
    }

    /**
     * Lists appointments for the authenticated client user.
     *
     * @param usuarioId The authenticated user's ID
     * @param page      Page number (1-indexed)
     * @param limit     Items per page
     * @param status    Optional status filter (pending, confirmed, in_progress, completed, canceled, no_show)
     * @param sortBy    Sort field (default: date)
     * @param sortOrder Sort order (asc or desc, default: desc)
     * @return Paginated list of client's appointments
     */
    @Transactional(readOnly = true)
    public MeusAgendamentosResponse listarMeusAgendamentos(
            Long usuarioId,
            int page,
            int limit,
            String status,
            String sortBy,
            String sortOrder) {

        log.info("Listando agendamentos do usuário: {} - page={}, limit={}, status={}", usuarioId, page, limit, status);

        // Map sort field
        String sortField = switch (sortBy != null ? sortBy : "date") {
            case "date" -> "dataHora";
            case "status" -> "status";
            case "createdAt" -> "criadoEm";
            default -> "dataHora";
        };

        // Build sort direction
        org.springframework.data.domain.Sort.Direction direction =
            "asc".equalsIgnoreCase(sortOrder)
                ? org.springframework.data.domain.Sort.Direction.ASC
                : org.springframework.data.domain.Sort.Direction.DESC;

        org.springframework.data.domain.Sort sort = org.springframework.data.domain.Sort.by(direction, sortField);

        // Page is 1-indexed from frontend, 0-indexed in Spring
        org.springframework.data.domain.Pageable pageable =
            org.springframework.data.domain.PageRequest.of(Math.max(0, page - 1), limit, sort);

        // Get appointments
        org.springframework.data.domain.Page<Agendamento> appointmentsPage;

        if (status != null && !status.isBlank()) {
            StatusAgendamento statusEnum = mapStatusFromString(status);
            if (statusEnum != null) {
                appointmentsPage = agendamentoRepository.findByClienteUsuarioIdAndStatus(usuarioId, statusEnum, pageable);
            } else {
                appointmentsPage = agendamentoRepository.findByClienteUsuarioId(usuarioId, pageable);
            }
        } else {
            appointmentsPage = agendamentoRepository.findByClienteUsuarioId(usuarioId, pageable);
        }

        // Convert to DTOs
        List<MeuAgendamentoDTO> items = appointmentsPage.getContent().stream()
            .map(MeuAgendamentoDTO::fromEntity)
            .collect(Collectors.toList());

        // Build response
        return MeusAgendamentosResponse.builder()
            .items(items)
            .data(items) // alias for compatibility
            .meta(MeusAgendamentosResponse.Meta.builder()
                .total(appointmentsPage.getTotalElements())
                .page(page)
                .limit(limit)
                .totalPages(appointmentsPage.getTotalPages())
                .hasNextPage(appointmentsPage.hasNext())
                .hasPrevPage(appointmentsPage.hasPrevious())
                .build())
            .build();
    }

    /**
     * Maps frontend status string to StatusAgendamento enum.
     */
    private StatusAgendamento mapStatusFromString(String status) {
        return switch (status.toLowerCase()) {
            case "pending" -> StatusAgendamento.PENDENTE;
            case "confirmed" -> StatusAgendamento.CONFIRMADO;
            case "in_progress" -> StatusAgendamento.EM_ANDAMENTO;
            case "completed" -> StatusAgendamento.CONCLUIDO;
            case "canceled" -> StatusAgendamento.CANCELADO;
            case "no_show" -> StatusAgendamento.NO_SHOW;
            default -> null;
        };
    }

    @Transactional
    public AgendamentoResponse confirmar(Long id) {
        return confirmar(id, false, null);
    }

    @Transactional
    public AgendamentoResponse confirmar(Long id, boolean restrictSensitiveData) {
        return confirmar(id, restrictSensitiveData, null);
    }

    /**
     * Confirms an appointment with optional data restriction.
     *
     * @param id The appointment ID
     * @param restrictSensitiveData If true, excludes client phone and appointment notes
     * @param operador The authenticated staff member performing the action (excluded from the
     *                 team notification below so they don't get notified of their own action)
     * @return AgendamentoResponse
     */
    @Transactional
    public AgendamentoResponse confirmar(Long id, boolean restrictSensitiveData, Usuario operador) {
        Agendamento agendamento = getAgendamento(id);
        enforceStaffTenant(agendamento.getSalon().getId());

        if (agendamento.getStatus() != StatusAgendamento.PENDENTE) {
            throw new BusinessException("Apenas agendamentos pendentes podem ser confirmados");
        }

        agendamento.setStatus(StatusAgendamento.CONFIRMADO);
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento confirmado: {}", id);

        // Avisa o cliente que a equipe confirmou o agendamento dele. Faltava essa chamada —
        // o método já existia em NotificacaoService mas nunca era invocado por este fluxo.
        try {
            notificacaoService.notificarAgendamentoConfirmado(agendamento);
        } catch (Exception e) {
            log.error("Erro ao notificar cliente sobre confirmação do agendamento: {}", e.getMessage(), e);
        }

        // Avisa o resto da equipe (profissional, admin, recepção) — quem confirmou não
        // recebe a própria notificação.
        try {
            notificacaoService.notificarEquipeMudancaStatusAgendamento(
                    agendamento, operador, TipoNotificacao.AGENDAMENTO_CONFIRMADO,
                    "Agendamento Confirmado",
                    mensagemEquipe(agendamento, "foi confirmado"));
        } catch (Exception e) {
            log.error("Erro ao notificar equipe sobre confirmação do agendamento {}: {}", id, e.getMessage(), e);
        }

        return restrictSensitiveData ? AgendamentoResponse.fromEntityForProfessional(agendamento) : AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional
    public AgendamentoResponse confirmarPorToken(String token) {
        Agendamento agendamento = agendamentoRepository.findByTokenConfirmacao(token)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", "token", token));

        if (agendamento.getStatus() != StatusAgendamento.PENDENTE) {
            throw new BusinessException("Apenas agendamentos pendentes podem ser confirmados");
        }

        agendamento.setStatus(StatusAgendamento.CONFIRMADO);
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento confirmado por token: {}", agendamento.getId());

        try {
            notificacaoService.notificarEquipeAgendamentoConfirmadoPeloCliente(agendamento);
        } catch (Exception e) {
            log.error("Erro ao notificar equipe sobre confirmação do cliente: {}", e.getMessage(), e);
        }

        // Token flow: caller is the client via an emailed link, not staff — never expose sensitive data.
        return AgendamentoResponse.fromEntityForClient(agendamento);
    }

    /**
     * Confirms a PENDENTE appointment on behalf of the authenticated client, from within the app
     * (as opposed to the emailed token link). Notifies admin + receptionists on success.
     *
     * @param agendamentoId The appointment ID
     * @param usuarioId     The authenticated client's user ID (must own the appointment)
     * @return The client-safe DTO of the updated appointment
     */
    @Transactional
    public MeuAgendamentoDTO confirmarComoCliente(Long agendamentoId, Long usuarioId) {
        Agendamento agendamento = getAgendamento(agendamentoId);

        if (!agendamento.getCliente().getUsuario().getId().equals(usuarioId)) {
            throw new AccessDeniedException("Acesso negado: este agendamento não pertence a este cliente");
        }

        if (agendamento.getStatus() != StatusAgendamento.PENDENTE) {
            throw new BusinessException("Apenas agendamentos pendentes podem ser confirmados");
        }

        agendamento.setStatus(StatusAgendamento.CONFIRMADO);
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento confirmado pelo cliente via app: {}", agendamentoId);

        try {
            notificacaoService.notificarEquipeAgendamentoConfirmadoPeloCliente(agendamento);
        } catch (Exception e) {
            log.error("Erro ao notificar equipe sobre confirmação do cliente: {}", e.getMessage(), e);
        }

        return MeuAgendamentoDTO.fromEntity(agendamento);
    }

    @Transactional
    public AgendamentoResponse cancelarPorToken(String token, String motivo) {
        Agendamento agendamento = agendamentoRepository.findByTokenConfirmacao(token)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", "token", token));

        if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO ||
            agendamento.getStatus() == StatusAgendamento.CANCELADO ||
            agendamento.getStatus() == StatusAgendamento.NO_SHOW) {
            throw new BusinessException("Este agendamento não pode ser cancelado");
        }

        agendamento.setStatus(StatusAgendamento.CANCELADO);
        agendamento.setMotivoCancelamento(motivo != null ? motivo : "Cancelado pelo cliente via link");
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento cancelado por token: {} - Motivo: {}", agendamento.getId(), motivo);

        enviarNotificacoesSistemaCancelamento(agendamento, agendamento.getMotivoCancelamento(), null);

        // Token flow: caller is the client via an emailed link, not staff — never expose sensitive data.
        return AgendamentoResponse.fromEntityForClient(agendamento);
    }

    @Transactional
    public AgendamentoResponse iniciar(Long id) {
        return iniciar(id, false, null);
    }

    @Transactional
    public AgendamentoResponse iniciar(Long id, boolean restrictSensitiveData) {
        return iniciar(id, restrictSensitiveData, null);
    }

    /**
     * Starts an appointment with optional data restriction.
     *
     * @param id The appointment ID
     * @param restrictSensitiveData If true, excludes client phone and appointment notes
     * @param operador The authenticated staff member performing the action (excluded from the
     *                 team notification below so they don't get notified of their own action)
     * @return AgendamentoResponse
     */
    @Transactional
    public AgendamentoResponse iniciar(Long id, boolean restrictSensitiveData, Usuario operador) {
        Agendamento agendamento = getAgendamento(id);
        enforceStaffTenant(agendamento.getSalon().getId());

        if (agendamento.getStatus() != StatusAgendamento.CONFIRMADO) {
            throw new BusinessException("Apenas agendamentos confirmados podem ser iniciados");
        }

        agendamento.setStatus(StatusAgendamento.EM_ANDAMENTO);
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento iniciado: {}", id);

        try {
            notificacaoService.notificarEquipeMudancaStatusAgendamento(
                    agendamento, operador, TipoNotificacao.SISTEMA,
                    "Atendimento Iniciado",
                    mensagemEquipe(agendamento, "foi iniciado"));
        } catch (Exception e) {
            log.error("Erro ao notificar equipe sobre início do agendamento {}: {}", id, e.getMessage(), e);
        }

        return restrictSensitiveData ? AgendamentoResponse.fromEntityForProfessional(agendamento) : AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional
    @Auditable(action = "COMPLETE", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse concluir(Long id) {
        return concluir(id, false, null);
    }

    @Transactional
    @Auditable(action = "COMPLETE", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse concluir(Long id, boolean restrictSensitiveData) {
        return concluir(id, restrictSensitiveData, null);
    }

    /**
     * Completes an appointment with optional data restriction.
     *
     * @param id The appointment ID
     * @param restrictSensitiveData If true, excludes client phone and appointment notes
     * @param operador The authenticated staff member performing the action (excluded from the
     *                 team notification below so they don't get notified of their own action)
     * @return AgendamentoResponse
     */
    @Transactional
    @Auditable(action = "COMPLETE", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse concluir(Long id, boolean restrictSensitiveData, Usuario operador) {
        Agendamento agendamento = getAgendamento(id);
        enforceStaffTenant(agendamento.getSalon().getId());

        if (agendamento.getStatus() != StatusAgendamento.EM_ANDAMENTO) {
            throw new BusinessException("Apenas agendamentos em andamento podem ser concluídos");
        }

        agendamento.setStatus(StatusAgendamento.CONCLUIDO);
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento concluído: {}", id);

        // Calcular comissao automaticamente
        try {
            comissaoService.calcularComissao(agendamento);
        } catch (Exception e) {
            log.error("Erro ao calcular comissao para agendamento {}: {}", id, e.getMessage());
            // Nao propagar erro - conclusao ja foi realizada
        }

        // Registrar visita no programa de fidelidade
        try {
            fidelidadeService.registrarVisita(id, agendamento);
        } catch (Exception e) {
            log.error("Erro ao registrar visita de fidelidade para agendamento {}: {}", id, e.getMessage());
            // Nao propagar erro - conclusao ja foi realizada
        }

        // Enviar mensagem de pós-atendimento via WhatsApp
        enviarNotificacaoPosAtendimento(agendamento);

        try {
            notificacaoService.notificarEquipeMudancaStatusAgendamento(
                    agendamento, operador, TipoNotificacao.SISTEMA,
                    "Atendimento Concluído",
                    mensagemEquipe(agendamento, "foi concluído"));
        } catch (Exception e) {
            log.error("Erro ao notificar equipe sobre conclusão do agendamento {}: {}", id, e.getMessage(), e);
        }

        return restrictSensitiveData ? AgendamentoResponse.fromEntityForProfessional(agendamento) : AgendamentoResponse.fromEntity(agendamento);
    }

    /**
     * Verifies the authenticated caller is allowed to cancel/reschedule this appointment:
     * a CLIENTE may only touch their own appointment, and staff (ADMIN/PROFISSIONAL/
     * RECEPCIONISTA) may only touch appointments in their own salon. Without this check,
     * any authenticated client could cancel or reschedule any other client's appointment
     * in any salon just by guessing the numeric ID (see audit BUG #003).
     *
     * @param operador The authenticated caller, or null for legacy/internal callers that
     *                  have already established authorization another way (e.g. token-based
     *                  public links, which resolve the appointment from a secret token rather
     *                  than a guessable ID).
     */
    private void enforceModificationOwnership(Agendamento agendamento, Usuario operador) {
        if (operador == null) {
            return;
        }
        if (operador.getRole() == Role.CLIENTE) {
            Cliente cliente = agendamento.getCliente();
            if (cliente == null || cliente.getUsuario() == null
                    || !cliente.getUsuario().getId().equals(operador.getId())) {
                throw new AccessDeniedException("Acesso negado: este agendamento não pertence a este cliente");
            }
            return;
        }
        enforceStaffTenant(agendamento.getSalon().getId());
    }

    /**
     * Tenant check for staff-only actions (confirmar/iniciar/concluir/no-show/cancelar/reagendar
     * by ADMIN/PROFISSIONAL/RECEPCIONISTA). Unlike TenantIsolationService.assertCurrentTenant,
     * which treats "no tenant in context" as an allow (correct for CLIENTE, who may not carry a
     * fixed salon claim), a staff account reaching one of these role-gated endpoints must always
     * resolve to a salon — a staff JWT with no salonId claim means the account was never properly
     * linked to a salon and must not be allowed to touch any salon's appointments.
     */
    private void enforceStaffTenant(Long agendamentoSalonId) {
        if (TenantContext.getCurrentTenant() == null) {
            throw new AccessDeniedException("Acesso negado: usuário sem salão vinculado");
        }
        tenantIsolationService.assertCurrentTenant(agendamentoSalonId);
    }

    @Transactional
    @Auditable(action = "CANCEL", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse cancelar(Long id, CancelamentoRequest request) {
        return cancelar(id, request, false);
    }

    @Transactional
    @Auditable(action = "CANCEL", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse cancelar(Long id, CancelamentoRequest request, boolean restrictSensitiveData) {
        return cancelar(id, request, restrictSensitiveData, restrictSensitiveData, null);
    }

    /**
     * @param hideInternalNotes If true, excludes notasInternas — must be true for CLIENTE/anonymous callers,
     *                          false for staff (ADMIN/PROFISSIONAL/RECEPCIONISTA).
     * @param operador          The authenticated caller; enforces ownership (see enforceModificationOwnership).
     */
    @Transactional
    @Auditable(action = "CANCEL", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse cancelar(Long id, CancelamentoRequest request, boolean restrictSensitiveData, boolean hideInternalNotes, Usuario operador) {
        Agendamento agendamento = getAgendamento(id);
        enforceModificationOwnership(agendamento, operador);

        if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO ||
            agendamento.getStatus() == StatusAgendamento.CANCELADO ||
            agendamento.getStatus() == StatusAgendamento.NO_SHOW) {
            throw new BusinessException("Este agendamento não pode ser cancelado");
        }

        agendamento.setStatus(StatusAgendamento.CANCELADO);
        agendamento.setMotivoCancelamento(request.getMotivo());
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento cancelado: {} - Motivo: {}", id, request.getMotivo());

        // Enviar notificação WhatsApp de cancelamento
        enviarNotificacaoCancelamento(agendamento, request.getMotivo());

        // Criar notificação no sistema + enviar email
        enviarNotificacoesSistemaCancelamento(agendamento, request.getMotivo(), operador);

        return AgendamentoResponse.fromEntity(agendamento, restrictSensitiveData, hideInternalNotes);
    }

    @Transactional
    @Auditable(action = "RESCHEDULE", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse reagendar(Long id, ReagendamentoRequest request) {
        return reagendar(id, request, false);
    }

    @Transactional
    @Auditable(action = "RESCHEDULE", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse reagendar(Long id, ReagendamentoRequest request, boolean restrictSensitiveData) {
        return reagendar(id, request, restrictSensitiveData, restrictSensitiveData, null);
    }

    /**
     * @param hideInternalNotes If true, excludes notasInternas — must be true for CLIENTE/anonymous callers,
     *                          false for staff (ADMIN/PROFISSIONAL/RECEPCIONISTA).
     * @param operador          The authenticated caller; enforces ownership (see enforceModificationOwnership).
     */
    @Transactional
    @Auditable(action = "RESCHEDULE", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse reagendar(Long id, ReagendamentoRequest request, boolean restrictSensitiveData, boolean hideInternalNotes, Usuario operador) {
        Agendamento agendamento = getAgendamento(id);
        enforceModificationOwnership(agendamento, operador);

        if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO ||
            agendamento.getStatus() == StatusAgendamento.CANCELADO ||
            agendamento.getStatus() == StatusAgendamento.NO_SHOW) {
            throw new BusinessException("Este agendamento não pode ser reagendado");
        }

        Profissional profissional = agendamento.getProfissional();
        if (request.getNovoProfissionalId() != null) {
            profissional = profissionalService.getProfissionalEntity(request.getNovoProfissionalId());
        }

        Salon salon = agendamento.getSalon();
        Cliente cliente = agendamento.getCliente();

        // Replace the appointment's services when new ones are provided (e.g. the client
        // changed their selection while rescheduling). orphanRemoval=true on
        // Agendamento.servicos means clearing + re-adding correctly deletes the old rows.
        if (request.getServicoIds() != null && !request.getServicoIds().isEmpty()) {
            List<Servico> novosServicos = request.getServicoIds().stream()
                    .map(servicoService::getServicoEntity)
                    .toList();
            boolean allFromSameSalon = novosServicos.stream()
                    .allMatch(s -> s.getSalon().getId().equals(salon.getId()));
            if (!allFromSameSalon) {
                throw new BusinessException("Todos os serviços devem pertencer ao mesmo salão");
            }
            agendamento.setServico(null);
            agendamento.getServicos().clear();
            // Flush the removal before inserting the replacements — otherwise Hibernate can
            // emit the new AgendamentoServico rows before deleting the orphaned old ones in
            // the same flush, colliding on the (agendamento_id, ordem) unique constraint.
            agendamento = agendamentoRepository.saveAndFlush(agendamento);
            for (Servico s : novosServicos) {
                agendamento.addServico(s, s.getDuracaoMinutos(), 0);
            }
            agendamento.setValorCobrado(novosServicos.stream()
                    .map(Servico::getPreco)
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
        }

        // Resolve service: single-service (legacy) or first of multi-service list.
        // getServico() returns null for appointments created with multiple services.
        Servico servico = agendamento.getServico();
        if (servico == null && !agendamento.getServicos().isEmpty()) {
            servico = agendamento.getServicos().get(0).getServico();
        }
        if (servico == null) {
            throw new BusinessException("Agendamento sem serviço definido — não é possível reagendar");
        }

        // Validate new datetime using the resolved service for salon/hours checks
        validarAgendamento(salon, profissional, servico, cliente, request.getNovaDataHora());

        // Use total duration across all services (single or multi, possibly just replaced above)
        int duracaoTotal = agendamento.getDuracaoTotalMinutos();
        LocalDateTime novoFim = request.getNovaDataHora().plusMinutes(duracaoTotal);
        validarConflitos(profissional.getId(), request.getNovaDataHora(), novoFim);

        agendamento.setDataHora(request.getNovaDataHora());
        agendamento.setFimPrevisto(novoFim);
        agendamento.setProfissional(profissional);
        agendamento.setStatus(StatusAgendamento.PENDENTE);
        agendamento.setLembreteEnviado24h(false);
        agendamento.setLembreteEnviado2h(false);
        if (request.getObservacoes() != null) {
            agendamento.setObservacoes(request.getObservacoes());
        }

        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento reagendado: {} para {}", id, request.getNovaDataHora());

        // Criar notificação no sistema + enviar WhatsApp + email
        enviarNotificacoesReagendamento(agendamento);

        // Avisar a equipe (profissional, recepção e admin) — eles não são notificados pelo
        // enviarNotificacoesReagendamento acima, que só avisa o próprio cliente. Quem reagendou
        // (se foi um membro da equipe) não recebe a própria notificação.
        if (operador != null && operador.getRole() == Role.CLIENTE) {
            try {
                notificacaoService.notificarEquipeAgendamentoReagendadoPeloCliente(agendamento);
            } catch (Exception e) {
                log.error("Erro ao notificar equipe sobre reagendamento pelo cliente: {}", e.getMessage(), e);
            }
        } else {
            try {
                notificacaoService.notificarEquipeMudancaStatusAgendamento(
                        agendamento, operador, TipoNotificacao.AGENDAMENTO_REAGENDADO,
                        "Agendamento Reagendado",
                        mensagemEquipe(agendamento, "foi reagendado"));
            } catch (Exception e) {
                log.error("Erro ao notificar equipe sobre reagendamento: {}", e.getMessage(), e);
            }
        }

        return AgendamentoResponse.fromEntity(agendamento, restrictSensitiveData, hideInternalNotes);
    }

    @Transactional
    @Auditable(action = "NO_SHOW", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse marcarNoShow(Long id) {
        return marcarNoShow(id, false, null);
    }

    @Transactional
    @Auditable(action = "NO_SHOW", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse marcarNoShow(Long id, boolean restrictSensitiveData) {
        return marcarNoShow(id, restrictSensitiveData, null);
    }

    /**
     * Marks an appointment as no-show with optional data restriction.
     *
     * @param id The appointment ID
     * @param restrictSensitiveData If true, excludes client phone and appointment notes
     * @param operador The authenticated staff member performing the action (excluded from the
     *                 team notification below so they don't get notified of their own action)
     * @return AgendamentoResponse
     */
    @Transactional
    @Auditable(action = "NO_SHOW", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse marcarNoShow(Long id, boolean restrictSensitiveData, Usuario operador) {
        Agendamento agendamento = getAgendamento(id);
        enforceStaffTenant(agendamento.getSalon().getId());

        if (agendamento.getStatus() != StatusAgendamento.CONFIRMADO) {
            throw new BusinessException("Apenas agendamentos confirmados podem ser marcados como no-show");
        }

        agendamento.setStatus(StatusAgendamento.NO_SHOW);
        agendamento = agendamentoRepository.save(agendamento);

        // Increment client no-show counter
        clienteRepository.incrementNoShows(agendamento.getCliente().getId());

        // Check if client should be blocked
        Salon salon = agendamento.getSalon();
        Cliente cliente = agendamento.getCliente();
        if (cliente.getNoShows() + 1 >= salon.getMaxNoShowsPermitidos()) {
            cliente.setBloqueado(true);
            clienteRepository.save(cliente);
            log.warn("Cliente {} bloqueado por excesso de no-shows", cliente.getId());
        }

        log.info("Agendamento marcado como no-show: {}", id);

        try {
            notificacaoService.notificarEquipeMudancaStatusAgendamento(
                    agendamento, operador, TipoNotificacao.AGENDAMENTO_CANCELADO,
                    "Cliente Não Compareceu",
                    mensagemEquipe(agendamento, "foi marcado como não comparecimento (no-show)"));
        } catch (Exception e) {
            log.error("Erro ao notificar equipe sobre no-show do agendamento {}: {}", id, e.getMessage(), e);
        }

        return restrictSensitiveData ? AgendamentoResponse.fromEntityForProfessional(agendamento) : AgendamentoResponse.fromEntity(agendamento);
    }

    // --- Validation Methods ---

    private void validarAgendamento(Salon salon, Profissional profissional, Servico servico,
                                     Cliente cliente, LocalDateTime dataHora) {
        // 1. Salon accepts online scheduling
        if (!salon.isAceitaAgendamentoOnline()) {
            throw new BusinessException("Este salão não aceita agendamentos online");
        }

        // 2. Professional accepts online scheduling
        if (!profissional.isAceitaAgendamentoOnline()) {
            throw new BusinessException("Este profissional não aceita agendamentos online");
        }

        // 3. Professional belongs to salon
        if (!profissional.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Profissional não pertence a este salão");
        }

        // 4. Service belongs to salon
        if (!servico.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Serviço não pertence a este salão");
        }

        // 5. Client is not blocked
        if (cliente.isBloqueado()) {
            throw new BusinessException("Cliente bloqueado. Entre em contato com o salão.");
        }

        // 6. Cannot schedule in the past
        if (dataHora.isBefore(LocalDateTime.now())) {
            throw new BusinessException("Não é possível agendar em horários passados");
        }

        // 7. Within salon business hours
        LocalTime horarioServico = dataHora.toLocalTime();
        LocalTime fimServico = horarioServico.plusMinutes(servico.getDuracaoMinutos());
        if (horarioServico.isBefore(salon.getHorarioAbertura()) || fimServico.isAfter(salon.getHorarioFechamento())) {
            throw new BusinessException("Horário fora do funcionamento do salão (" +
                    salon.getHorarioAbertura() + " - " + salon.getHorarioFechamento() + ")");
        }

        // 8. Professional works on this day
        DiaSemana diaSemana = toDiaSemana(dataHora.getDayOfWeek());
        HorarioTrabalho horario = horarioTrabalhoRepository
                .findByProfissionalIdAndDiaSemana(profissional.getId(), diaSemana)
                .orElse(null);

        if (horario != null && horario.isAtivo()) {
            if (horarioServico.isBefore(horario.getHoraInicio()) || fimServico.isAfter(horario.getHoraFim())) {
                throw new BusinessException("Horário fora do expediente do profissional (" +
                        horario.getHoraInicio() + " - " + horario.getHoraFim() + ")");
            }

            // Check if appointment overlaps with break (interval fields are optional)
            if (horario.getIntervaloInicio() != null && horario.getIntervaloFim() != null &&
                horarioServico.isBefore(horario.getIntervaloFim()) &&
                fimServico.isAfter(horario.getIntervaloInicio())) {
                throw new BusinessException("Horário conflita com o intervalo do profissional (" +
                        horario.getIntervaloInicio() + " - " + horario.getIntervaloFim() + ")");
            }
        }

        // 9. No time blocks
        LocalDateTime fimPrevisto = dataHora.plusMinutes(servico.getDuracaoMinutos());
        if (bloqueioHorarioService.temBloqueio(profissional.getId(), dataHora, fimPrevisto)) {
            throw new BusinessException("Profissional possui bloqueio de horário neste período");
        }
    }

    private void validarConflitos(Long profissionalId, LocalDateTime inicio, LocalDateTime fim) {
        List<Agendamento> conflitos = agendamentoRepository.findConflicts(profissionalId, inicio, fim);
        if (!conflitos.isEmpty()) {
            throw new BusinessException("Profissional já possui agendamento neste horário");
        }
    }

    private Agendamento getAgendamento(Long id) {
        return agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", id));
    }

    private DiaSemana toDiaSemana(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> DiaSemana.SEGUNDA;
            case TUESDAY -> DiaSemana.TERCA;
            case WEDNESDAY -> DiaSemana.QUARTA;
            case THURSDAY -> DiaSemana.QUINTA;
            case FRIDAY -> DiaSemana.SEXTA;
            case SATURDAY -> DiaSemana.SABADO;
            case SUNDAY -> DiaSemana.DOMINGO;
        };
    }

    /**
     * Create system notification + send email after appointment creation.
     */
    private void enviarNotificacoesSistemaConfirmacao(Agendamento agendamento) {
        try {
            // O agendamento acabou de ser criado com status PENDENTE: notifica o
            // cliente pedindo confirmação, e não que já está confirmado.
            notificacaoService.notificarClienteAgendamentoPendente(agendamento);
        } catch (Exception e) {
            log.error("Erro ao criar notificação de confirmação: {}", e.getMessage(), e);
        }

        try {
            Cliente cliente = agendamento.getCliente();
            if (cliente == null || cliente.getUsuario() == null || cliente.getUsuario().getEmail() == null) return;

            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

            String nomeCliente = cliente.getUsuario().getNome() != null ? cliente.getUsuario().getNome() : "Cliente";
            String data = agendamento.getDataHora().format(dateFmt);
            String hora = agendamento.getDataHora().format(timeFmt);
            String servico = resolverNomeServico(agendamento);
            String profissional = agendamento.getProfissional() != null && agendamento.getProfissional().getUsuario() != null
                    ? agendamento.getProfissional().getUsuario().getNome() : "Profissional";
            String link = frontendUrl + "/confirmar-agendamento/" + agendamento.getTokenConfirmacao();

            emailService.sendAppointmentConfirmationEmail(
                    cliente.getUsuario().getEmail(), nomeCliente, data, hora, servico, profissional, link);
        } catch (Exception e) {
            log.error("Erro ao enviar email de confirmação: {}", e.getMessage(), e);
        }
    }

    /**
     * Create system notification + send email after appointment cancellation.
     *
     * @param operador Who cancelled it (null for the public token/link flow). Excluded from the
     *                 team notification below, and used to word it correctly — "cliente cancelou"
     *                 vs. "equipe cancelou" — instead of always blaming the client regardless of
     *                 who actually cancelled.
     */
    private void enviarNotificacoesSistemaCancelamento(Agendamento agendamento, String motivo, Usuario operador) {
        try {
            notificacaoService.notificarAgendamentoCancelado(agendamento);
        } catch (Exception e) {
            log.error("Erro ao criar notificação de cancelamento: {}", e.getMessage(), e);
        }

        try {
            boolean canceladoPeloCliente = operador == null || operador.getRole() == Role.CLIENTE;
            String acao = canceladoPeloCliente ? "foi cancelado pelo cliente" : "foi cancelado";
            notificacaoService.notificarEquipeMudancaStatusAgendamento(
                    agendamento, operador, TipoNotificacao.AGENDAMENTO_CANCELADO,
                    "Agendamento Cancelado",
                    mensagemEquipe(agendamento, acao));
        } catch (Exception e) {
            log.error("Erro ao notificar equipe sobre cancelamento: {}", e.getMessage(), e);
        }

        try {
            Cliente cliente = agendamento.getCliente();
            if (cliente == null || cliente.getUsuario() == null || cliente.getUsuario().getEmail() == null) return;

            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

            String nomeCliente = cliente.getUsuario().getNome() != null ? cliente.getUsuario().getNome() : "Cliente";
            String data = agendamento.getDataHora().format(dateFmt);
            String hora = agendamento.getDataHora().format(timeFmt);
            String servico = resolverNomeServico(agendamento);
            String linkReagendar = frontendUrl + "/agendar/" + agendamento.getSalon().getId();

            emailService.sendAppointmentCancelledEmail(
                    cliente.getUsuario().getEmail(), nomeCliente, data, hora, servico, motivo, linkReagendar);
        } catch (Exception e) {
            log.error("Erro ao enviar email de cancelamento: {}", e.getMessage(), e);
        }
    }

    /**
     * Create system notification + send WhatsApp + email after rescheduling.
     */
    private void enviarNotificacoesReagendamento(Agendamento agendamento) {
        try {
            notificacaoService.notificarAgendamentoReagendado(agendamento);
        } catch (Exception e) {
            log.error("Erro ao criar notificação de reagendamento: {}", e.getMessage(), e);
        }

        try {
            Cliente cliente = agendamento.getCliente();
            if (cliente == null || cliente.getUsuario() == null) return;

            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

            String nomeCliente = cliente.getUsuario().getNome() != null ? cliente.getUsuario().getNome() : "Cliente";
            String novaData = agendamento.getDataHora().format(dateFmt);
            String novaHora = agendamento.getDataHora().format(timeFmt);
            String servico = resolverNomeServico(agendamento);

            // WhatsApp (se tem telefone)
            if (cliente.getUsuario().getTelefone() != null) {
                String linkConfirmacao = frontendUrl + "/confirmar-agendamento/" + agendamento.getTokenConfirmacao();
                whatsAppService.enviarLembrete24h(
                        cliente.getUsuario().getTelefone(), nomeCliente, novaData, novaHora, servico, linkConfirmacao);
            }

            // Email (se tem email)
            if (cliente.getUsuario().getEmail() != null) {
                emailService.sendAppointmentRescheduledEmail(
                        cliente.getUsuario().getEmail(), nomeCliente, novaData, novaHora, servico);
            }
        } catch (Exception e) {
            log.error("Erro ao enviar notificações de reagendamento: {}", e.getMessage(), e);
        }
    }

    /**
     * Resolve the display name for the appointment's service(s).
     */
    @SuppressWarnings("deprecation")
    private String resolverNomeServico(Agendamento agendamento) {
        if (agendamento.getServico() != null) {
            return agendamento.getServico().getNome();
        }
        if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
            return agendamento.getServicos().stream()
                    .map(as -> as.getServico().getNome())
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("Serviço");
        }
        return "Serviço";
    }

    /**
     * Builds the standard team-facing message for a status-change notification:
     * "O agendamento de {cliente} ({serviço}) para {data} às {hora} {acaoPassiva}."
     */
    private String mensagemEquipe(Agendamento agendamento, String acaoPassiva) {
        String nomeCliente = agendamento.getCliente() != null && agendamento.getCliente().getUsuario() != null
                ? agendamento.getCliente().getUsuario().getNome() : "Cliente";
        String data = agendamento.getDataHora().toLocalDate()
                .format(DateTimeFormatter.ofPattern("dd/MM"));
        String hora = agendamento.getDataHora().toLocalTime()
                .format(DateTimeFormatter.ofPattern("HH:mm"));
        return String.format("O agendamento de %s (%s) para %s às %s %s.",
                nomeCliente, resolverNomeServico(agendamento), data, hora, acaoPassiva);
    }

    /**
     * Send WhatsApp confirmation notification to client after appointment creation.
     */
    @SuppressWarnings("deprecation")
    private void enviarNotificacaoConfirmacao(Agendamento agendamento) {
        try {
            Cliente cliente = agendamento.getCliente();
            if (cliente == null || cliente.getUsuario() == null || cliente.getUsuario().getTelefone() == null) {
                log.debug("Cliente sem telefone para notificação de confirmação - agendamento {}", agendamento.getId());
                return;
            }

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

            String nomeCliente = cliente.getUsuario().getNome() != null ? cliente.getUsuario().getNome() : "Cliente";
            String data = agendamento.getDataHora().format(dateFormatter);
            String hora = agendamento.getDataHora().format(timeFormatter);

            // Get service name (from single service or first service in list)
            String servico = "Serviço";
            if (agendamento.getServico() != null) {
                servico = agendamento.getServico().getNome();
            } else if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
                servico = agendamento.getServicos().stream()
                    .map(as -> as.getServico().getNome())
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("Serviço");
            }

            String profissional = "Profissional";
            if (agendamento.getProfissional() != null && agendamento.getProfissional().getUsuario() != null) {
                profissional = agendamento.getProfissional().getUsuario().getNome();
            }

            Salon salon = agendamento.getSalon();
            String endereco = salon.getEndereco() != null ? salon.getEndereco() : salon.getNome();

            String linkConfirmacao = frontendUrl + "/confirmar-agendamento/" + agendamento.getTokenConfirmacao();

            whatsAppService.enviarConfirmacaoAgendamento(
                cliente.getUsuario().getTelefone(),
                nomeCliente,
                data,
                hora,
                servico,
                profissional,
                endereco,
                linkConfirmacao
            );

            log.info("Notificação de confirmação enviada para agendamento {}", agendamento.getId());
        } catch (Exception e) {
            log.error("Erro ao enviar notificação de confirmação: {}", e.getMessage(), e);
            // Não propagar erro - agendamento já foi criado
        }
    }

    /**
     * Send WhatsApp post-appointment notification to client.
     */
    private void enviarNotificacaoPosAtendimento(Agendamento agendamento) {
        try {
            Cliente cliente = agendamento.getCliente();
            if (cliente == null || cliente.getUsuario() == null || cliente.getUsuario().getTelefone() == null) {
                log.warn("Cliente sem telefone para notificação pós-atendimento - agendamento {}", agendamento.getId());
                return;
            }

            String nomeCliente = cliente.getUsuario().getNome() != null ? cliente.getUsuario().getNome() : "Cliente";
            String linkAvaliacao = frontendUrl + "/avaliar/" + agendamento.getTokenConfirmacao();

            whatsAppService.enviarPosAtendimento(
                cliente.getUsuario().getTelefone(),
                nomeCliente,
                linkAvaliacao
            );

            log.info("Notificação pós-atendimento enviada para agendamento {}", agendamento.getId());
        } catch (Exception e) {
            log.error("Erro ao enviar notificação pós-atendimento: {}", e.getMessage(), e);
            // Não propagar erro - conclusão já foi realizada
        }
    }

    /**
     * Send WhatsApp cancellation notification to client.
     */
    @SuppressWarnings("deprecation")
    private void enviarNotificacaoCancelamento(Agendamento agendamento, String motivo) {
        try {
            Cliente cliente = agendamento.getCliente();
            if (cliente == null || cliente.getUsuario() == null || cliente.getUsuario().getTelefone() == null) {
                log.warn("Cliente sem telefone para notificação de cancelamento - agendamento {}", agendamento.getId());
                return;
            }

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

            String nomeCliente = cliente.getUsuario().getNome() != null ? cliente.getUsuario().getNome() : "Cliente";
            String data = agendamento.getDataHora().format(dateFormatter);
            String hora = agendamento.getDataHora().format(timeFormatter);

            // Get service name (from single service or first service in list)
            String servico = "Serviço";
            if (agendamento.getServico() != null) {
                servico = agendamento.getServico().getNome();
            } else if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
                servico = agendamento.getServicos().get(0).getServico().getNome();
            }

            String linkReagendar = frontendUrl + "/agendar/" + agendamento.getSalon().getId();

            whatsAppService.enviarCancelamento(
                cliente.getUsuario().getTelefone(),
                nomeCliente,
                data,
                hora,
                servico,
                motivo,
                linkReagendar
            );

            log.info("Notificação de cancelamento enviada para agendamento {}", agendamento.getId());
        } catch (Exception e) {
            log.error("Erro ao enviar notificação de cancelamento: {}", e.getMessage(), e);
            // Não propagar erro - cancelamento já foi realizado
        }
    }
}
