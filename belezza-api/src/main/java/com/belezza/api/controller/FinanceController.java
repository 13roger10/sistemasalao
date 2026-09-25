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

    /**
     * Sums approved payments for a salon/period grouped by payment method.
     * Backs both the current cash register summary and the daily report —
     * both must reflect real Pagamento rows, never fixed placeholder totals.
     */
    private Map<FormaPagamento, BigDecimal> sumByForma(Long salonId, LocalDateTime inicio, LocalDateTime fim) {
        Map<FormaPagamento, BigDecimal> totals = new EnumMap<>(FormaPagamento.class);
        for (Object[] row : pagamentoRepository.sumByFormaPagamentoAndPeriod(salonId, inicio, fim)) {
            totals.put((FormaPagamento) row[0], (BigDecimal) row[2]);
        }
        return totals;
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

    @GetMapping("/stats")
    @Operation(summary = "Estatísticas financeiras", description = "Retorna estatísticas financeiras do salão")
    public ResponseEntity<FinanceStatsResponse> getStats(@RequestParam(required = false) String unitId) {
        log.debug("Getting finance stats for unitId: {}", unitId);

        // Mock data - to be replaced with real service implementation
        TodayStats today = new TodayStats(
            1850.0,    // revenue
            450.0,     // expenses
            1400.0,    // profit
            12,        // appointments
            154.17     // averageTicket
        );

        WeekStats week = new WeekStats(
            12500.0,   // revenue
            3200.0,    // expenses
            9300.0     // profit
        );

        MonthStats month = new MonthStats(
            45750.0,   // revenue
            12500.0,   // expenses
            33250.0,   // profit
            50000.0,   // revenueTarget
            91.5       // targetProgress
        );

        FinanceStatsResponse stats = new FinanceStatsResponse(
            today,
            week,
            month,
            2500.0,    // pendingExpenses
            1800.0     // pendingCommissions
        );

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/reports/monthly")
    @Operation(summary = "Relatório mensal", description = "Retorna relatório financeiro mensal")
    public ResponseEntity<MonthlyReportResponse> getMonthlyReport(
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam(required = false) String unitId) {
        log.debug("Getting monthly report for {}/{} unitId: {}", month, year, unitId);

        YearMonth yearMonth = YearMonth.of(year, month);
        int daysInMonth = yearMonth.lengthOfMonth();

        // Generate daily revenue data
        List<DailyRevenue> dailyRevenue = new ArrayList<>();
        Random random = new Random(year * 100 + month); // Consistent seed for same month
        for (int day = 1; day <= daysInMonth; day++) {
            LocalDate date = LocalDate.of(year, month, day);
            double amount = 1200 + random.nextDouble() * 800;
            dailyRevenue.add(new DailyRevenue(date.toString(), amount));
        }

        // Weekly revenue (4 weeks)
        List<Double> weeklyRevenue = Arrays.asList(10500.0, 12300.0, 11200.0, 11750.0);

        // Expense categories
        List<ExpenseByCategory> expensesByCategory = Arrays.asList(
            new ExpenseByCategory("1", "Produtos", 5000.0, 40.0),
            new ExpenseByCategory("2", "Aluguel", 3500.0, 28.0),
            new ExpenseByCategory("3", "Contas", 2000.0, 16.0),
            new ExpenseByCategory("4", "Marketing", 1500.0, 12.0),
            new ExpenseByCategory("5", "Outros", 500.0, 4.0)
        );

        // Revenue comparison
        RevenueData revenue = new RevenueData(
            45750.0,
            weeklyRevenue,
            dailyRevenue,
            new Comparison(42000.0, 8.9)
        );

        // Expenses data
        ExpensesData expenses = new ExpensesData(
            12500.0,
            expensesByCategory,
            new Comparison(12800.0, -2.3)
        );

        // Profit data
        ProfitData profit = new ProfitData(
            33250.0,       // total
            72.7,          // margin percentage
            new Comparison(30500.0, 9.0)
        );

        // Appointments summary
        MonthlyAppointmentsSummary appointments = new MonthlyAppointmentsSummary(
            156,    // total
            5.2,    // averagePerDay
            92.5    // completionRate
        );

        // Top services
        List<TopService> topServices = Arrays.asList(
            new TopService("1", "Corte Masculino", 7800.0, 156),
            new TopService("2", "Barba", 4020.0, 134),
            new TopService("3", "Corte + Barba", 6230.0, 89),
            new TopService("4", "Hidratação", 2700.0, 45),
            new TopService("5", "Coloração", 3450.0, 23)
        );

        // Top professionals
        List<TopProfessional> topProfessionals = Arrays.asList(
            new TopProfessional("1", "Carlos Silva", 12500.0, 89),
            new TopProfessional("2", "Ana Santos", 10800.0, 76),
            new TopProfessional("3", "Pedro Lima", 9200.0, 65)
        );

        MonthlyReportResponse report = new MonthlyReportResponse(
            month,
            year,
            unitId,
            revenue,
            expenses,
            profit,
            appointments,
            topServices,
            topProfessionals
        );

        return ResponseEntity.ok(report);
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

        Map<FormaPagamento, BigDecimal> totals = sumByForma(salonId, inicio, fim);
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
        List<TopProfessional> topProfessionals
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
