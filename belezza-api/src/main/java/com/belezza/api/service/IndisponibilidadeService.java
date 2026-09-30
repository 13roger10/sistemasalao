package com.belezza.api.service;

import com.belezza.api.dto.agendamento.AgendamentoAfetadoResponse;
import com.belezza.api.dto.agendamento.CancelamentoRequest;
import com.belezza.api.dto.horario.BloqueioHorarioRequest;
import com.belezza.api.dto.horario.BloqueioHorarioResponse;
import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.AgendamentosAfetadosException;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.AgendamentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ausência do profissional e desativação de profissional ou serviço com agendamentos marcados
 * (BUG-033). Antes tudo era aceito em silêncio e os clientes continuavam agendados com quem não ia
 * atender. Agora, havendo agendamentos atingidos, a ação volta 409 com a lista e só segue com a
 * escolha da equipe:
 * <ul>
 *   <li>{@code acao=cancelar}: cancela esses agendamentos e avisa os clientes (WhatsApp, e-mail e
 *       notificação — o mesmo aviso do cancelamento feito pela equipe);</li>
 *   <li>{@code acao=manter}: mantém os agendamentos para a equipe remanejar um a um.</li>
 * </ul>
 * A ação é gravada antes de conferir os afetados, para valer toda a validação dela primeiro; sem a
 * escolha, a exceção desfaz a transação e nada muda.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IndisponibilidadeService {

    private final AgendamentoRepository agendamentoRepository;
    private final AgendamentoService agendamentoService;
    private final BloqueioHorarioService bloqueioHorarioService;
    private final ProfissionalService profissionalService;
    private final ServicoService servicoService;

    @Transactional
    public BloqueioHorarioResponse bloquear(Long profissionalId, BloqueioHorarioRequest request, String acao, Usuario operador) {
        BloqueioHorarioResponse bloqueio = bloqueioHorarioService.criar(profissionalId, request);
        resolver(agendamentoRepository.findAfetadosNoPeriodo(profissionalId, request.getDataInicio(), request.getDataFim(),
                        LocalDateTime.now()), acao,
                "Há %d agendamento(s) marcado(s) neste período. Escolha cancelar e avisar os clientes ou manter para remanejar.",
                "O profissional não poderá atender neste horário. Entre em contato com o salão para reagendar.", operador);
        return bloqueio;
    }

    @Transactional
    public void desativarProfissional(Long profissionalId, String acao, Usuario operador) {
        profissionalService.desativar(profissionalId, operador.getEmail());
        resolver(agendamentoRepository.findAfetadosDoProfissional(profissionalId, LocalDateTime.now()), acao,
                "O profissional tem %d agendamento(s) marcado(s). Escolha cancelar e avisar os clientes ou manter para remanejar.",
                "O profissional não atende mais no salão. Entre em contato com o salão para reagendar.", operador);
    }

    @Transactional
    public void desativarServico(Long servicoId, String acao, Usuario operador) {
        servicoService.desativar(servicoId, operador.getEmail());
        resolver(agendamentoRepository.findAfetadosDoServico(servicoId, LocalDateTime.now()), acao,
                "O serviço tem %d agendamento(s) marcado(s). Escolha cancelar e avisar os clientes ou manter para remanejar.",
                "O serviço agendado não é mais oferecido. Entre em contato com o salão para reagendar.", operador);
    }

    private void resolver(List<Agendamento> afetados, String acao, String pergunta, String motivoAoCliente, Usuario operador) {
        if (afetados.isEmpty()) {
            return;
        }
        if (acao == null || acao.isBlank()) {
            throw new AgendamentosAfetadosException(String.format(pergunta, afetados.size()),
                    afetados.stream().map(AgendamentoAfetadoResponse::fromEntity).toList());
        }
        switch (acao.trim().toLowerCase()) {
            case "cancelar" -> {
                for (Agendamento agendamento : afetados) {
                    agendamentoService.cancelar(agendamento.getId(), new CancelamentoRequest(motivoAoCliente),
                            false, false, operador);
                }
                log.info("{} agendamento(s) cancelado(s) e clientes avisados por {} (id={})",
                        afetados.size(), operador.getNome(), operador.getId());
            }
            case "manter" -> log.info("{} agendamento(s) mantido(s) para remanejar: {}", afetados.size(),
                    afetados.stream().map(Agendamento::getId).toList());
            default -> throw new BusinessException("Ação inválida: use acao=cancelar ou acao=manter");
        }
    }
}
