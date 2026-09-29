package com.belezza.api.controller;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Caixa;
import com.belezza.api.entity.MovimentacaoCaixa;
import com.belezza.api.entity.StatusPagamento;
import com.belezza.api.entity.TipoMovimentacaoCaixa;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.MovimentacaoCaixaRepository;
import com.belezza.api.security.TenantContext;
import com.belezza.api.service.CaixaService;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.FormaPagamento;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Servico;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.service.TenantIsolationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

/**
 * Financial data for a salon (cash register, transactions, reports) is a receptionist/admin
 * function — never PROFISSIONAL or CLIENTE — and must never cross into another salon's data.
 * See BUG #002/#005: this controller previously had no role or tenant restriction at all and
 * was also reachable with zero authentication via SecurityConfig's permitAll.
 */
@RestController
@RequestMapping("/api/salon/finance")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('ADMIN', 'RECEPCIONISTA')")
@Tag(name = "Finanças", description = "Gerenciamento financeiro do salão")
public class FinanceController {

    private final PagamentoRepository pagamentoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final TenantIsolationService tenantIsolationService;
    private final CaixaService caixaService;
    private final MovimentacaoCaixaRepository movimentacaoCaixaRepository;
    private final com.belezza.api.service.RelatorioFinanceiroService relatorioFinanceiroService;

    /** Valor recebido no período por forma, pela regra do caixa (ver RelatorioFinanceiroService). */
    private Map<FormaPagamento, BigDecimal> recebidoPorForma(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        return relatorioFinanceiroService.recebidoPorForma(salonId, inicio, fim);
    }

    private double formaTotal(Map<FormaPagamento, BigDecimal> totals, FormaPagamento forma) {
        return totals.getOrDefault(forma, BigDecimal.ZERO).doubleValue();
    }

    private LocalDate parseDateFlexible(String date) {
        // Accepts a plain "yyyy-MM-dd" or a full ISO datetime string (e.g. from Date.toISOString()).
        return LocalDate.parse(date.length() > 10 ? date.substring(0, 10) : date);
    }

    // ===== TRANSACTIONS =====

    /**
     * Salão da requisição: o unitId informado (se houver) precisa ser o salão do usuário; sem
     * unitId usa o salão do token. Antes o padrão era o salão 1 e a verificação liberava token
     * sem salão.
     */
    private Long resolverSalao(String unitId) {
        Long salonId = unitId != null && !unitId.isBlank() ? Long.valueOf(unitId) : TenantContext.getCurrentTenant();
        tenantIsolationService.assertStaffTenant(salonId);
        return salonId;
    }

    @GetMapping("/transactions")
    @Transactional(readOnly = true)
    @Operation(summary = "Listar transações", description = "Lista pagamentos e movimentações de caixa (sangrias, suprimentos, despesas, lançamentos e estornos), mais recentes primeiro. RECEPCIONISTA recebe apenas os que ela mesma registrou.")
    public ResponseEntity<PaginatedTransactionsResponse> listTransactions(
            @RequestParam(required = false) String unitId,
            @RequestParam(required = false, defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "50") int limit,
            @AuthenticationPrincipal Usuario operador) {
        Long salonId = resolverSalao(unitId);
        boolean soDaRecepcionista = operador != null && operador.getRole() == Role.RECEPCIONISTA;

        // Pagamentos e movimentações vêm de tabelas diferentes: busca as primeiras page*limit de
        // cada uma, junta por data e recorta a página pedida (paginação 1-based do frontend).
        int janela = Math.max(1, page) * limit;
        Pageable topo = PageRequest.of(0, janela, Sort.by(Sort.Direction.DESC, "criadoEm"));
        Page<Pagamento> pagamentos = soDaRecepcionista
                ? pagamentoRepository.findBySalonIdAndRegistradoPorId(salonId, operador.getId(), topo)
                : pagamentoRepository.findBySalonId(salonId, topo);
        Page<MovimentacaoCaixa> movimentacoes = movimentacaoCaixaRepository.findBySalonId(salonId, PageRequest.of(0, janela));

        List<TransactionResponse> todas = new ArrayList<>();
        pagamentos.getContent().forEach(p -> todas.add(toTransactionResponse(p)));
        movimentacoes.getContent().stream()
                .filter(m -> !soDaRecepcionista || operador.getId().equals(m.getRegistradoPorId()))
                .forEach(m -> todas.add(toTransactionResponse(m)));
        todas.sort(Comparator.comparing(TransactionResponse::createdAt, Comparator.nullsLast(Comparator.reverseOrder())));

        int from = Math.min(todas.size(), (Math.max(1, page) - 1) * limit);
        List<TransactionResponse> data = todas.subList(from, Math.min(todas.size(), from + limit));
        long total = pagamentos.getTotalElements() + movimentacoes.getTotalElements();
        int totalPages = (int) Math.ceil(total / (double) limit);
        PageMeta meta = new PageMeta(total, page, limit, totalPages, page < totalPages, page > 1);
        return ResponseEntity.ok(new PaginatedTransactionsResponse(data, data, meta));
    }

