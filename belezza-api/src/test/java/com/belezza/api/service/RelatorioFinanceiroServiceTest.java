package com.belezza.api.service;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.FormaPagamento;
import com.belezza.api.entity.Meta;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.Servico;
import com.belezza.api.entity.StatusPagamento;
import com.belezza.api.entity.TipoMeta;
import com.belezza.api.entity.TipoMovimentacaoCaixa;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ComissaoRepository;
import com.belezza.api.repository.MetaRepository;
import com.belezza.api.repository.MovimentacaoCaixaRepository;
import com.belezza.api.repository.PagamentoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RelatorioFinanceiroService - números reais do financeiro (BUG-020)")
class RelatorioFinanceiroServiceTest {

    @Mock private PagamentoRepository pagamentoRepository;
    @Mock private MovimentacaoCaixaRepository movimentacaoCaixaRepository;
    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private ComissaoRepository comissaoRepository;
    @Mock private MetaRepository metaRepository;
    @InjectMocks private RelatorioFinanceiroService service;

    private final LocalDateTime inicio = LocalDate.of(2026, 9, 1).atStartOfDay();
    private final LocalDateTime fim = LocalDate.of(2026, 10, 1).atStartOfDay();

    @SuppressWarnings("deprecation")
    private Pagamento pagamento(long agendamentoId, Profissional prof, Servico servico, String valor) {
        Agendamento ag = Agendamento.builder().id(agendamentoId).profissional(prof).servico(servico).build();
        return Pagamento.builder().agendamento(ag).valor(new BigDecimal(valor)).status(StatusPagamento.APROVADO).build();
    }

    private Profissional prof(long id, String nome) {
        return Profissional.builder().id(id).usuario(Usuario.builder().nome(nome).build()).build();
    }

    @Test
    @DisplayName("Receita = pagamentos + entradas avulsas − estornos do período (regra do caixa)")
    void receitaPelaRegraDoCaixa() {
        when(pagamentoRepository.sumRecebidoByFormaAndPeriod(1L, inicio, fim))
                .thenReturn(List.<Object[]>of(new Object[]{FormaPagamento.PIX, new BigDecimal("100")},
                        new Object[]{FormaPagamento.DINHEIRO, new BigDecimal("50")}));
        when(movimentacaoCaixaRepository.sumByFormaAndPeriod(1L, TipoMovimentacaoCaixa.RECEITA, inicio, fim))
                .thenReturn(List.<Object[]>of(new Object[]{FormaPagamento.DINHEIRO, new BigDecimal("20")}));
        when(movimentacaoCaixaRepository.sumByFormaAndPeriod(1L, TipoMovimentacaoCaixa.ESTORNO, inicio, fim))
                .thenReturn(List.<Object[]>of(new Object[]{FormaPagamento.PIX, new BigDecimal("30")}));

        assertThat(service.receita(1L, inicio, fim)).isEqualByComparingTo("140");
        assertThat(service.recebidoPorForma(1L, inicio, fim).get(FormaPagamento.DINHEIRO)).isEqualByComparingTo("70");
    }

    @Test
    @DisplayName("Ranking soma as partes de um pagamento dividido e conta o atendimento uma vez")
    void rankingComPagamentoDividido() {
        Profissional ana = prof(1L, "Ana"), bia = prof(2L, "Bia");
        Servico corte = Servico.builder().id(10L).nome("Corte").build();
        when(pagamentoRepository.findBySalonIdAndStatusAndPeriod(eq(1L), eq(StatusPagamento.APROVADO), any(), any()))
                .thenReturn(List.of(
                        pagamento(100L, ana, corte, "30"), pagamento(100L, ana, corte, "20"), // dividido: PIX + dinheiro
                        pagamento(101L, bia, corte, "80")));

        List<RelatorioFinanceiroService.Ranking> profs = service.topProfissionais(1L, inicio, fim, 5);

        assertThat(profs).extracting(RelatorioFinanceiroService.Ranking::nome).containsExactly("Bia", "Ana");
        assertThat(profs.get(1).total()).isEqualByComparingTo("50");
        assertThat(profs.get(1).atendimentos()).isEqualTo(1);
        List<RelatorioFinanceiroService.Ranking> servicos = service.topServicos(1L, inicio, fim, 5);
        assertThat(servicos).hasSize(1);
        assertThat(servicos.get(0).total()).isEqualByComparingTo("130");
        assertThat(servicos.get(0).atendimentos()).isEqualTo(2);
    }

    @Test
    @DisplayName("Meta de faturamento considera só a meta do salão, não a de um profissional")
    void metaDoSalao() {
        LocalDate hoje = LocalDate.of(2026, 9, 29);
        Meta doProfissional = Meta.builder().tipo(TipoMeta.FATURAMENTO).valorMeta(new BigDecimal("5000")).profissional(prof(1L, "Ana")).build();
        Meta doSalao = Meta.builder().tipo(TipoMeta.FATURAMENTO).valorMeta(new BigDecimal("30000")).build();
        when(metaRepository.findMetasAtuais(1L, hoje)).thenReturn(List.of(doProfissional, doSalao));

        assertThat(service.metaFaturamento(1L, hoje)).hasValueSatisfying(v -> assertThat(v).isEqualByComparingTo("30000"));
    }

    @Test
    @DisplayName("Sem meta cadastrada, não inventa uma")
    void semMeta() {
        when(metaRepository.findMetasAtuais(eq(1L), any())).thenReturn(List.of());
        assertThat(service.metaFaturamento(1L, LocalDate.now())).isEmpty();
    }
}
