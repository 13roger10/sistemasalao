package com.belezza.api.service;

import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.CaixaRepository;
import com.belezza.api.repository.MovimentacaoCaixaRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.repository.SalonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controle de caixa do salão.
 *
 * <p>Regras: um caixa aberto por salão; saldo inicial não negativo; todo pagamento entra no
 * caixa aberto (sem caixa aberto não há pagamento); sangria e despesa em dinheiro não podem
 * passar do dinheiro disponível na gaveta; no fechamento o sistema calcula o dinheiro esperado,
 * compara com o contado e congela os totais.</p>
 *
 * <p>Dinheiro esperado na gaveta = saldo inicial + entradas em dinheiro + suprimentos
 * − sangrias − despesas pagas em dinheiro.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CaixaService {

    private final CaixaRepository caixaRepository;
    private final MovimentacaoCaixaRepository movimentacaoCaixaRepository;
    private final PagamentoRepository pagamentoRepository;
    private final SalonRepository salonRepository;
    private final TenantIsolationService tenantIsolationService;

    /** Totais de um caixa (ao vivo se aberto, congelados se fechado). */
    public record Totais(
            Map<FormaPagamento, BigDecimal> entradasPorForma,
            BigDecimal entradas,
            BigDecimal despesas,
            BigDecimal sangrias,
            BigDecimal suprimentos,
            BigDecimal dinheiroEsperado) {

        public BigDecimal porForma(FormaPagamento forma) {
            return entradasPorForma.getOrDefault(forma, BigDecimal.ZERO);
        }
    }

    // ===== Consulta =====

    @Transactional(readOnly = true)
    public Optional<Caixa> buscarAberto(Long salonId) {
        tenantIsolationService.assertStaffTenant(salonId);
        return caixaRepository.findFirstBySalonIdAndStatus(salonId, StatusCaixa.ABERTO);
    }

    @Transactional(readOnly = true)
    public Caixa buscar(Long id) {
        Caixa caixa = caixaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Caixa", id));
        tenantIsolationService.assertStaffTenant(caixa.getSalon().getId());
        return caixa;
    }

    @Transactional(readOnly = true)
    public Page<Caixa> listar(Long salonId, Pageable pageable) {
        tenantIsolationService.assertStaffTenant(salonId);
        return caixaRepository.findBySalonIdOrderByAbertoEmDesc(salonId, pageable);
    }

    /**
     * Caixa aberto do salão, obrigatório para registrar pagamentos e movimentações.
     */
    @Transactional(readOnly = true)
    public Caixa exigirAberto(Long salonId) {
        return caixaRepository.findFirstBySalonIdAndStatus(salonId, StatusCaixa.ABERTO)
                .orElseThrow(() -> new BusinessException(
                        "Nenhum caixa aberto. Abra o caixa antes de registrar pagamentos ou movimentações."));
    }

    // ===== Abertura e fechamento =====

    @Transactional
    public Caixa abrir(Long salonId, BigDecimal saldoInicial, String observacoes, Usuario operador) {
        tenantIsolationService.assertStaffTenant(salonId);
        if (saldoInicial == null || saldoInicial.signum() < 0) {
            throw new BusinessException("O saldo inicial não pode ser negativo");
        }
        if (caixaRepository.existsBySalonIdAndStatus(salonId, StatusCaixa.ABERTO)) {
            throw new BusinessException("Já existe um caixa aberto para este salão. Feche-o antes de abrir outro.");
        }
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", salonId));

        Caixa caixa = Caixa.builder()
                .salon(salon)
                .status(StatusCaixa.ABERTO)
                .abertoPorId(operador.getId())
                .abertoPorNome(operador.getNome())
                .abertoEm(LocalDateTime.now())
                .saldoInicial(saldoInicial)
                .observacoesAbertura(observacoes)
                .build();
        caixa = caixaRepository.save(caixa);
        log.info("Caixa {} aberto no salão {} por {} com saldo inicial {}", caixa.getId(), salonId, operador.getId(), saldoInicial);
        return caixa;
    }

    @Transactional
    public Caixa fechar(Long caixaId, BigDecimal saldoInformado, String observacoes, Usuario operador) {
        Caixa caixa = caixaRepository.findByIdForUpdate(caixaId)
                .orElseThrow(() -> new ResourceNotFoundException("Caixa", caixaId));
        tenantIsolationService.assertStaffTenant(caixa.getSalon().getId());
        if (!caixa.isAberto()) {
            throw new BusinessException("Este caixa já está fechado");
        }
        if (saldoInformado == null || saldoInformado.signum() < 0) {
            throw new BusinessException("Informe o dinheiro contado na gaveta (valor não negativo)");
        }

        Totais t = calcularAoVivo(caixa);
        caixa.setTotalEntradas(t.entradas());
        caixa.setTotalDinheiro(t.porForma(FormaPagamento.DINHEIRO));
        caixa.setTotalPix(t.porForma(FormaPagamento.PIX));
        caixa.setTotalCredito(t.porForma(FormaPagamento.CARTAO_CREDITO));
        caixa.setTotalDebito(t.porForma(FormaPagamento.CARTAO_DEBITO).add(t.porForma(FormaPagamento.TRANSFERENCIA)));
        caixa.setTotalVale(t.porForma(FormaPagamento.VALE));
        caixa.setTotalDespesas(t.despesas());
        caixa.setTotalSangrias(t.sangrias());
        caixa.setTotalSuprimentos(t.suprimentos());
        caixa.setSaldoEsperado(t.dinheiroEsperado());
        caixa.setSaldoInformado(saldoInformado);
        caixa.setDiferenca(saldoInformado.subtract(t.dinheiroEsperado()));
        caixa.setObservacoesFechamento(observacoes);
        caixa.setFechadoPorId(operador.getId());
        caixa.setFechadoPorNome(operador.getNome());
        caixa.setFechadoEm(LocalDateTime.now());
        caixa.setStatus(StatusCaixa.FECHADO);
        caixa = caixaRepository.save(caixa);
        log.info("Caixa {} fechado por {}: esperado {} informado {} diferença {}",
                caixaId, operador.getId(), caixa.getSaldoEsperado(), saldoInformado, caixa.getDiferenca());
        return caixa;
    }

    // ===== Movimentações =====

    /**
     * Registra uma movimentação no caixa aberto do salão. Quando {@code caixaId} é informado
     * (ex.: rota de sangria do caixa), ele precisa ser o caixa aberto desse salão.
     */
    @Transactional
    public MovimentacaoCaixa registrarMovimentacao(Long salonId, Long caixaId, TipoMovimentacaoCaixa tipo,
                                                   BigDecimal valor, FormaPagamento forma,
                                                   String descricao, String categoria, Usuario operador) {
        tenantIsolationService.assertStaffTenant(salonId);
        if (tipo == TipoMovimentacaoCaixa.ESTORNO) {
            throw new BusinessException("Estornos são registrados pelo estorno do pagamento");
        }
        if (valor == null || valor.signum() <= 0) {
            throw new BusinessException("O valor deve ser maior que zero");
        }
        if (descricao == null || descricao.isBlank()) {
            throw new BusinessException("Informe a descrição da movimentação");
        }

        Caixa aberto = exigirAberto(salonId);
        if (caixaId != null && !caixaId.equals(aberto.getId())) {
            throw new BusinessException("Este caixa não está aberto");
        }
        Caixa caixa = caixaRepository.findByIdForUpdate(aberto.getId()).orElseThrow();

        // Sangria e suprimento mexem só no dinheiro da gaveta
        FormaPagamento formaEfetiva = (tipo == TipoMovimentacaoCaixa.SANGRIA || tipo == TipoMovimentacaoCaixa.SUPRIMENTO)
                ? FormaPagamento.DINHEIRO
                : (forma != null ? forma : FormaPagamento.DINHEIRO);

        boolean saiDaGaveta = tipo == TipoMovimentacaoCaixa.SANGRIA
                || (tipo == TipoMovimentacaoCaixa.DESPESA && formaEfetiva == FormaPagamento.DINHEIRO);
        if (saiDaGaveta) {
            BigDecimal disponivel = calcularAoVivo(caixa).dinheiroEsperado();
            if (valor.compareTo(disponivel) > 0) {
                throw new BusinessException(String.format(
                        "Valor maior que o dinheiro disponível no caixa (R$ %.2f)", disponivel));
            }
        }

        MovimentacaoCaixa mov = MovimentacaoCaixa.builder()
                .caixa(caixa)
                .tipo(tipo)
                .valor(valor)
                .forma(formaEfetiva)
                .descricao(descricao.trim())
                .categoria(categoria)
                .registradoPorId(operador.getId())
                .registradoPorNome(operador.getNome())
                .build();
        mov = movimentacaoCaixaRepository.save(mov);
        log.info("Movimentação {} {} de {} no caixa {} por {}", mov.getId(), tipo, valor, caixa.getId(), operador.getId());
        return mov;
    }

    /**
     * Reflete no caixa o estorno de um pagamento. Se o pagamento é do caixa aberto, basta ele
     * deixar de ser APROVADO (os totais são recalculados). Se é de um caixa já fechado (ou de
     * antes do controle de caixa), a devolução sai do caixa aberto como movimentação ESTORNO.
     */
    @Transactional
    public void registrarEstorno(Pagamento pagamento, Usuario operador) {
        Caixa caixaDoPagamento = pagamento.getCaixa();
        if (caixaDoPagamento != null && caixaDoPagamento.isAberto()) {
            return;
        }
        Caixa aberto = exigirAberto(pagamento.getSalon().getId());
        movimentacaoCaixaRepository.save(MovimentacaoCaixa.builder()
                .caixa(aberto)
                .tipo(TipoMovimentacaoCaixa.ESTORNO)
                .valor(pagamento.getValor())
                .forma(pagamento.getForma())
                .descricao("Estorno do pagamento #" + pagamento.getId())
                .categoria("estorno")
                .pagamentoId(pagamento.getId())
                .registradoPorId(operador != null ? operador.getId() : null)
                .registradoPorNome(operador != null ? operador.getNome() : null)
                .build());
    }

    // ===== Totais =====

    @Transactional(readOnly = true)
    public Totais totais(Caixa caixa) {
        return caixa.isAberto() ? calcularAoVivo(caixa) : congelados(caixa);
    }

    @Transactional(readOnly = true)
    public List<MovimentacaoCaixa> movimentacoes(Long caixaId) {
        return movimentacaoCaixaRepository.findByCaixaId(caixaId);
    }

    private Totais calcularAoVivo(Caixa caixa) {
        Map<FormaPagamento, BigDecimal> porForma = new EnumMap<>(FormaPagamento.class);
        for (Object[] row : pagamentoRepository.sumAprovadosByCaixaGroupByForma(caixa.getId())) {
            porForma.merge((FormaPagamento) row[0], (BigDecimal) row[1], BigDecimal::add);
        }

        BigDecimal despesas = BigDecimal.ZERO, despesasDinheiro = BigDecimal.ZERO;
        BigDecimal sangrias = BigDecimal.ZERO, suprimentos = BigDecimal.ZERO;
        for (MovimentacaoCaixa m : movimentacaoCaixaRepository.findByCaixaId(caixa.getId())) {
            switch (m.getTipo()) {
                case RECEITA -> porForma.merge(m.getForma(), m.getValor(), BigDecimal::add);
                case ESTORNO -> porForma.merge(m.getForma(), m.getValor().negate(), BigDecimal::add);
                case DESPESA -> {
                    despesas = despesas.add(m.getValor());
                    if (m.getForma() == FormaPagamento.DINHEIRO) despesasDinheiro = despesasDinheiro.add(m.getValor());
                }
                case SANGRIA -> sangrias = sangrias.add(m.getValor());
                case SUPRIMENTO -> suprimentos = suprimentos.add(m.getValor());
            }
        }

        BigDecimal entradas = porForma.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal dinheiroEsperado = caixa.getSaldoInicial()
                .add(porForma.getOrDefault(FormaPagamento.DINHEIRO, BigDecimal.ZERO))
                .add(suprimentos)
                .subtract(sangrias)
                .subtract(despesasDinheiro);
        return new Totais(porForma, entradas, despesas, sangrias, suprimentos, dinheiroEsperado);
    }

    private Totais congelados(Caixa caixa) {
        Map<FormaPagamento, BigDecimal> porForma = new EnumMap<>(FormaPagamento.class);
        porForma.put(FormaPagamento.DINHEIRO, nz(caixa.getTotalDinheiro()));
        porForma.put(FormaPagamento.PIX, nz(caixa.getTotalPix()));
        porForma.put(FormaPagamento.CARTAO_CREDITO, nz(caixa.getTotalCredito()));
        porForma.put(FormaPagamento.CARTAO_DEBITO, nz(caixa.getTotalDebito()));
        porForma.put(FormaPagamento.VALE, nz(caixa.getTotalVale()));
        return new Totais(porForma, nz(caixa.getTotalEntradas()), nz(caixa.getTotalDespesas()),
                nz(caixa.getTotalSangrias()), nz(caixa.getTotalSuprimentos()), nz(caixa.getSaldoEsperado()));
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