    @PostMapping("/transactions")
    @Operation(summary = "Lançamento no caixa", description = "Registra no caixa aberto uma entrada avulsa (income), despesa (expense), sangria (withdrawal) ou suprimento (supply).")
    public ResponseEntity<TransactionResponse> createTransaction(
            @RequestParam(required = false) String unitId,
            @RequestBody TransactionCreateRequest request,
            @AuthenticationPrincipal Usuario operador) {
        Long salonId = resolverSalao(unitId);
        TipoMovimentacaoCaixa tipo = switch (request.type() != null ? request.type() : "") {
            case "income" -> TipoMovimentacaoCaixa.RECEITA;
            case "expense" -> TipoMovimentacaoCaixa.DESPESA;
            case "withdrawal" -> TipoMovimentacaoCaixa.SANGRIA;
            case "supply" -> TipoMovimentacaoCaixa.SUPRIMENTO;
            default -> throw new BusinessException("Tipo de lançamento inválido: use income, expense, withdrawal ou supply");
        };
        MovimentacaoCaixa mov = caixaService.registrarMovimentacao(salonId, null, tipo,
                request.amount() != null ? BigDecimal.valueOf(request.amount()) : null,
                toFormaPagamento(request.paymentMethod()),
                request.description(), request.category(), operador);
        return ResponseEntity.status(HttpStatus.CREATED).body(toTransactionResponse(mov));
    }

    private TransactionResponse toTransactionResponse(Pagamento pagamento) {
        Agendamento agendamento = pagamento.getAgendamento();
        Cliente cliente = agendamento != null ? agendamento.getCliente() : null;
        Servico servico = agendamento != null ? agendamento.getServico() : null;

        String clienteNome = cliente != null && cliente.getUsuario() != null
                ? cliente.getUsuario().getNome() : null;
        String servicoNome = servico != null ? servico.getNome() : "Atendimento";
        boolean estornado = pagamento.getStatus() == StatusPagamento.ESTORNADO;

        return new TransactionResponse(
                String.valueOf(pagamento.getId()),
                pagamento.getCaixa() != null ? String.valueOf(pagamento.getCaixa().getId()) : null,
                String.valueOf(pagamento.getSalon().getId()),
                "income",
                "service",
                (clienteNome != null ? servicoNome + " - " + clienteNome : servicoNome) + (estornado ? " (estornado)" : ""),
                pagamento.getValor().doubleValue(),
                mapFormaPagamento(pagamento.getForma()),
                agendamento != null ? String.valueOf(agendamento.getId()) : null,
                cliente != null ? String.valueOf(cliente.getId()) : null,
                clienteNome,
                pagamento.getRegistradoPorId() != null ? String.valueOf(pagamento.getRegistradoPorId()) : null,
                pagamento.getRegistradoPorNome(),
                pagamento.getCriadoEm(),
                pagamento.getCriadoEm()
        );
    }

    private TransactionResponse toTransactionResponse(MovimentacaoCaixa mov) {
        String type = switch (mov.getTipo()) {
            case RECEITA, SUPRIMENTO -> "income";
            case DESPESA, ESTORNO -> "expense";
            case SANGRIA -> "withdrawal";
        };
        String category = mov.getCategoria() != null ? mov.getCategoria()
                : switch (mov.getTipo()) {
                    case RECEITA, SUPRIMENTO -> "other_income";
                    default -> "other_expense";
                };
        String prefixo = switch (mov.getTipo()) {
            case SANGRIA -> "Sangria - ";
            case SUPRIMENTO -> "Suprimento - ";
            default -> "";
        };
        return new TransactionResponse(
                String.valueOf(mov.getId()),
                String.valueOf(mov.getCaixa().getId()),
                String.valueOf(mov.getCaixa().getSalon().getId()),
                type,
                category,
                prefixo + mov.getDescricao(),
                mov.getValor().doubleValue(),
                mapFormaPagamento(mov.getForma()),
                null,
                null,
                null,
                mov.getRegistradoPorId() != null ? String.valueOf(mov.getRegistradoPorId()) : null,
                mov.getRegistradoPorNome(),
                mov.getCriadoEm(),
                mov.getCriadoEm()
        );
    }

