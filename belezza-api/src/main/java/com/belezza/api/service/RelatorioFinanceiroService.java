package com.belezza.api.service;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.FormaPagamento;
import com.belezza.api.entity.Meta;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.entity.StatusPagamento;
import com.belezza.api.entity.TipoMeta;
import com.belezza.api.entity.TipoMovimentacaoCaixa;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ComissaoRepository;
import com.belezza.api.repository.MetaRepository;
import com.belezza.api.repository.MovimentacaoCaixaRepository;
import com.belezza.api.repository.PagamentoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Números reais do financeiro (resumo, relatório mensal e diário). Antes o resumo e o relatório
 * mensal devolviam valores fixos de exemplo (R$ 45.750 no mês, R$ 1.850 no dia, serviços e
 * profissionais inventados). Todos os períodos são [início, fim): o fim não entra.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RelatorioFinanceiroService {

    private final PagamentoRepository pagamentoRepository;
    private final MovimentacaoCaixaRepository movimentacaoCaixaRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final ComissaoRepository comissaoRepository;
    private final MetaRepository metaRepository;

    /** Linha de ranking (serviço ou profissional): total recebido e atendimentos. */
    public record Ranking(Long id, String nome, BigDecimal total, int atendimentos) {}

    /**
     * Valor recebido no período, por forma, pela mesma regra do caixa: pagamentos do período
     * (incluindo os estornados depois a partir de outro caixa) + entradas avulsas − estornos
     * feitos no período.
     */
    public Map<FormaPagamento, BigDecimal> recebidoPorForma(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        Map<FormaPagamento, BigDecimal> totals = new EnumMap<>(FormaPagamento.class);
        for (Object[] row : pagamentoRepository.sumRecebidoByFormaAndPeriod(salonId, inicio, fim)) {
            totals.merge((FormaPagamento) row[0], (BigDecimal) row[1], BigDecimal::add);
        }
        for (Object[] row : movimentacaoCaixaRepository.sumByFormaAndPeriod(salonId, TipoMovimentacaoCaixa.RECEITA, inicio, fim)) {
            totals.merge((FormaPagamento) row[0], (BigDecimal) row[1], BigDecimal::add);
        }
        for (Object[] row : movimentacaoCaixaRepository.sumByFormaAndPeriod(salonId, TipoMovimentacaoCaixa.ESTORNO, inicio, fim)) {
            totals.merge((FormaPagamento) row[0], ((BigDecimal) row[1]).negate(), BigDecimal::add);
        }
        return totals;
    }

    public BigDecimal receita(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        return recebidoPorForma(salonId, inicio, fim).values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Despesas lançadas no caixa no período. */
    public BigDecimal despesas(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        BigDecimal total = movimentacaoCaixaRepository.sumBySalonAndTipoAndPeriod(salonId, TipoMovimentacaoCaixa.DESPESA, inicio, fim);
        return total != null ? total : BigDecimal.ZERO;
    }

    /** Despesas do período por categoria, da maior para a menor. */
    public Map<String, BigDecimal> despesasPorCategoria(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        List<Object[]> rows = movimentacaoCaixaRepository.sumByCategoriaAndPeriod(salonId, TipoMovimentacaoCaixa.DESPESA, inicio, fim);
        Map<String, BigDecimal> porCategoria = new LinkedHashMap<>();
        rows.stream()
                .sorted(Comparator.comparing((Object[] r) -> (BigDecimal) r[1]).reversed())
                .forEach(r -> porCategoria.merge(r[0] != null ? (String) r[0] : "other_expense", (BigDecimal) r[1], BigDecimal::add));
        return porCategoria;
    }

    /** Agendamentos do período (pelo horário marcado), por status. */
    public Map<StatusAgendamento, Long> agendamentosPorStatus(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        Map<StatusAgendamento, Long> porStatus = new EnumMap<>(StatusAgendamento.class);
        for (Object[] row : agendamentoRepository.countByStatusAndPeriod(salonId, inicio, fim.minusNanos(1))) {
            porStatus.merge((StatusAgendamento) row[0], (Long) row[1], Long::sum);
        }
        return porStatus;
    }

    public BigDecimal ticketMedio(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        BigDecimal ticket = pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(salonId, inicio, fim.minusNanos(1));
        return ticket != null ? ticket : BigDecimal.ZERO;
    }

    /** Comissões calculadas e ainda não repassadas aos profissionais. */
    public BigDecimal comissoesPendentes(Long salonId) {
        BigDecimal total = comissaoRepository.sumPendentesBySalonId(salonId);
        return total != null ? total : BigDecimal.ZERO;
    }

    /** Meta de faturamento do salão (não de um profissional) vigente no dia, se houver. */
    public Optional<BigDecimal> metaFaturamento(Long salonId, LocalDate dia) {
        return metaRepository.findMetasAtuais(salonId, dia).stream()
                .filter(m -> m.getTipo() == TipoMeta.FATURAMENTO && m.getProfissional() == null)
                .map(Meta::getValorMeta)
                .findFirst();
    }

    /**
     * Serviços que mais faturaram no período (pagamentos aprovados), limitado a {@code limite}.
     * Atendimento com vários serviços entra pelo primeiro, como nas métricas financeiras.
     */
    @SuppressWarnings("deprecation")
    public List<Ranking> topServicos(Long salonId, LocalDateTime inicio, LocalDateTime fim, int limite) {
        return ranking(pagamentosAprovados(salonId, inicio, fim), limite, p -> {
            Agendamento ag = p.getAgendamento();
            if (ag.getServicos() != null && !ag.getServicos().isEmpty()) {
                var s = ag.getServicos().get(0).getServico();
                return new Ranking(s.getId(), s.getNome(), BigDecimal.ZERO, 0);
            }
            return ag.getServico() != null
                    ? new Ranking(ag.getServico().getId(), ag.getServico().getNome(), BigDecimal.ZERO, 0)
                    : new Ranking(0L, "Serviço", BigDecimal.ZERO, 0);
        });
    }

    /** Profissionais que mais faturaram no período (pagamentos aprovados), limitado a {@code limite}. */
    public List<Ranking> topProfissionais(Long salonId, LocalDateTime inicio, LocalDateTime fim, int limite) {
        return ranking(pagamentosAprovados(salonId, inicio, fim), limite, p -> {
            var prof = p.getAgendamento().getProfissional();
            return new Ranking(prof.getId(), prof.getUsuario().getNome(), BigDecimal.ZERO, 0);
        });
    }

    private List<Pagamento> pagamentosAprovados(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        return pagamentoRepository.findBySalonIdAndStatusAndPeriod(salonId, StatusPagamento.APROVADO, inicio, fim.minusNanos(1));
    }

    /**
     * Agrupa os pagamentos pela chave (id + nome) e soma. Um pagamento dividido tem várias linhas
     * do mesmo atendimento: o valor soma todas, e o atendimento conta uma vez.
     */
    private List<Ranking> ranking(List<Pagamento> pagamentos, int limite,
                                  java.util.function.Function<Pagamento, Ranking> chave) {
        Map<Long, Ranking> porId = new LinkedHashMap<>();
        Map<Long, Set<Long>> atendimentos = new LinkedHashMap<>();
        for (Pagamento p : pagamentos) {
            Ranking k = chave.apply(p);
            porId.merge(k.id(), new Ranking(k.id(), k.nome(), p.getValor(), 0),
                    (a, b) -> new Ranking(a.id(), a.nome(), a.total().add(b.total()), 0));
            atendimentos.computeIfAbsent(k.id(), x -> new HashSet<>()).add(p.getAgendamento().getId());
        }
        List<Ranking> lista = new ArrayList<>();
        porId.forEach((id, r) -> lista.add(new Ranking(id, r.nome(), r.total(), atendimentos.get(id).size())));
        lista.sort(Comparator.comparing(Ranking::total).reversed());
        return lista.size() > limite ? lista.subList(0, limite) : lista;
    }
}
