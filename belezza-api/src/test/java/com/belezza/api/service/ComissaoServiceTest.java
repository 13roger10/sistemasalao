package com.belezza.api.service;

import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.ComissaoRepository;
import com.belezza.api.repository.PagamentoProfissionalRepository;
import com.belezza.api.repository.ProfissionalRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ComissaoService - estorno (BUG-014)")
class ComissaoServiceTest {

    @Mock
    private ComissaoRepository comissaoRepository;

    @Mock
    private ProfissionalRepository profissionalRepository;

    @Mock
    private PagamentoProfissionalRepository pagamentoProfissionalRepository;

    @InjectMocks
    private ComissaoService comissaoService;

    private Comissao comissao(StatusComissao status) {
        return Comissao.builder().id(1L).status(status)
                .valorServico(new BigDecimal("50.00")).valorComissao(new BigDecimal("20.00")).build();
    }

    @Test
    @DisplayName("Estorno cancela a comissão calculada")
    void cancelaComissaoCalculada() {
        Comissao c = comissao(StatusComissao.CALCULADA);
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(c));

        comissaoService.cancelarPorEstorno(100L);

        assertThat(c.getStatus()).isEqualTo(StatusComissao.CANCELADA);
        verify(comissaoRepository).save(c);
        verifyNoInteractions(pagamentoProfissionalRepository);
    }

    @Test
    @DisplayName("Comissão num repasse ainda não pago sai do repasse e os totais são refeitos")
    void retiraDoRepassePendente() {
        Comissao c = comissao(StatusComissao.CALCULADA);
        Comissao outra = comissao(StatusComissao.CALCULADA);
        PagamentoProfissional repasse = PagamentoProfissional.builder().id(9L)
                .status(StatusPagamentoProfissional.PENDENTE).totalServicos(2)
                .valorTotalServicos(new BigDecimal("100.00")).valorTotalComissoes(new BigDecimal("40.00"))
                .comissoes(new ArrayList<>(List.of(c, outra))).build();
        c.setPagamentoProfissional(repasse);
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(c));

        comissaoService.cancelarPorEstorno(100L);

        assertThat(c.getStatus()).isEqualTo(StatusComissao.CANCELADA);
        assertThat(c.getPagamentoProfissional()).isNull();
        assertThat(repasse.getComissoes()).containsExactly(outra);
        assertThat(repasse.getTotalServicos()).isEqualTo(1);
        assertThat(repasse.getValorTotalServicos()).isEqualByComparingTo("50.00");
        assertThat(repasse.getValorTotalComissoes()).isEqualByComparingTo("20.00");
        assertThat(repasse.getStatus()).isEqualTo(StatusPagamentoProfissional.PENDENTE);
        verify(pagamentoProfissionalRepository).save(repasse);
    }

    @Test
    @DisplayName("Repasse que fica sem comissões é cancelado")
    void repasseVazioCancelado() {
        Comissao c = comissao(StatusComissao.CALCULADA);
        PagamentoProfissional repasse = PagamentoProfissional.builder().id(9L)
                .status(StatusPagamentoProfissional.PENDENTE).totalServicos(1)
                .valorTotalServicos(new BigDecimal("50.00")).valorTotalComissoes(new BigDecimal("20.00"))
                .comissoes(new ArrayList<>(List.of(c))).build();
        c.setPagamentoProfissional(repasse);
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(c));

        comissaoService.cancelarPorEstorno(100L);

        assertThat(repasse.getStatus()).isEqualTo(StatusPagamentoProfissional.CANCELADO);
        assertThat(repasse.getValorTotalComissoes()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Comissão já paga ao profissional bloqueia o estorno")
    void comissaoPagaBloqueia() {
        Comissao c = comissao(StatusComissao.PAGA);
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> comissaoService.cancelarPorEstorno(100L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("já foi paga ao profissional");
        assertThat(c.getStatus()).isEqualTo(StatusComissao.PAGA);
        verify(comissaoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Nova cobrança reativa a comissão cancelada pelo estorno")
    void reativaAposNovoPagamento() {
        Comissao c = comissao(StatusComissao.CANCELADA);
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(c));

        comissaoService.reativarAposPagamento(100L);

        assertThat(c.getStatus()).isEqualTo(StatusComissao.CALCULADA);
        verify(comissaoRepository).save(c);
    }

    /** Atendimento de R$ 85 com 10%: comissão integral de R$ 8,50. */
    private Comissao comissaoDe10PorCento(StatusComissao status, String valorAtual) {
        return Comissao.builder().id(1L).status(status)
                .valorServico(new BigDecimal("85.00")).tipoComissao(TipoComissao.PORCENTAGEM)
                .taxaComissao(new BigDecimal("10.00")).valorComissao(new BigDecimal(valorAtual)).build();
    }

    @Test
    @DisplayName("Estorno de uma parte deixa a comissão proporcional ao que ficou pago (BUG-022)")
    void estornoParcialFicaProporcional() {
        Comissao c = comissaoDe10PorCento(StatusComissao.CALCULADA, "8.50");
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(c));

        comissaoService.ajustarAoValorPago(100L, new BigDecimal("40.00"), new BigDecimal("85.00"));

        assertThat(c.getStatus()).isEqualTo(StatusComissao.CALCULADA);
        assertThat(c.getValorComissao()).isEqualByComparingTo("4.00");
        verify(comissaoRepository).save(c);
    }

    @Test
    @DisplayName("Estorno parcial refaz o total do repasse ainda não pago (BUG-022)")
    void estornoParcialRefazRepasse() {
        Comissao c = comissaoDe10PorCento(StatusComissao.CALCULADA, "8.50");
        PagamentoProfissional repasse = PagamentoProfissional.builder().id(9L)
                .status(StatusPagamentoProfissional.PENDENTE).totalServicos(1)
                .valorTotalServicos(new BigDecimal("85.00")).valorTotalComissoes(new BigDecimal("8.50"))
                .comissoes(new ArrayList<>(List.of(c))).build();
        c.setPagamentoProfissional(repasse);
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(c));

        comissaoService.ajustarAoValorPago(100L, new BigDecimal("40.00"), new BigDecimal("85.00"));

        assertThat(repasse.getValorTotalComissoes()).isEqualByComparingTo("4.00");
        assertThat(repasse.getComissoes()).containsExactly(c);
        verify(pagamentoProfissionalRepository).save(repasse);
    }

    @Test
    @DisplayName("Comissão já paga bloqueia também o estorno parcial (BUG-022)")
    void estornoParcialComComissaoPaga() {
        Comissao c = comissaoDe10PorCento(StatusComissao.PAGA, "8.50");
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> comissaoService.ajustarAoValorPago(100L, new BigDecimal("40.00"), new BigDecimal("85.00")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("já foi paga ao profissional");
        verify(comissaoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Pagar o restante devolve a comissão ao valor integral (BUG-022)")
    void novaCobrancaRestauraValorIntegral() {
        Comissao c = comissaoDe10PorCento(StatusComissao.CALCULADA, "4.00");
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(c));

        comissaoService.reativarAposPagamento(100L);

        assertThat(c.getValorComissao()).isEqualByComparingTo("8.50");
        verify(comissaoRepository).save(c);
    }

    @Test
    @DisplayName("Primeira cobrança não mexe na comissão calculada")
    void primeiraCobrancaNaoMexe() {
        when(comissaoRepository.findByAgendamentoId(100L)).thenReturn(Optional.of(comissao(StatusComissao.CALCULADA)));

        comissaoService.reativarAposPagamento(100L);

        verify(comissaoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Comissão já calculada não marca a transação de concluir para rollback (BUG-024)")
    void erroDeNegocioNaoEnvenenaATransacaoDeQuemChama() throws Exception {
        // concluir() trata o erro de comissão com try/catch; se este método marcasse a transação
        // como rollback-only, o "finalizar" respondia 500 (UnexpectedRollbackException)
        var tx = ComissaoService.class.getMethod("calcularComissao", Agendamento.class)
                .getAnnotation(org.springframework.transaction.annotation.Transactional.class);

        assertThat(tx).isNotNull();
        assertThat(tx.noRollbackFor()).contains(BusinessException.class);
    }
}