    private String mapFormaPagamento(FormaPagamento forma) {
        return switch (forma) {
            case DINHEIRO -> "cash";
            case PIX -> "pix";
            case CARTAO_CREDITO -> "credit_card";
            case CARTAO_DEBITO -> "debit_card";
            case VALE -> "voucher";
            case TRANSFERENCIA -> "debit_card";
        };
    }

    private FormaPagamento toFormaPagamento(String paymentMethod) {
        if (paymentMethod == null) return FormaPagamento.DINHEIRO;
        return switch (paymentMethod) {
            case "pix" -> FormaPagamento.PIX;
            case "credit_card" -> FormaPagamento.CARTAO_CREDITO;
            case "debit_card" -> FormaPagamento.CARTAO_DEBITO;
            case "voucher" -> FormaPagamento.VALE;
            case "transfer" -> FormaPagamento.TRANSFERENCIA;
            default -> FormaPagamento.DINHEIRO;
        };
    }

    // ===== CASH REGISTER =====

    @GetMapping("/cash-register/current")
    @Transactional(readOnly = true)
    @Operation(summary = "Caixa atual", description = "Retorna o caixa aberto do salão com os totais reais, ou corpo vazio quando não há caixa aberto")
    public ResponseEntity<CashRegisterResponse> getCurrentCashRegister(
            @RequestParam(required = false) String unitId) {
        Long salonId = resolverSalao(unitId);
        return caixaService.buscarAberto(salonId)
                .map(c -> ResponseEntity.ok(toCashRegisterResponse(c)))
                .orElseGet(() -> ResponseEntity.ok().build());
    }

    @GetMapping("/cash-register")
    @Transactional(readOnly = true)
    @Operation(summary = "Histórico de caixas", description = "Lista os caixas do salão, mais recentes primeiro")
    public ResponseEntity<PaginatedCashRegistersResponse> listCashRegisters(
            @RequestParam(required = false) String unitId,
            @RequestParam(required = false, defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "20") int limit) {
        Long salonId = resolverSalao(unitId);
        Page<Caixa> caixas = caixaService.listar(salonId, PageRequest.of(Math.max(0, page - 1), limit));
        List<CashRegisterResponse> data = caixas.getContent().stream().map(this::toCashRegisterResponse).toList();
        PageMeta meta = new PageMeta(caixas.getTotalElements(), page, limit, caixas.getTotalPages(),
                caixas.hasNext(), caixas.hasPrevious());
        return ResponseEntity.ok(new PaginatedCashRegistersResponse(data, data, meta));
    }

    @GetMapping("/cash-register/{id}")
    @Transactional(readOnly = true)
    @Operation(summary = "Buscar caixa por ID", description = "Retorna um caixa do salão com seus totais")
    public ResponseEntity<CashRegisterResponse> getCashRegisterById(@PathVariable Long id) {
        return ResponseEntity.ok(toCashRegisterResponse(caixaService.buscar(id)));
    }

    @PostMapping("/cash-register/open")
    @Operation(summary = "Abrir caixa", description = "Abre o caixa do salão com o saldo inicial em dinheiro. Só um caixa aberto por salão.")
    public ResponseEntity<CashRegisterResponse> openCashRegister(
            @RequestBody CashRegisterOpenRequest request,
            @AuthenticationPrincipal Usuario operador) {
        Long salonId = resolverSalao(request.unitId());
        Caixa caixa = caixaService.abrir(salonId, BigDecimal.valueOf(request.openingBalance()),
                request.openingNotes() != null ? request.openingNotes() : request.notes(), operador);
        return ResponseEntity.status(HttpStatus.CREATED).body(toCashRegisterResponse(caixa));
    }

    @PostMapping("/cash-register/{id}/close")
    @Operation(summary = "Fechar caixa", description = "Fecha o caixa informando o dinheiro contado; o sistema calcula o esperado e a diferença")
    public ResponseEntity<CashRegisterResponse> closeCashRegister(
            @PathVariable Long id,
            @RequestBody CashRegisterCloseRequest request,
            @AuthenticationPrincipal Usuario operador) {
        Caixa caixa = caixaService.fechar(id, request.closingBalance() != null ? BigDecimal.valueOf(request.closingBalance()) : null,
                request.closingNotes() != null ? request.closingNotes() : request.notes(), operador);
        return ResponseEntity.ok(toCashRegisterResponse(caixa));
    }

