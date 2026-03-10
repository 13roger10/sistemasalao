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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final SalonService salonService;
    private final ProfissionalService profissionalService;
    private final ServicoService servicoService;
    private final ClienteService clienteService;
    private final BloqueioHorarioService bloqueioHorarioService;
    private final WhatsAppService whatsAppService;
    private final ComissaoService comissaoService;
    @Lazy
    private final FidelidadeService fidelidadeService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Transactional
    @Auditable(action = "CREATE", entityType = "Agendamento", captureNewState = true)
    public AgendamentoResponse criar(AgendamentoRequest request, String emailCliente) {
        log.info("Criando agendamento para cliente: {}", emailCliente);

        // Validate request
        if (!request.isValid()) {
            throw new BusinessException(request.getValidationError());
        }

        Profissional profissional = profissionalService.getProfissionalEntity(request.getProfissionalId());
        Salon salon = profissional.getSalon();

        // Get or create client for this salon
        Cliente cliente = clienteService.getOrCreateCliente(salon.getId(), emailCliente);

        // Check if multiple services or single service
        if (request.hasMultipleServices()) {
            return criarComMultiplosServicos(request, emailCliente, profissional, salon, cliente);
        } else {
            return criarComServicoUnico(request, emailCliente, profissional, salon, cliente);
        }
    }

    /**
     * Create appointment with single service (legacy approach).
     */
    private AgendamentoResponse criarComServicoUnico(AgendamentoRequest request, String emailCliente,
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
                .valorCobrado(servico.getPreco())
                .tokenConfirmacao(UUID.randomUUID().toString())
                .build();

        agendamento = agendamentoRepository.save(agendamento);

        // Increment client appointment count
        clienteRepository.incrementTotalAgendamentos(cliente.getId());

        log.info("Agendamento criado: {} para {} em {}", agendamento.getId(), emailCliente, request.getDataHora());

        // Enviar confirmação via WhatsApp
        enviarNotificacaoConfirmacao(agendamento);

        return AgendamentoResponse.fromEntity(agendamento);
    }

    /**
     * Create appointment with multiple services (new approach).
     */
    private AgendamentoResponse criarComMultiplosServicos(AgendamentoRequest request, String emailCliente,
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

        log.info("Agendamento com múltiplos serviços criado: {} para {} em {}",
            agendamento.getId(), emailCliente, request.getDataHora());

        // Enviar confirmação via WhatsApp
        enviarNotificacaoConfirmacao(agendamento);

        return AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional(readOnly = true)
    public AgendamentoResponse buscarPorId(Long id) {
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", id));
        return AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional(readOnly = true)
    public Page<AgendamentoResponse> listarPorSalon(Long salonId, Pageable pageable) {
        return agendamentoRepository.findBySalonId(salonId, pageable)
                .map(AgendamentoResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<AgendamentoResponse> listarPorCliente(Long clienteId, Pageable pageable) {
        return agendamentoRepository.findByClienteId(clienteId, pageable)
                .map(AgendamentoResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<AgendamentoResponse> listarPorProfissional(Long profissionalId, Pageable pageable) {
        return agendamentoRepository.findByProfissionalId(profissionalId, pageable)
                .map(AgendamentoResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponse> listarAgendaDiaria(Long profissionalId, LocalDateTime data) {
        LocalDateTime dayStart = data.toLocalDate().atStartOfDay();
        LocalDateTime dayEnd = dayStart.plusDays(1);

        return agendamentoRepository.findDailyByProfissional(profissionalId, dayStart, dayEnd).stream()
                .map(AgendamentoResponse::fromEntity)
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
        Agendamento agendamento = getAgendamento(id);

        if (agendamento.getStatus() != StatusAgendamento.PENDENTE) {
            throw new BusinessException("Apenas agendamentos pendentes podem ser confirmados");
        }

        agendamento.setStatus(StatusAgendamento.CONFIRMADO);
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento confirmado: {}", id);

        return AgendamentoResponse.fromEntity(agendamento);
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

        return AgendamentoResponse.fromEntity(agendamento);
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

        // Check minimum cancellation time
        Salon salon = agendamento.getSalon();
        LocalDateTime limiteCancel = agendamento.getDataHora().minusHours(salon.getCancelamentoMinimoHoras());
        if (LocalDateTime.now().isAfter(limiteCancel)) {
            throw new BusinessException("Cancelamento deve ser feito com pelo menos " +
                    salon.getCancelamentoMinimoHoras() + " horas de antecedência");
        }

        agendamento.setStatus(StatusAgendamento.CANCELADO);
        agendamento.setMotivoCancelamento(motivo != null ? motivo : "Cancelado pelo cliente via link");
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento cancelado por token: {} - Motivo: {}", agendamento.getId(), motivo);

        return AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional
    public AgendamentoResponse iniciar(Long id) {
        Agendamento agendamento = getAgendamento(id);

        if (agendamento.getStatus() != StatusAgendamento.CONFIRMADO) {
            throw new BusinessException("Apenas agendamentos confirmados podem ser iniciados");
        }

        agendamento.setStatus(StatusAgendamento.EM_ANDAMENTO);
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento iniciado: {}", id);

        return AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional
    @Auditable(action = "COMPLETE", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse concluir(Long id) {
        Agendamento agendamento = getAgendamento(id);

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

        return AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional
    @Auditable(action = "CANCEL", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse cancelar(Long id, CancelamentoRequest request) {
        Agendamento agendamento = getAgendamento(id);

        if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO ||
            agendamento.getStatus() == StatusAgendamento.CANCELADO ||
            agendamento.getStatus() == StatusAgendamento.NO_SHOW) {
            throw new BusinessException("Este agendamento não pode ser cancelado");
        }

        // Check minimum cancellation time
        Salon salon = agendamento.getSalon();
        LocalDateTime limiteCancel = agendamento.getDataHora().minusHours(salon.getCancelamentoMinimoHoras());
        if (LocalDateTime.now().isAfter(limiteCancel)) {
            throw new BusinessException("Cancelamento deve ser feito com pelo menos " +
                    salon.getCancelamentoMinimoHoras() + " horas de antecedência");
        }

        agendamento.setStatus(StatusAgendamento.CANCELADO);
        agendamento.setMotivoCancelamento(request.getMotivo());
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento cancelado: {} - Motivo: {}", id, request.getMotivo());

        // Enviar notificação WhatsApp de cancelamento
        enviarNotificacaoCancelamento(agendamento, request.getMotivo());

        return AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional
    @Auditable(action = "RESCHEDULE", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse reagendar(Long id, ReagendamentoRequest request) {
        Agendamento agendamento = getAgendamento(id);

        if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO ||
            agendamento.getStatus() == StatusAgendamento.CANCELADO ||
            agendamento.getStatus() == StatusAgendamento.NO_SHOW) {
            throw new BusinessException("Este agendamento não pode ser reagendado");
        }

        Profissional profissional = agendamento.getProfissional();
        if (request.getNovoProfissionalId() != null) {
            profissional = profissionalService.getProfissionalEntity(request.getNovoProfissionalId());
        }

        Servico servico = agendamento.getServico();
        Salon salon = agendamento.getSalon();
        Cliente cliente = agendamento.getCliente();

        // Validate new datetime
        validarAgendamento(salon, profissional, servico, cliente, request.getNovaDataHora());

        LocalDateTime novoFim = request.getNovaDataHora().plusMinutes(servico.getDuracaoMinutos());
        validarConflitos(profissional.getId(), request.getNovaDataHora(), novoFim);

        agendamento.setDataHora(request.getNovaDataHora());
        agendamento.setFimPrevisto(novoFim);
        agendamento.setProfissional(profissional);
        agendamento.setStatus(StatusAgendamento.PENDENTE);
        agendamento.setLembreteEnviado24h(false);
        agendamento.setLembreteEnviado2h(false);

        agendamento = agendamentoRepository.save(agendamento);
        log.info("Agendamento reagendado: {} para {}", id, request.getNovaDataHora());

        return AgendamentoResponse.fromEntity(agendamento);
    }

    @Transactional
    @Auditable(action = "NO_SHOW", entityType = "Agendamento", captureOldState = true, captureNewState = true)
    public AgendamentoResponse marcarNoShow(Long id) {
        Agendamento agendamento = getAgendamento(id);

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

        return AgendamentoResponse.fromEntity(agendamento);
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

        // 6. Minimum advance time
        LocalDateTime minDateTime = LocalDateTime.now().plusHours(salon.getAntecedenciaMinimaHoras());
        if (dataHora.isBefore(minDateTime)) {
            throw new BusinessException("Agendamento deve ser feito com pelo menos " +
                    salon.getAntecedenciaMinimaHoras() + " horas de antecedência");
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

            // Check if appointment overlaps with break
            if (horarioServico.isBefore(horario.getIntervaloFim()) &&
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
     * Send WhatsApp confirmation notification to client after appointment creation.
     */
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
