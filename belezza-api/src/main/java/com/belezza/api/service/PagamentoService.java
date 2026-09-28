package com.belezza.api.service;

import com.belezza.api.dto.pagamento.PagamentoRequest;
import com.belezza.api.dto.pagamento.PagamentoResponse;
import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Caixa;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.FormaPagamento;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.entity.StatusPagamento;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.belezza.api.security.annotation.Auditable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class PagamentoService {

    private final PagamentoRepository pagamentoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;
    private final CaixaService caixaService;
    private final ComissaoService comissaoService;

    private static final java.util.Locale PT_BR = java.util.Locale.forLanguageTag("pt-BR");

    @Transactional
    @Auditable(action = "CREATE", entityType = "Pagamento", captureNewState = true)
    public PagamentoResponse registrar(PagamentoRequest request, Usuario operador) {
        Agendamento agendamento = agendamentoRepository.findById(request.getAgendamentoId())
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", request.getAgendamentoId()));

        // SEC-011: só registra pagamento de atendimento do próprio estabelecimento — sem isto,
        // qualquer membro da equipe lançava pagamento no caixa de outro salão pelo agendamentoId.
        assertTenant(agendamento.getSalon() != null ? agendamento.getSalon().getId() : null);
        assertAtendimentoDoProfissional(agendamento, operador);

        if (agendamento.getStatus() != StatusAgendamento.CONCLUIDO &&
            agendamento.getStatus() != StatusAgendamento.EM_ANDAMENTO) {
            throw new BusinessException("Pagamento só pode ser registrado para agendamentos concluídos ou em andamento");
        }

        // Trava o atendimento: pagamentos simultâneos (duplo clique) conferem o saldo um de cada vez
        agendamentoRepository.lockAgendamento(agendamento.getId());

        BigDecimal total = valorDoAtendimento(agendamento);
        BigDecimal jaPago = pagamentoRepository.sumAprovadoByAgendamentoId(agendamento.getId());
        BigDecimal aPagar = total.subtract(jaPago);
        if (aPagar.signum() <= 0) {
            throw new BusinessException("Este atendimento já está pago");
        }

        List<PagamentoRequest.Parte> partes = normalizarPartes(request, aPagar);
        BigDecimal soma = partes.stream().map(PagamentoRequest.Parte::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (soma.compareTo(aPagar) != 0) {
            throw new BusinessException(String.format(PT_BR,
                    "O valor informado (R$ %.2f) é diferente do valor a pagar (R$ %.2f)%s",
                    soma, aPagar, soma.compareTo(aPagar) < 0
                            ? ". Para pagar em mais de uma forma, use o pagamento dividido."
                            : ". Em dinheiro, informe o valor recebido para calcular o troco."));
        }

        // Todo pagamento entra no caixa aberto do salão; sem caixa aberto não há pagamento.
        Caixa caixa = caixaService.exigirAberto(agendamento.getSalon().getId());

        LocalDateTime agora = LocalDateTime.now();
        List<Pagamento> gravados = new ArrayList<>();
        for (PagamentoRequest.Parte parte : partes) {
            BigDecimal troco = parte.getValorRecebido() != null ? parte.getValorRecebido().subtract(parte.getValor()) : null;
            gravados.add(pagamentoRepository.save(Pagamento.builder()
                    .agendamento(agendamento)
                    .salon(agendamento.getSalon())
                    .caixa(caixa)
                    .valor(parte.getValor())
                    .forma(parte.getForma())
                    .valorRecebido(parte.getValorRecebido())
                    .troco(troco)
                    .status(StatusPagamento.APROVADO)
                    .processadoEm(agora)
                    .registradoPorId(operador.getId())
                    .registradoPorNome(operador.getNome())
                    .build()));
        }
        log.info("Pagamento do agendamento {} registrado em {} parte(s), total {}, por {} (id={})",
                agendamento.getId(), gravados.size(), soma, operador.getNome(), operador.getId());

        atualizarEstatisticasCliente(agendamento.getCliente(), soma);
        // Cobrança refeita depois de um estorno: o atendimento volta a estar pago por inteiro
        comissaoService.reativarAposPagamento(agendamento.getId());

        List<PagamentoResponse> respostas = gravados.stream().map(PagamentoResponse::fromEntity).toList();
        BigDecimal trocoTotal = gravados.stream().map(Pagamento::getTroco).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        // Instância própria para a resposta principal: se fosse um item da lista "partes",
        // a resposta conteria a si mesma e a serialização JSON entraria em loop.
        PagamentoResponse principal = PagamentoResponse.fromEntity(gravados.get(0));
        principal.setPartes(respostas);
        principal.setTotalAtendimento(total);
        principal.setTrocoTotal(trocoTotal);
        return principal;
    }

    /**
     * Partes do pagamento a partir da requisição. Pedido de uma forma só vira uma parte; em
     * dinheiro, um valor acima do que falta pagar é tratado como valor recebido (gera troco) —
     * é o que as telas atuais enviam quando o cliente entrega uma nota maior.
     */
    private List<PagamentoRequest.Parte> normalizarPartes(PagamentoRequest request, BigDecimal aPagar) {
        List<PagamentoRequest.Parte> partes;
        if (request.getPartes() != null && !request.getPartes().isEmpty()) {
            partes = request.getPartes();
        } else {
            if (request.getValor() == null || request.getForma() == null) {
                throw new BusinessException("Informe o valor e a forma de pagamento");
            }
            BigDecimal valor = request.getValor();
            BigDecimal recebido = request.getValorRecebido();
            if (request.getForma() == FormaPagamento.DINHEIRO && recebido == null && valor.compareTo(aPagar) > 0) {
                recebido = valor;
                valor = aPagar;
            }
            partes = List.of(PagamentoRequest.Parte.builder()
                    .forma(request.getForma()).valor(valor).valorRecebido(recebido).build());
        }

        for (PagamentoRequest.Parte parte : partes) {
            if (parte.getForma() == null || parte.getValor() == null || parte.getValor().signum() <= 0) {
                throw new BusinessException("Cada parte do pagamento precisa de forma e valor maior que zero");
            }
            if (parte.getValorRecebido() != null) {
                if (parte.getForma() != FormaPagamento.DINHEIRO) {
                    throw new BusinessException("Valor recebido e troco só se aplicam a pagamento em dinheiro");
                }
                if (parte.getValorRecebido().compareTo(parte.getValor()) < 0) {
                    throw new BusinessException(String.format(PT_BR,
                            "O valor recebido (R$ %.2f) é menor que o valor da parte em dinheiro (R$ %.2f)",
                            parte.getValorRecebido(), parte.getValor()));
                }
            }
        }
        return partes;
    }

    /** Valor do atendimento: o valor cobrado no agendamento ou, na falta dele, a soma dos serviços. */
    @SuppressWarnings("deprecation")
    private BigDecimal valorDoAtendimento(Agendamento agendamento) {
        if (agendamento.getValorCobrado() != null && agendamento.getValorCobrado().signum() > 0) {
            return agendamento.getValorCobrado();
        }
        if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
            return agendamento.getServicos().stream()
                    .map(s -> s.getServico().getPreco())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        if (agendamento.getServico() != null) {
            return agendamento.getServico().getPreco();
        }
        throw new BusinessException("Não foi possível determinar o valor deste atendimento");
    }

    /**
     * Atualiza o total gasto, o ticket médio e as datas de visita do cliente
     * sempre que um pagamento é registrado, para que essas estatísticas
     * reflitam os pagamentos reais em vez de ficarem paradas em zero.
     */
    private void atualizarEstatisticasCliente(Cliente cliente, BigDecimal valorPago) {
        LocalDateTime agora = LocalDateTime.now();

        cliente.setTotalGasto(cliente.getTotalGasto().add(valorPago));
        if (cliente.getPrimeiraVisita() == null) {
            cliente.setPrimeiraVisita(agora);
        }
        cliente.setUltimaVisita(agora);

        if (cliente.getTotalAgendamentos() > 0) {
            cliente.setTicketMedio(
                    cliente.getTotalGasto().divide(
                            BigDecimal.valueOf(cliente.getTotalAgendamentos()), 2, RoundingMode.HALF_UP));
        }

        clienteRepository.save(cliente);
    }

    /**
     * SEC-011: garante que o solicitante só acessa pagamentos do próprio estabelecimento.
     * Usa o salonId do JWT (TenantContext); exige que exista e coincida com o salão do recurso.
     */
    private void assertTenant(Long salonId) {
        Long tenant = TenantContext.getCurrentTenant();
        if (tenant == null || salonId == null || !tenant.equals(salonId)) {
            throw new AccessDeniedException("Acesso negado: recurso pertence a outro estabelecimento");
        }
    }

    /** PROFISSIONAL só registra e consulta pagamentos dos próprios atendimentos. */
    private void assertAtendimentoDoProfissional(Agendamento agendamento, Usuario operador) {
        if (operador == null || operador.getRole() != Role.PROFISSIONAL) {
            return;
        }
        if (agendamento == null || agendamento.getProfissional() == null
                || agendamento.getProfissional().getUsuario() == null
                || !agendamento.getProfissional().getUsuario().getId().equals(operador.getId())) {
            throw new AccessDeniedException("Acesso negado: atendimento de outro profissional");
        }
    }

    @Transactional(readOnly = true)
    public PagamentoResponse buscarPorAgendamento(Long agendamentoId) {
        return buscarPorAgendamento(agendamentoId, null);
    }

    @Transactional(readOnly = true)
    public PagamentoResponse buscarPorAgendamento(Long agendamentoId, Usuario operador) {
        List<Pagamento> partes = pagamentoRepository.findByAgendamentoIdOrderByCriadoEmAsc(agendamentoId);
        if (partes.isEmpty()) {
            throw new ResourceNotFoundException("Pagamento", "agendamento", agendamentoId.toString());
        }
        // SEC-011: bloqueia leitura de pagamento de outro estabelecimento por IDOR no agendamentoId.
        Pagamento ultimo = partes.get(partes.size() - 1);
        assertTenant(ultimo.getSalon() != null ? ultimo.getSalon().getId() : null);
        assertAtendimentoDoProfissional(ultimo.getAgendamento(), operador);
        PagamentoResponse resposta = PagamentoResponse.fromEntity(ultimo);
        resposta.setPartes(partes.stream().map(PagamentoResponse::fromEntity).toList());
        return resposta;
    }

    /**
     * Lista pagamentos do salão.
     * RECEPCIONISTA: somente os pagamentos que ela mesma registrou.
     * PROFISSIONAL: somente os pagamentos dos próprios atendimentos.
     * ADMIN: todos os pagamentos do salão.
     */
    @Transactional(readOnly = true)
    public Page<PagamentoResponse> listarPorSalon(Long salonId, Pageable pageable, Usuario solicitante) {
        assertTenant(salonId); // SEC-011: isolamento entre estabelecimentos
        if (solicitante.getRole() == Role.RECEPCIONISTA) {
            return pagamentoRepository
                    .findBySalonIdAndRegistradoPorId(salonId, solicitante.getId(), pageable)
                    .map(PagamentoResponse::fromEntity);
        }
        if (solicitante.getRole() == Role.PROFISSIONAL) {
            return pagamentoRepository
                    .findBySalonIdAndAgendamentoProfissionalUsuarioId(salonId, solicitante.getId(), pageable)
                    .map(PagamentoResponse::fromEntity);
        }
        return pagamentoRepository.findBySalonId(salonId, pageable)
                .map(PagamentoResponse::fromEntity);
    }

    @Transactional
    public PagamentoResponse estornar(Long pagamentoId) {
        return estornar(pagamentoId, null);
    }

    @Transactional
    public PagamentoResponse estornar(Long pagamentoId, Usuario operador) {
        Pagamento pagamento = pagamentoRepository.findById(pagamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", pagamentoId));

        // Estorno devolve dinheiro do caixa: só o admin do salão decide (o controller já exige
        // ADMIN; a checagem aqui cobre qualquer outro chamador do service)
        if (operador != null && operador.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Acesso negado: somente o administrador pode estornar pagamentos");
        }
        // SEC-011: bloqueia estorno de pagamento de outro estabelecimento por IDOR no pagamentoId.
        assertTenant(pagamento.getSalon() != null ? pagamento.getSalon().getId() : null);

        if (pagamento.getStatus() != StatusPagamento.APROVADO) {
            throw new BusinessException("Apenas pagamentos aprovados podem ser estornados");
        }

        // Atendimento deixa de estar pago por inteiro: a comissão deixa de ser devida (comissão já
        // repassada ao profissional bloqueia o estorno). Vem antes do caixa para nada ser gravado.
        Agendamento agendamento = pagamento.getAgendamento();
        if (agendamento != null) {
            BigDecimal pagoDepois = pagamentoRepository.sumAprovadoByAgendamentoId(agendamento.getId())
                    .subtract(pagamento.getValor());
            if (pagoDepois.compareTo(valorDoAtendimento(agendamento)) < 0) {
                comissaoService.cancelarPorEstorno(agendamento.getId());
            }
        }

        // Pagamento de caixa já fechado: a devolução sai do caixa aberto (exige caixa aberto)
        caixaService.registrarEstorno(pagamento, operador);

        pagamento.setStatus(StatusPagamento.ESTORNADO);
        pagamento = pagamentoRepository.save(pagamento);
        log.info("Pagamento estornado: {}", pagamentoId);

        if (agendamento != null) {
            reverterEstatisticasCliente(agendamento.getCliente(), pagamento.getValor());
        }

        return PagamentoResponse.fromEntity(pagamento);
    }

    /** Desfaz no total gasto (e no ticket médio) do cliente o valor estornado. */
    private void reverterEstatisticasCliente(Cliente cliente, BigDecimal valorEstornado) {
        if (cliente == null || cliente.getTotalGasto() == null) {
            return;
        }
        cliente.setTotalGasto(cliente.getTotalGasto().subtract(valorEstornado).max(BigDecimal.ZERO));
        if (cliente.getTotalAgendamentos() > 0) {
            cliente.setTicketMedio(
                    cliente.getTotalGasto().divide(
                            BigDecimal.valueOf(cliente.getTotalAgendamentos()), 2, RoundingMode.HALF_UP));
        }
        clienteRepository.save(cliente);
    }
}
