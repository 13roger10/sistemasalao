package com.belezza.api.service;

import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.CaixaRepository;
import com.belezza.api.repository.MovimentacaoCaixaRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CaixaService")
class CaixaServiceTest {

    @Mock private CaixaRepository caixaRepository;
    @Mock private MovimentacaoCaixaRepository movimentacaoCaixaRepository;
    @Mock private PagamentoRepository pagamentoRepository;
    @Mock private SalonRepository salonRepository;
    @Spy private TenantIsolationService tenantIsolationService = new TenantIsolationService();

    @InjectMocks
    private CaixaService caixaService;

    private final Salon salon = Salon.builder().id(1L).build();
    private final Usuario recepcionista = Usuario.builder().id(14L).nome("Recepcionista A").role(Role.RECEPCIONISTA).build();
    private Caixa aberto;
    private final List<MovimentacaoCaixa> movs = new ArrayList<>();

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(1L);
        aberto = Caixa.builder().id(7L).salon(salon).status(StatusCaixa.ABERTO).saldoInicial(new BigDecimal("200.00")).build();
        lenient().when(caixaRepository.findFirstBySalonIdAndStatus(1L, StatusCaixa.ABERTO)).thenReturn(Optional.of(aberto));
        lenient().when(caixaRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(aberto));
        lenient().when(caixaRepository.save(any(Caixa.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(movimentacaoCaixaRepository.findByCaixaId(7L)).thenReturn(movs);
        lenient().when(movimentacaoCaixaRepository.save(any(MovimentacaoCaixa.class))).thenAnswer(inv -> {
            MovimentacaoCaixa m = inv.getArgument(0);
            movs.add(m);
            return m;
        });
        // Pagamentos do caixa: R$150 em dinheiro e R$50 no PIX
        lenient().when(pagamentoRepository.sumAprovadosByCaixaGroupByForma(7L)).thenReturn(List.of(
                new Object[]{FormaPagamento.DINHEIRO, new BigDecimal("150.00")},
                new Object[]{FormaPagamento.PIX, new BigDecimal("50.00")}));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private MovimentacaoCaixa mov(TipoMovimentacaoCaixa tipo, String valor, FormaPagamento forma) {
        return MovimentacaoCaixa.builder().caixa(aberto).tipo(tipo).valor(new BigDecimal(valor)).forma(forma).descricao("x").build();
    }

    @Test
    @DisplayName("Abre caixa com saldo inicial e responsável")
    void abrir() {
        when(caixaRepository.existsBySalonIdAndStatus(1L, StatusCaixa.ABERTO)).thenReturn(false);
        when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));

        Caixa c = caixaService.abrir(1L, new BigDecimal("200"), "abertura", recepcionista);

        assertThat(c.getStatus()).isEqualTo(StatusCaixa.ABERTO);
        assertThat(c.getAbertoPorNome()).isEqualTo("Recepcionista A");
        assertThat(c.getSaldoInicial()).isEqualByComparingTo("200");
    }

    @Test
    @DisplayName("Não abre segundo caixa, saldo negativo nem caixa de outro salão")
    void abrirRegras() {
        when(caixaRepository.existsBySalonIdAndStatus(1L, StatusCaixa.ABERTO)).thenReturn(true);
        assertThatThrownBy(() -> caixaService.abrir(1L, BigDecimal.TEN, null, recepcionista))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Já existe um caixa aberto");
        assertThatThrownBy(() -> caixaService.abrir(1L, new BigDecimal("-100"), null, recepcionista))
                .isInstanceOf(BusinessException.class).hasMessageContaining("negativo");
        assertThatThrownBy(() -> caixaService.abrir(2L, BigDecimal.TEN, null, recepcionista))
                .isInstanceOf(AccessDeniedException.class);
        verify(caixaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Fechamento: esperado = 200 + 150 dinheiro + 50 suprimento − 30 sangria − 20 despesa em dinheiro = 350")
    void fechar() {
        movs.add(mov(TipoMovimentacaoCaixa.SUPRIMENTO, "50.00", FormaPagamento.DINHEIRO));
        movs.add(mov(TipoMovimentacaoCaixa.SANGRIA, "30.00", FormaPagamento.DINHEIRO));
        movs.add(mov(TipoMovimentacaoCaixa.DESPESA, "20.00", FormaPagamento.DINHEIRO));
        movs.add(mov(TipoMovimentacaoCaixa.DESPESA, "40.00", FormaPagamento.PIX)); // não sai da gaveta

        Caixa c = caixaService.fechar(7L, new BigDecimal("340.00"), "faltou troco", recepcionista);

        assertThat(c.getStatus()).isEqualTo(StatusCaixa.FECHADO);
        assertThat(c.getSaldoEsperado()).isEqualByComparingTo("350.00");
        assertThat(c.getDiferenca()).isEqualByComparingTo("-10.00");
        assertThat(c.getTotalEntradas()).isEqualByComparingTo("200.00");
        assertThat(c.getTotalDinheiro()).isEqualByComparingTo("150.00");
        assertThat(c.getTotalPix()).isEqualByComparingTo("50.00");
        assertThat(c.getTotalDespesas()).isEqualByComparingTo("60.00");
        assertThat(c.getTotalSangrias()).isEqualByComparingTo("30.00");
        assertThat(c.getTotalSuprimentos()).isEqualByComparingTo("50.00");
        assertThat(c.getFechadoPorNome()).isEqualTo("Recepcionista A");

        // Fechado: totais passam a vir do congelado, e não fecha de novo
        assertThat(caixaService.totais(c).dinheiroEsperado()).isEqualByComparingTo("350.00");
        assertThatThrownBy(() -> caixaService.fechar(7L, BigDecimal.ONE, null, recepcionista))
                .isInstanceOf(BusinessException.class).hasMessageContaining("já está fechado");
    }

    @Test
    @DisplayName("Sangria não passa do dinheiro disponível (200 + 150 = 350)")
    void sangriaLimitada() {
        assertThatThrownBy(() -> caixaService.registrarMovimentacao(1L, 7L, TipoMovimentacaoCaixa.SANGRIA,
                new BigDecimal("351"), null, "banco", null, recepcionista))
                .isInstanceOf(BusinessException.class).hasMessageContaining("disponível");

        caixaService.registrarMovimentacao(1L, 7L, TipoMovimentacaoCaixa.SANGRIA,
                new BigDecimal("350"), FormaPagamento.PIX, "banco", null, recepcionista);
        assertThat(movs).hasSize(1);
        assertThat(movs.get(0).getForma()).isEqualTo(FormaPagamento.DINHEIRO); // sangria é sempre dinheiro
        assertThat(caixaService.totais(aberto).dinheiroEsperado()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Movimentação exige caixa aberto e valor positivo")
    void movimentacaoRegras() {
        assertThatThrownBy(() -> caixaService.registrarMovimentacao(1L, null, TipoMovimentacaoCaixa.DESPESA,
                BigDecimal.ZERO, FormaPagamento.PIX, "x", null, recepcionista))
                .isInstanceOf(BusinessException.class).hasMessageContaining("maior que zero");

        when(caixaRepository.findFirstBySalonIdAndStatus(1L, StatusCaixa.ABERTO)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> caixaService.registrarMovimentacao(1L, null, TipoMovimentacaoCaixa.SUPRIMENTO,
                BigDecimal.TEN, null, "troco", null, recepcionista))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Nenhum caixa aberto");
    }

    @Test
    @DisplayName("Estorno: pagamento do caixa aberto não gera movimentação; de caixa fechado sai do caixa aberto")
    void estorno() {
        Pagamento doAberto = Pagamento.builder().id(1L).salon(salon).caixa(aberto)
                .valor(new BigDecimal("50")).forma(FormaPagamento.PIX).build();
        caixaService.registrarEstorno(doAberto, recepcionista);
        assertThat(movs).isEmpty();

        Caixa fechado = Caixa.builder().id(3L).salon(salon).status(StatusCaixa.FECHADO).build();
        Pagamento doFechado = Pagamento.builder().id(2L).salon(salon).caixa(fechado)
                .valor(new BigDecimal("50")).forma(FormaPagamento.PIX).build();
        caixaService.registrarEstorno(doFechado, recepcionista);

        assertThat(movs).hasSize(1);
        assertThat(movs.get(0).getTipo()).isEqualTo(TipoMovimentacaoCaixa.ESTORNO);
        assertThat(movs.get(0).getCaixa()).isSameAs(aberto);
        // PIX do caixa aberto: 50 - 50 estornado = 0
        assertThat(caixaService.totais(aberto).porForma(FormaPagamento.PIX)).isEqualByComparingTo("0");
    }
}