    @PostMapping("/cash-register/{id}/withdrawal")
    @Operation(summary = "Sangria", description = "Retira dinheiro da gaveta do caixa aberto (limitado ao dinheiro disponível)")
    public ResponseEntity<TransactionResponse> withdrawal(
            @PathVariable Long id,
            @RequestBody WithdrawalRequest request,
            @AuthenticationPrincipal Usuario operador) {
        Caixa caixa = caixaService.buscar(id);
        MovimentacaoCaixa mov = caixaService.registrarMovimentacao(caixa.getSalon().getId(), id,
                TipoMovimentacaoCaixa.SANGRIA,
                request.amount() != null ? BigDecimal.valueOf(request.amount()) : null,
                FormaPagamento.DINHEIRO, request.reason(), "withdrawal", operador);
        return ResponseEntity.status(HttpStatus.CREATED).body(toTransactionResponse(mov));
    }

    @PostMapping("/cash-register/{id}/supply")
    @Operation(summary = "Suprimento", description = "Coloca dinheiro na gaveta do caixa aberto sem venda (ex.: troco)")
    public ResponseEntity<TransactionResponse> supply(
            @PathVariable Long id,
            @RequestBody WithdrawalRequest request,
            @AuthenticationPrincipal Usuario operador) {
        Caixa caixa = caixaService.buscar(id);
        MovimentacaoCaixa mov = caixaService.registrarMovimentacao(caixa.getSalon().getId(), id,
                TipoMovimentacaoCaixa.SUPRIMENTO,
                request.amount() != null ? BigDecimal.valueOf(request.amount()) : null,
                FormaPagamento.DINHEIRO, request.reason(), "supply", operador);
        return ResponseEntity.status(HttpStatus.CREATED).body(toTransactionResponse(mov));
    }

    private CashRegisterResponse toCashRegisterResponse(Caixa caixa) {
        CaixaService.Totais t = caixaService.totais(caixa);
        double debito = t.porForma(FormaPagamento.CARTAO_DEBITO).add(t.porForma(FormaPagamento.TRANSFERENCIA)).doubleValue();
        return new CashRegisterResponse(
                String.valueOf(caixa.getId()),
                String.valueOf(caixa.getSalon().getId()),
                caixa.getAbertoPorId() != null ? String.valueOf(caixa.getAbertoPorId()) : null,
                caixa.getAbertoPorNome(),
                caixa.isAberto() ? "open" : "closed",
                caixa.getAbertoEm(),
                caixa.getFechadoEm(),
                caixa.getFechadoPorId() != null ? String.valueOf(caixa.getFechadoPorId()) : null,
                caixa.getFechadoPorNome(),
                caixa.getSaldoInicial().doubleValue(),
                t.entradas().doubleValue(),
                t.despesas().doubleValue(),
                t.sangrias().doubleValue(),
                t.porForma(FormaPagamento.DINHEIRO).doubleValue(),
                t.porForma(FormaPagamento.PIX).doubleValue(),
                t.porForma(FormaPagamento.CARTAO_CREDITO).doubleValue(),
                debito,
                t.porForma(FormaPagamento.VALE).doubleValue(),
                caixa.getCriadoEm(),
                caixa.getAtualizadoEm(),
                caixa.getObservacoesAbertura(),
                caixa.getSaldoInformado() != null ? caixa.getSaldoInformado().doubleValue() : null,
                t.dinheiroEsperado().doubleValue(),
                caixa.getDiferenca() != null ? caixa.getDiferenca().doubleValue() : null,
                caixa.getObservacoesFechamento(),
                t.suprimentos().doubleValue()
        );
    }

    // ===== STATS =====

    /** Valor em reais com 2 casas, para a resposta. */
    private static double reais(BigDecimal valor) {
        return valor.setScale(2, java.math.RoundingMode.HALF_UP).doubleValue();
    }

