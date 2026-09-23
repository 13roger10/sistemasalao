package com.belezza.api.service;

import com.belezza.api.dto.fidelidade.*;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.*;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class FidelidadeService {

    private final FidelidadeProgramaRepository programaRepository;
    private final FidelidadeClienteRepository fidelidadeClienteRepository;
    private final FidelidadeTransacaoRepository transacaoRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicoService servicoService;
    private final SalonService salonService;
    @Lazy
    private final NotificacaoService notificacaoService;

    // ==================== PROGRAMAS ====================

    @Transactional
    @SuppressWarnings("null")
    public FidelidadeProgramaResponse criarPrograma(FidelidadeProgramaRequest request, String emailAdmin) {
        log.info("Criando programa de fidelidade: {}", request.getNome());

        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);

        if (programaRepository.existsBySalonIdAndNome(salon.getId(), request.getNome().trim())) {
            throw new DuplicateResourceException("Programa de fidelidade", "nome", request.getNome());
        }

        Servico servicoRecompensa = null;
        if (request.getServicoRecompensaId() != null) {
            servicoRecompensa = servicoService.getServicoEntity(request.getServicoRecompensaId());
            if (!servicoRecompensa.getSalon().getId().equals(salon.getId())) {
                throw new BusinessException("Serviço de recompensa deve pertencer ao mesmo salão");
            }
        }

        validateRecompensa(request);

        FidelidadePrograma programa = FidelidadePrograma.builder()
                .salon(salon)
                .nome(request.getNome().trim())
                .descricao(request.getDescricao())
                .visitasNecessarias(request.getVisitasNecessarias())
                .recompensaTipo(request.getRecompensaTipo())
                .recompensaValor(request.getRecompensaValor())
                .servicoRecompensa(servicoRecompensa)
                .build();

        programa = programaRepository.save(programa);
        log.info("Programa de fidelidade criado: {}", programa.getId());

        return FidelidadeProgramaResponse.fromEntity(programa);
    }

    @Transactional
    public FidelidadeProgramaResponse atualizarPrograma(Long programaId, FidelidadeProgramaRequest request, String emailAdmin) {
        log.info("Atualizando programa de fidelidade: {}", programaId);

        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        FidelidadePrograma programa = programaRepository.findByIdAndSalonIdAndAtivoTrue(programaId, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Programa de fidelidade", programaId));

        Servico servicoRecompensa = null;
        if (request.getServicoRecompensaId() != null) {
            servicoRecompensa = servicoService.getServicoEntity(request.getServicoRecompensaId());
            if (!servicoRecompensa.getSalon().getId().equals(salon.getId())) {
                throw new BusinessException("Serviço de recompensa deve pertencer ao mesmo salão");
            }
        }

        validateRecompensa(request);

        programa.setNome(request.getNome().trim());
        programa.setDescricao(request.getDescricao());
        programa.setVisitasNecessarias(request.getVisitasNecessarias());
        programa.setRecompensaTipo(request.getRecompensaTipo());
        programa.setRecompensaValor(request.getRecompensaValor());
        programa.setServicoRecompensa(servicoRecompensa);

        programa = programaRepository.save(programa);
        log.info("Programa de fidelidade atualizado: {}", programa.getId());

        return FidelidadeProgramaResponse.fromEntity(programa);
    }

    @Transactional(readOnly = true)
    public List<FidelidadeProgramaResponse> listarProgramas(String emailAdmin) {
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        return programaRepository.findAllActiveBySalon(salon.getId()).stream()
                .map(FidelidadeProgramaResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public FidelidadeProgramaResponse buscarPrograma(Long programaId, String emailAdmin) {
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        FidelidadePrograma programa = programaRepository.findByIdAndSalonIdAndAtivoTrue(programaId, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Programa de fidelidade", programaId));
        return FidelidadeProgramaResponse.fromEntity(programa);
    }

    @Transactional
    public void desativarPrograma(Long programaId, String emailAdmin) {
        log.info("Desativando programa de fidelidade: {}", programaId);
        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);
        FidelidadePrograma programa = programaRepository.findByIdAndSalonIdAndAtivoTrue(programaId, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Programa de fidelidade", programaId));
        programa.setAtivo(false);
        programaRepository.save(programa);
        log.info("Programa de fidelidade desativado: {}", programaId);
    }

    // ==================== CLIENTES ====================

    @Transactional
    @SuppressWarnings("null")
    public FidelidadeClienteResponse inscreverCliente(Long clienteId, Long programaId, String emailAdmin) {
        log.info("Inscrevendo cliente {} no programa {}", clienteId, programaId);

        Salon salon = salonService.getSalonByAdminEmail(emailAdmin);

        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));

        if (!cliente.getSalon().getId().equals(salon.getId())) {
            throw new BusinessException("Cliente não pertence a este salão");
        }

        FidelidadePrograma programa = programaRepository.findByIdAndSalonIdAndAtivoTrue(programaId, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Programa de fidelidade", programaId));

        if (fidelidadeClienteRepository.existsByClienteIdAndProgramaId(clienteId, programaId)) {
            throw new DuplicateResourceException("Inscrição de fidelidade", "cliente/programa", clienteId + "/" + programaId);
        }

        FidelidadeCliente fidelidadeCliente = FidelidadeCliente.builder()
                .cliente(cliente)
                .programa(programa)
                .build();

        fidelidadeCliente = fidelidadeClienteRepository.save(fidelidadeCliente);
        log.info("Cliente inscrito no programa de fidelidade: {}", fidelidadeCliente.getId());

        return FidelidadeClienteResponse.fromEntity(fidelidadeCliente);
    }

    @Transactional
    public FidelidadeClienteResponse inscreverClienteAutomatico(Cliente cliente, Long programaId) {
        log.info("Inscrevendo cliente automaticamente {} no programa {}", cliente.getId(), programaId);

        FidelidadePrograma programa = programaRepository.findByIdAndAtivoTrue(programaId)
                .orElseThrow(() -> new ResourceNotFoundException("Programa de fidelidade", programaId));

        if (fidelidadeClienteRepository.existsByClienteIdAndProgramaId(cliente.getId(), programaId)) {
            // Cliente já inscrito, retorna a inscrição existente
            FidelidadeCliente existing = fidelidadeClienteRepository
                    .findByClienteIdAndProgramaId(cliente.getId(), programaId)
                    .orElseThrow();
            return FidelidadeClienteResponse.fromEntity(existing);
        }

        FidelidadeCliente fidelidadeCliente = FidelidadeCliente.builder()
                .cliente(cliente)
                .programa(programa)
                .build();

        fidelidadeCliente = fidelidadeClienteRepository.save(fidelidadeCliente);
        log.info("Cliente inscrito automaticamente: {}", fidelidadeCliente.getId());

        return FidelidadeClienteResponse.fromEntity(fidelidadeCliente);
    }

    @Transactional(readOnly = true)
    public List<FidelidadeClienteResponse> buscarFidelidadesCliente(Long clienteId) {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", clienteId));
        if (!cliente.getSalon().getId().equals(salonId)) {
            throw new BusinessException("Cliente não pertence a este salão");
        }
        return fidelidadeClienteRepository.findAllActiveByCliente(clienteId).stream()
                .map(FidelidadeClienteResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<FidelidadeClienteResponse> listarClientesPorSalon(String emailAdmin, Pageable pageable) {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        return fidelidadeClienteRepository.findAllBySalonId(salonId, pageable)
                .map(FidelidadeClienteResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<FidelidadeClienteResponse> listarClientesPorNivel(String emailAdmin, NivelFidelidade nivel) {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        return fidelidadeClienteRepository.findByNivelAndSalonId(salonId, nivel).stream()
                .map(FidelidadeClienteResponse::fromEntity)
                .toList();
    }

    // ==================== TRANSAÇÕES ====================

    @Transactional
    @SuppressWarnings("null")
    public FidelidadeTransacaoResponse registrarVisita(Long agendamentoId, Agendamento agendamento) {
        log.info("Registrando visita para agendamento: {}", agendamentoId);

        Cliente cliente = agendamento.getCliente();
        Long salonId = agendamento.getSalon().getId();

        // Buscar programas ativos do salão
        List<FidelidadePrograma> programas = programaRepository.findBySalonIdAndAtivoTrue(salonId);
        if (programas.isEmpty()) {
            log.debug("Salão {} não possui programas de fidelidade ativos", salonId);
            return null;
        }

        // Usar o primeiro programa ativo (ou implementar lógica de seleção)
        FidelidadePrograma programa = programas.get(0);

        // Buscar ou criar inscrição do cliente
        FidelidadeCliente fidelidadeCliente = fidelidadeClienteRepository
                .findByClienteIdAndProgramaId(cliente.getId(), programa.getId())
                .orElseGet(() -> {
                    FidelidadeCliente novo = FidelidadeCliente.builder()
                            .cliente(cliente)
                            .programa(programa)
                            .build();
                    return fidelidadeClienteRepository.save(novo);
                });

        // Guardar nível anterior para verificar se mudou
        NivelFidelidade nivelAnterior = fidelidadeCliente.getNivel();

        // Incrementar visita e verificar se ganhou crédito
        boolean ganhouCredito = fidelidadeCliente.incrementarVisita();
        fidelidadeCliente = fidelidadeClienteRepository.save(fidelidadeCliente);

        // Criar transação
        FidelidadeTransacao transacao = FidelidadeTransacao.criarVisita(fidelidadeCliente, agendamento, ganhouCredito);
        transacao = transacaoRepository.save(transacao);

        log.info("Visita registrada para cliente {} no programa {}. Ganhou crédito: {}",
                cliente.getId(), programa.getId(), ganhouCredito);

        // Notificar se ganhou crédito
        if (ganhouCredito) {
            try {
                notificacaoService.notificarCreditoFidelidade(cliente, programa.getNome());
            } catch (Exception e) {
                log.error("Erro ao notificar crédito de fidelidade: {}", e.getMessage());
            }
        }

        // Notificar se mudou de nível
        if (fidelidadeCliente.getNivel() != nivelAnterior) {
            try {
                notificacaoService.notificarNovoNivelFidelidade(cliente, fidelidadeCliente.getNivel());
            } catch (Exception e) {
                log.error("Erro ao notificar novo nível de fidelidade: {}", e.getMessage());
            }
        }

        return FidelidadeTransacaoResponse.fromEntity(transacao);
    }

    @Transactional
    @SuppressWarnings("null")
    public FidelidadeTransacaoResponse resgatarCredito(Long fidelidadeClienteId, Long agendamentoId, String emailAdmin) {
        log.info("Resgatando crédito para fidelidade cliente: {}", fidelidadeClienteId);

        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        FidelidadeCliente fidelidadeCliente = fidelidadeClienteRepository.findById(fidelidadeClienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Inscrição de fidelidade", fidelidadeClienteId));

        if (!fidelidadeCliente.getPrograma().getSalon().getId().equals(salonId)) {
            throw new BusinessException("Inscrição não pertence a este salão");
        }

        if (fidelidadeCliente.getCreditosDisponiveis() <= 0) {
            throw new BusinessException("Cliente não possui créditos disponíveis para resgate");
        }

        boolean resgatou = fidelidadeCliente.resgatarCredito();
        if (!resgatou) {
            throw new BusinessException("Não foi possível resgatar o crédito");
        }

        fidelidadeCliente = fidelidadeClienteRepository.save(fidelidadeCliente);

        // Criar transação de resgate
        Agendamento agendamento = null; // Pode ser nulo se não vinculado a agendamento
        String descricao = "Resgate de " + fidelidadeCliente.getPrograma().getRecompensaTipo().name()
                .toLowerCase().replace("_", " ");
        FidelidadeTransacao transacao = FidelidadeTransacao.criarResgate(fidelidadeCliente, agendamento, descricao);
        transacao = transacaoRepository.save(transacao);

        log.info("Crédito resgatado para cliente {} do programa {}",
                fidelidadeCliente.getCliente().getId(), fidelidadeCliente.getPrograma().getId());

        return FidelidadeTransacaoResponse.fromEntity(transacao);
    }

    @Transactional
    @SuppressWarnings("null")
    public FidelidadeTransacaoResponse adicionarBonus(Long fidelidadeClienteId, int creditos, String descricao, String emailAdmin) {
        log.info("Adicionando bônus de {} créditos para fidelidade cliente: {}", creditos, fidelidadeClienteId);

        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        FidelidadeCliente fidelidadeCliente = fidelidadeClienteRepository.findById(fidelidadeClienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Inscrição de fidelidade", fidelidadeClienteId));

        if (!fidelidadeCliente.getPrograma().getSalon().getId().equals(salonId)) {
            throw new BusinessException("Inscrição não pertence a este salão");
        }

        if (creditos <= 0) {
            throw new BusinessException("Quantidade de créditos deve ser maior que zero");
        }

        fidelidadeCliente.setCreditosDisponiveis(fidelidadeCliente.getCreditosDisponiveis() + creditos);
        fidelidadeCliente = fidelidadeClienteRepository.save(fidelidadeCliente);

        FidelidadeTransacao transacao = FidelidadeTransacao.criarBonus(fidelidadeCliente, creditos, descricao);
        transacao = transacaoRepository.save(transacao);

        log.info("Bônus adicionado para cliente {}", fidelidadeCliente.getCliente().getId());

        return FidelidadeTransacaoResponse.fromEntity(transacao);
    }

    // ==================== EXTRATO ====================

    /**
     * Enforces that a fidelidade enrollment belongs to the calling staff member's own salon.
     * Used only by the staff-facing extrato endpoint — the client's own /me/extrato path
     * never calls this, because it always resolves the fidelidadeClienteId from the caller's
     * own enrollments first (getMinhaFidelidade), so it can never point at someone else's.
     */
    @Transactional(readOnly = true)
    public void assertExtratoAcessivelPorEquipe(Long fidelidadeClienteId) {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();
        FidelidadeCliente fidelidadeCliente = fidelidadeClienteRepository.findById(fidelidadeClienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Inscrição de fidelidade", fidelidadeClienteId));
        if (!fidelidadeCliente.getPrograma().getSalon().getId().equals(salonId)) {
            throw new BusinessException("Inscrição não pertence a este salão");
        }
    }

    @Transactional(readOnly = true)
    public ExtratoFidelidadeResponse getExtrato(Long fidelidadeClienteId, LocalDateTime inicio, LocalDateTime fim) {
        FidelidadeCliente fidelidadeCliente = fidelidadeClienteRepository.findById(fidelidadeClienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Inscrição de fidelidade", fidelidadeClienteId));

        List<FidelidadeTransacao> transacoes;
        if (inicio != null && fim != null) {
            transacoes = transacaoRepository.findByFidelidadeClienteIdAndPeriod(fidelidadeClienteId, inicio, fim);
        } else {
            transacoes = transacaoRepository.findByFidelidadeClienteIdOrderByCriadoEmDesc(fidelidadeClienteId);
        }

        List<FidelidadeTransacaoResponse> transacoesResponse = transacoes.stream()
                .map(FidelidadeTransacaoResponse::fromEntity)
                .toList();

        // Calcular resumo
        int totalVisitas = transacoes.stream()
                .filter(t -> t.getTipo() == TipoTransacaoFidelidade.VISITA)
                .mapToInt(FidelidadeTransacao::getVisitas)
                .sum();

        int creditosGanhos = transacoes.stream()
                .filter(t -> t.getCreditos() > 0)
                .mapToInt(FidelidadeTransacao::getCreditos)
                .sum();

        int creditosResgatados = transacoes.stream()
                .filter(t -> t.getCreditos() < 0)
                .mapToInt(t -> Math.abs(t.getCreditos()))
                .sum();

        int pontosGanhos = transacoes.stream()
                .filter(t -> t.getTipo() == TipoTransacaoFidelidade.VISITA)
                .mapToInt(FidelidadeTransacao::getVisitas)
                .sum();

        ExtratoFidelidadeResponse.ResumoExtratoDTO resumo = ExtratoFidelidadeResponse.ResumoExtratoDTO.builder()
                .totalVisitasPeriodo(totalVisitas)
                .totalCreditosGanhos(creditosGanhos)
                .totalCreditosResgatados(creditosResgatados)
                .saldoCreditos(fidelidadeCliente.getCreditosDisponiveis())
                .pontosGanhos(pontosGanhos)
                .build();

        return ExtratoFidelidadeResponse.builder()
                .fidelidadeCliente(FidelidadeClienteResponse.fromEntity(fidelidadeCliente))
                .transacoes(transacoesResponse)
                .resumo(resumo)
                .build();
    }

    // ==================== RESUMO/DASHBOARD ====================

    @Transactional(readOnly = true)
    public FidelidadeResumoResponse getResumo(String emailAdmin) {
        Long salonId = salonService.getSalonIdDoUsuarioLogado();

        List<Object[]> distribuicao = fidelidadeClienteRepository.countByNivelBySalonId(salonId);
        Map<NivelFidelidade, Long> distribuicaoPorNivel = new EnumMap<>(NivelFidelidade.class);
        long totalBronze = 0, totalPrata = 0, totalOuro = 0;

        for (Object[] row : distribuicao) {
            NivelFidelidade nivel = (NivelFidelidade) row[0];
            Long count = (Long) row[1];
            distribuicaoPorNivel.put(nivel, count);
            switch (nivel) {
                case BRONZE -> totalBronze = count;
                case PRATA -> totalPrata = count;
                case OURO -> totalOuro = count;
            }
        }

        long totalClientes = totalBronze + totalPrata + totalOuro;

        // Buscar clientes com créditos
        List<FidelidadeCliente> comCreditos = fidelidadeClienteRepository.findWithCreditosDisponiveis(salonId);
        long totalCreditos = comCreditos.stream()
                .mapToLong(FidelidadeCliente::getCreditosDisponiveis)
                .sum();

        // Top clientes por pontos
        List<FidelidadeCliente> topClientesList = fidelidadeClienteRepository
                .findTopClientesByPontos(salonId, PageRequest.of(0, 10));
        List<FidelidadeClienteResponse> topClientes = topClientesList.stream()
                .map(FidelidadeClienteResponse::fromEntity)
                .toList();

        // Total de resgates e visitas (sumando de todos os clientes)
        long totalResgates = topClientesList.stream()
                .mapToLong(FidelidadeCliente::getTotalResgates)
                .sum();
        long totalVisitas = topClientesList.stream()
                .mapToLong(FidelidadeCliente::getTotalVisitas)
                .sum();

        return FidelidadeResumoResponse.builder()
                .totalClientesInscritos(totalClientes)
                .totalClientesBronze(totalBronze)
                .totalClientesPrata(totalPrata)
                .totalClientesOuro(totalOuro)
                .totalCreditosDisponiveis(totalCreditos)
                .totalResgatesRealizados(totalResgates)
                .totalVisitasRegistradas(totalVisitas)
                .topClientes(topClientes)
                .distribuicaoPorNivel(distribuicaoPorNivel)
                .build();
    }

    // ==================== ENDPOINTS DO CLIENTE AUTENTICADO ====================

    /**
     * Retorna todas as inscricoes de fidelidade do cliente autenticado (por email).
     */
    @Transactional(readOnly = true)
    public List<FidelidadeClienteResponse> getMinhaFidelidade(String email) {
        return usuarioRepository.findByEmailAndAtivoTrue(email)
                .map(u -> clienteRepository.findByUsuarioId(u.getId()))
                .orElse(List.of())
                .stream()
                .flatMap(c -> fidelidadeClienteRepository.findAllActiveByCliente(c.getId()).stream())
                .map(FidelidadeClienteResponse::fromEntity)
                .toList();
    }

    /**
     * Retorna o extrato de fidelidade do cliente autenticado.
     * Se o cliente tiver multiplas inscricoes, retorna a de maior nivel/pontos.
     */
    @Transactional(readOnly = true)
    public ExtratoFidelidadeResponse getMeusExtratos(String email) {
        List<FidelidadeClienteResponse> fidelidades = getMinhaFidelidade(email);
        if (fidelidades.isEmpty()) {
            return ExtratoFidelidadeResponse.builder()
                    .transacoes(List.of())
                    .resumo(ExtratoFidelidadeResponse.ResumoExtratoDTO.builder()
                            .totalVisitasPeriodo(0)
                            .totalCreditosGanhos(0)
                            .totalCreditosResgatados(0)
                            .saldoCreditos(0)
                            .pontosGanhos(0)
                            .build())
                    .build();
        }
        return getExtrato(fidelidades.get(0).getId(), null, null);
    }

    /**
     * Cliente resgata um credito de servico gratis para si mesmo.
     */
    @Transactional
    public FidelidadeTransacaoResponse clienteResgatarCredito(String email) {
        log.info("Cliente {} resgatando credito proprio", email);

        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        List<Cliente> clientes = clienteRepository.findByUsuarioId(usuario.getId());
        if (clientes.isEmpty()) {
            throw new BusinessException("Você não está cadastrado como cliente em nenhum salão");
        }

        FidelidadeCliente fidelidadeCliente = clientes.stream()
                .flatMap(c -> fidelidadeClienteRepository.findAllActiveByCliente(c.getId()).stream())
                .filter(fc -> fc.getCreditosDisponiveis() > 0)
                .findFirst()
                .orElseThrow(() -> new BusinessException("Você não possui créditos disponíveis para resgate"));

        boolean resgatou = fidelidadeCliente.resgatarCredito();
        if (!resgatou) {
            throw new BusinessException("Não foi possível resgatar o crédito");
        }
        fidelidadeCliente = fidelidadeClienteRepository.save(fidelidadeCliente);

        String descricao = "Resgate de serviço grátis - " + fidelidadeCliente.getPrograma().getNome();
        FidelidadeTransacao transacao = FidelidadeTransacao.criarResgate(fidelidadeCliente, null, descricao);
        transacao = transacaoRepository.save(transacao);

        log.info("Cliente {} resgatou credito no programa {}", email, fidelidadeCliente.getPrograma().getNome());
        return FidelidadeTransacaoResponse.fromEntity(transacao);
    }

    // ==================== HELPERS ====================

    private void validateRecompensa(FidelidadeProgramaRequest request) {
        switch (request.getRecompensaTipo()) {
            case SERVICO_GRATIS -> {
                if (request.getServicoRecompensaId() == null) {
                    throw new BusinessException("Serviço de recompensa é obrigatório para tipo SERVICO_GRATIS");
                }
            }
            case DESCONTO_PERCENTUAL -> {
                if (request.getRecompensaValor() == null) {
                    throw new BusinessException("Valor do desconto é obrigatório para tipo DESCONTO_PERCENTUAL");
                }
                if (request.getRecompensaValor().intValue() < 1 || request.getRecompensaValor().intValue() > 100) {
                    throw new BusinessException("Desconto percentual deve estar entre 1% e 100%");
                }
            }
            case DESCONTO_VALOR -> {
                if (request.getRecompensaValor() == null) {
                    throw new BusinessException("Valor do desconto é obrigatório para tipo DESCONTO_VALOR");
                }
            }
        }
    }
}