    /** Variação percentual (1 casa) em relação ao anterior; 0 quando o anterior é zero. */
    private static double variacao(BigDecimal atual, BigDecimal anterior) {
        if (anterior.signum() == 0) return 0.0;
        return Math.round(atual.subtract(anterior).multiply(BigDecimal.valueOf(1000))
                .divide(anterior.abs(), 0, java.math.RoundingMode.HALF_UP).doubleValue()) / 10.0;
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    @Operation(summary = "Estatísticas financeiras", description = "Resumo do dia, da semana e do mês, com os valores reais recebidos e as despesas do caixa")
    public ResponseEntity<FinanceStatsResponse> getStats(@RequestParam(required = false) String unitId) {
        Long salonId = resolverSalao(unitId);
        LocalDate hoje = LocalDate.now();
        LocalDateTime amanha = hoje.plusDays(1).atStartOfDay();

        LocalDateTime inicioDia = hoje.atStartOfDay();
        BigDecimal receitaDia = relatorioFinanceiroService.receita(salonId, inicioDia, amanha);
        BigDecimal despesasDia = relatorioFinanceiroService.despesas(salonId, inicioDia, amanha);
        long agendamentosDia = relatorioFinanceiroService.agendamentosPorStatus(salonId, inicioDia, amanha).entrySet().stream()
                .filter(e -> e.getKey() != StatusAgendamento.CANCELADO)
                .mapToLong(Map.Entry::getValue).sum();
        TodayStats today = new TodayStats(reais(receitaDia), reais(despesasDia), reais(receitaDia.subtract(despesasDia)),
                (int) agendamentosDia, reais(relatorioFinanceiroService.ticketMedio(salonId, inicioDia, amanha)));

        // Semana de segunda até hoje; mês do dia 1 até hoje
        LocalDateTime inicioSemana = hoje.with(java.time.DayOfWeek.MONDAY).atStartOfDay();
        BigDecimal receitaSemana = relatorioFinanceiroService.receita(salonId, inicioSemana, amanha);
        BigDecimal despesasSemana = relatorioFinanceiroService.despesas(salonId, inicioSemana, amanha);
        WeekStats week = new WeekStats(reais(receitaSemana), reais(despesasSemana), reais(receitaSemana.subtract(despesasSemana)));

        LocalDateTime inicioMes = hoje.withDayOfMonth(1).atStartOfDay();
        BigDecimal receitaMes = relatorioFinanceiroService.receita(salonId, inicioMes, amanha);
        BigDecimal despesasMes = relatorioFinanceiroService.despesas(salonId, inicioMes, amanha);
        BigDecimal meta = relatorioFinanceiroService.metaFaturamento(salonId, hoje).orElse(BigDecimal.ZERO);
        double progresso = meta.signum() > 0
                ? receitaMes.multiply(BigDecimal.valueOf(100)).divide(meta, 1, java.math.RoundingMode.HALF_UP).doubleValue()
                : 0.0;
        MonthStats month = new MonthStats(reais(receitaMes), reais(despesasMes), reais(receitaMes.subtract(despesasMes)),
                reais(meta), progresso);

        // Não há contas a pagar cadastradas no sistema: despesas pendentes ficam em zero
        return ResponseEntity.ok(new FinanceStatsResponse(today, week, month, 0.0,
                reais(relatorioFinanceiroService.comissoesPendentes(salonId))));
    }

    @GetMapping("/reports/monthly")
    @Transactional(readOnly = true)
    @Operation(summary = "Relatório mensal", description = "Relatório financeiro do mês com os valores reais recebidos, despesas do caixa e atendimentos")
    public ResponseEntity<MonthlyReportResponse> getMonthlyReport(
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam(required = false) String unitId) {
        Long salonId = resolverSalao(unitId);
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDateTime inicio = yearMonth.atDay(1).atStartOfDay();
        LocalDateTime fim = yearMonth.plusMonths(1).atDay(1).atStartOfDay();
        YearMonth anterior = yearMonth.minusMonths(1);
        LocalDateTime inicioAnterior = anterior.atDay(1).atStartOfDay();

        // Receita por dia; semanas = dias 1–7, 8–14, 15–21 e 22 até o fim do mês
        List<DailyRevenue> porDia = new ArrayList<>();
        double[] porSemana = new double[4];
        BigDecimal receita = BigDecimal.ZERO;
        for (int dia = 1; dia <= yearMonth.lengthOfMonth(); dia++) {
            LocalDate data = yearMonth.atDay(dia);
            BigDecimal valor = relatorioFinanceiroService.receita(salonId, data.atStartOfDay(), data.plusDays(1).atStartOfDay());
            receita = receita.add(valor);
            porDia.add(new DailyRevenue(data.toString(), reais(valor)));
            porSemana[Math.min((dia - 1) / 7, 3)] += valor.doubleValue();
        }
        List<Double> semanas = Arrays.stream(porSemana).map(v -> Math.round(v * 100) / 100.0).boxed().toList();
        BigDecimal receitaAnterior = relatorioFinanceiroService.receita(salonId, inicioAnterior, inicio);

        BigDecimal despesas = relatorioFinanceiroService.despesas(salonId, inicio, fim);
        BigDecimal despesasAnterior = relatorioFinanceiroService.despesas(salonId, inicioAnterior, inicio);
        List<ExpenseByCategory> porCategoria = new ArrayList<>();
        final BigDecimal totalDespesas = despesas;
        relatorioFinanceiroService.despesasPorCategoria(salonId, inicio, fim).forEach((categoria, valor) ->
                porCategoria.add(new ExpenseByCategory(categoria, categoria, reais(valor),
                        totalDespesas.signum() > 0 ? Math.round(valor.doubleValue() * 1000.0 / totalDespesas.doubleValue()) / 10.0 : 0.0)));

        BigDecimal lucro = receita.subtract(despesas);
        BigDecimal lucroAnterior = receitaAnterior.subtract(despesasAnterior);
        double margem = receita.signum() > 0 ? Math.round(lucro.doubleValue() * 1000.0 / receita.doubleValue()) / 10.0 : 0.0;

        // Atendimentos pelo horário marcado; taxa de conclusão sobre os que não foram cancelados
        Map<StatusAgendamento, Long> porStatus = relatorioFinanceiroService.agendamentosPorStatus(salonId, inicio, fim);
        long total = porStatus.values().stream().mapToLong(Long::longValue).sum();
        long cancelados = porStatus.getOrDefault(StatusAgendamento.CANCELADO, 0L);
        long concluidos = porStatus.getOrDefault(StatusAgendamento.CONCLUIDO, 0L);
        // Mês em andamento: média pelos dias já passados
        LocalDate hoje = LocalDate.now();
        int diasConsiderados = yearMonth.equals(YearMonth.from(hoje)) ? hoje.getDayOfMonth() : yearMonth.lengthOfMonth();
        MonthlyAppointmentsSummary appointments = new MonthlyAppointmentsSummary((int) total,
                Math.round(total * 10.0 / diasConsiderados) / 10.0,
                total - cancelados > 0 ? Math.round(concluidos * 1000.0 / (total - cancelados)) / 10.0 : 0.0);

        List<TopService> topServices = relatorioFinanceiroService.topServicos(salonId, inicio, fim, 5).stream()
                .map(r -> new TopService(String.valueOf(r.id()), r.nome(), reais(r.total()), r.atendimentos()))
                .toList();
        List<TopProfessional> topProfessionals = relatorioFinanceiroService.topProfissionais(salonId, inicio, fim, 5).stream()
                .map(r -> new TopProfessional(String.valueOf(r.id()), r.nome(), reais(r.total()), r.atendimentos()))
                .toList();

        // Recebido no mês por forma (mesma regra do caixa); transferência entra com débito, como no caixa
        Map<FormaPagamento, BigDecimal> formas = recebidoPorForma(salonId, inicio, fim);
        DailyPaymentMethods paymentMethods = new DailyPaymentMethods(
                formaTotal(formas, FormaPagamento.DINHEIRO),
                formaTotal(formas, FormaPagamento.PIX),
                formaTotal(formas, FormaPagamento.CARTAO_CREDITO),
                formaTotal(formas, FormaPagamento.CARTAO_DEBITO) + formaTotal(formas, FormaPagamento.TRANSFERENCIA),
                formaTotal(formas, FormaPagamento.VALE));

        return ResponseEntity.ok(new MonthlyReportResponse(
            month,
            year,
            String.valueOf(salonId),
            new RevenueData(reais(receita), semanas, porDia, new Comparison(reais(receitaAnterior), variacao(receita, receitaAnterior))),
            new ExpensesData(reais(despesas), porCategoria, new Comparison(reais(despesasAnterior), variacao(despesas, despesasAnterior))),
            new ProfitData(reais(lucro), margem, new Comparison(reais(lucroAnterior), variacao(lucro, lucroAnterior))),
            appointments,
            topServices,
            topProfessionals,
            paymentMethods
        ));
    }

    @GetMapping("/reports/daily")
    @Transactional(readOnly = true)
    @Operation(summary = "Relatório diário", description = "Retorna relatório financeiro do dia, calculado a partir dos pagamentos e agendamentos reais")
    public ResponseEntity<DailyReportResponse> getDailyReport(
            @RequestParam String date,
            @RequestParam(required = false) String unitId) {
        Long salonId = resolverSalao(unitId);
        log.debug("Getting daily report for {} salonId: {}", date, salonId);

        LocalDate targetDate = parseDateFlexible(date);
        LocalDateTime inicio = targetDate.atStartOfDay();
        LocalDateTime fim = targetDate.plusDays(1).atStartOfDay();

        Map<FormaPagamento, BigDecimal> totals = recebidoPorForma(salonId, inicio, fim);
        double cashTotal = formaTotal(totals, FormaPagamento.DINHEIRO);
        double pixTotal = formaTotal(totals, FormaPagamento.PIX);
        double creditCardTotal = formaTotal(totals, FormaPagamento.CARTAO_CREDITO);
        double debitCardTotal = formaTotal(totals, FormaPagamento.CARTAO_DEBITO) + formaTotal(totals, FormaPagamento.TRANSFERENCIA);
        double voucherTotal = formaTotal(totals, FormaPagamento.VALE);
        double totalRevenue = cashTotal + pixTotal + creditCardTotal + debitCardTotal + voucherTotal;

        // Revenue breakdown — every real payment is currently for a service; there is no
        // product/package/tip tracking yet, so those stay at 0 rather than showing fake numbers.
        DailyRevenueSummary revenue = new DailyRevenueSummary(totalRevenue, 0.0, 0.0, 0.0, 0.0, totalRevenue);

        // Despesas reais: movimentações DESPESA registradas no caixa no dia, por categoria
        double totalDespesas = movimentacaoCaixaRepository
                .sumBySalonAndTipoAndPeriod(salonId, TipoMovimentacaoCaixa.DESPESA, inicio, fim).doubleValue();
        List<ExpenseByCategory> porCategoria = new ArrayList<>();
        for (Object[] row : movimentacaoCaixaRepository.sumByCategoriaAndPeriod(salonId, TipoMovimentacaoCaixa.DESPESA, inicio, fim)) {
            String categoria = row[0] != null ? (String) row[0] : "other_expense";
            double valor = ((BigDecimal) row[1]).doubleValue();
            porCategoria.add(new ExpenseByCategory(categoria, categoria, valor,
                    totalDespesas > 0 ? Math.round(valor * 1000.0 / totalDespesas) / 10.0 : 0.0));
        }
        DailyExpensesSummary expenses = new DailyExpensesSummary(totalDespesas, porCategoria);

        DailyPaymentMethods paymentMethods = new DailyPaymentMethods(
            cashTotal, pixTotal, creditCardTotal, debitCardTotal, voucherTotal
        );

        int total = 0;
        int completed = 0;
        int canceled = 0;
        int noShow = 0;
        for (Object[] row : agendamentoRepository.countByStatusAndPeriod(salonId, inicio, fim)) {
            StatusAgendamento status = (StatusAgendamento) row[0];
            long count = (Long) row[1];
            total += count;
            if (status == StatusAgendamento.CONCLUIDO) completed += count;
            else if (status == StatusAgendamento.CANCELADO) canceled += count;
            else if (status == StatusAgendamento.NO_SHOW) noShow += count;
        }
        DailyAppointmentsSummary appointments = new DailyAppointmentsSummary(total, completed, canceled, noShow);

        BigDecimal avgTicket = pagamentoRepository.avgTicketMedioBySalonIdAndPeriod(salonId, inicio, fim);
        double averageTicket = avgTicket != null ? avgTicket.doubleValue() : 0.0;

        Optional<Caixa> caixaAberto = caixaService.buscarAberto(salonId);
        DailyReportResponse report = new DailyReportResponse(
            date,
            caixaAberto.map(c -> String.valueOf(c.getId())).orElse(null),
            caixaAberto.isPresent() ? "open" : "closed",
            revenue,
            expenses,
            paymentMethods,
            appointments,
            averageTicket,
            totalRevenue - totalDespesas
        );

        return ResponseEntity.ok(report);
    }

    // Response records

    // Transaction records (backed by real Pagamento data)
    public record TransactionResponse(
        String id,
        String cashRegisterId,
        String unitId,
        String type,
        String category,
        String description,
        double amount,
        String paymentMethod,
        String appointmentId,
        String clientId,
        String clientName,
        String createdById,
        String createdByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}

    public record PaginatedTransactionsResponse(
        List<TransactionResponse> data,
        List<TransactionResponse> items,
        PageMeta meta
    ) {}

    public record PageMeta(
        long total,
        int page,
        int limit,
        int totalPages,
        boolean hasNextPage,
        boolean hasPrevPage
    ) {}

    public record FinanceStatsResponse(
        TodayStats today,
        WeekStats week,
        MonthStats month,
        double pendingExpenses,
        double pendingCommissions
    ) {}

    public record TodayStats(
        double revenue,
        double expenses,
        double profit,
        int appointments,
        double averageTicket
    ) {}

    public record WeekStats(
        double revenue,
        double expenses,
        double profit
    ) {}

    public record MonthStats(
        double revenue,
        double expenses,
        double profit,
        double revenueTarget,
        double targetProgress
    ) {}

    public record MonthlyReportResponse(
        int month,
        int year,
        String unitId,
        RevenueData revenue,
        ExpensesData expenses,
        ProfitData profit,
        MonthlyAppointmentsSummary appointments,
        List<TopService> topServices,
        List<TopProfessional> topProfessionals,
        DailyPaymentMethods paymentMethods
    ) {}

    public record ProfitData(
        double total,
        double margin,
        Comparison comparison
    ) {}

    public record MonthlyAppointmentsSummary(
        int total,
        double averagePerDay,
        double completionRate
    ) {}

    public record DailyReportResponse(
        String date,
        String cashRegisterId,
        String status,
        DailyRevenueSummary revenue,
        DailyExpensesSummary expenses,
        DailyPaymentMethods paymentMethods,
        DailyAppointmentsSummary appointments,
        double averageTicket,
        double profit
    ) {}

    public record DailyRevenueSummary(
        double services,
        double products,
        double packages,
        double tips,
        double other,
        double total
    ) {}

    public record DailyExpensesSummary(
        double total,
        List<ExpenseByCategory> byCategory
    ) {}

    public record DailyPaymentMethods(
        double cash,
        double pix,
        double creditCard,
        double debitCard,
        double voucher
    ) {}

    public record DailyAppointmentsSummary(
        int total,
        int completed,
        int canceled,
        int noShow
    ) {}

    public record RevenueData(
        double total,
        List<Double> byWeek,
        List<DailyRevenue> byDay,
        Comparison comparison
    ) {}

    public record ExpensesData(
        double total,
        List<ExpenseByCategory> byCategory,
        Comparison comparison
    ) {}

    public record DailyRevenue(String date, double amount) {}

    public record ExpenseByCategory(
        String categoryId,
        String categoryName,
        double amount,
        double percentage
    ) {}

    public record Comparison(double previousMonth, double percentageChange) {}

    public record PaymentMethod(
        String id,
        String name,
        double amount,
        double percentage
    ) {}

    public record TopService(
        String serviceId,
        String serviceName,
        double revenue,
        int count
    ) {}

    public record TopProfessional(
        String professionalId,
        String professionalName,
        double revenue,
        int appointments
    ) {}

    // Cash Register records
    public record CashRegisterResponse(
        String id,
        String unitId,
        String openedById,
        String openedByName,
        String status,
        LocalDateTime openedAt,
        LocalDateTime closedAt,
        String closedById,
        String closedByName,
        double openingBalance,
        double totalIncome,
        double totalExpenses,
        double totalWithdrawals,
        double cashTotal,
        double pixTotal,
        double creditCardTotal,
        double debitCardTotal,
        double voucherTotal,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String openingNotes,
        Double closingBalance,
        double expectedBalance,
        Double difference,
        String closingNotes,
        double totalSupplies
    ) {}

    public record PaginatedCashRegistersResponse(
        List<CashRegisterResponse> data,
        List<CashRegisterResponse> items,
        PageMeta meta
    ) {}

    public record CashRegisterOpenRequest(
        String unitId,
        double openingBalance,
        String openingNotes,
        String notes
    ) {}

    public record CashRegisterCloseRequest(
        Double closingBalance,
        String closingNotes,
        String notes
    ) {}

    public record WithdrawalRequest(
        Double amount,
        String reason
    ) {}

    public record TransactionCreateRequest(
        String type,
        String category,
        String description,
        Double amount,
        String paymentMethod,
        String notes
    ) {}
}
