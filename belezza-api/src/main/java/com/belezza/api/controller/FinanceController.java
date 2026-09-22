package com.belezza.api.controller;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.FormaPagamento;
import com.belezza.api.entity.Pagamento;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Servico;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.PagamentoRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@RestController
@RequestMapping("/api/salon/finance")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Finanças", description = "Gerenciamento financeiro do salão")
public class FinanceController {

    private final PagamentoRepository pagamentoRepository;

    // ===== TRANSACTIONS =====

    @GetMapping("/transactions")
    @Transactional(readOnly = true)
    @Operation(summary = "Listar transações", description = "Lista os pagamentos registrados como transações do caixa. RECEPCIONISTA recebe apenas os que ela mesma registrou.")
    public ResponseEntity<PaginatedTransactionsResponse> listTransactions(
            @RequestParam(required = false, defaultValue = "1") Long unitId,
            @RequestParam(required = false, defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "50") int limit,
            @AuthenticationPrincipal Usuario operador) {
        log.debug("Listing finance transactions for unitId: {}", unitId);

        // Frontend pagination is 1-based; Spring's Pageable is 0-based.
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by(Sort.Direction.DESC, "criadoEm"));

        Page<Pagamento> pagamentos = (operador != null && operador.getRole() == Role.RECEPCIONISTA)
                ? pagamentoRepository.findBySalonIdAndRegistradoPorId(unitId, operador.getId(), pageable)
                : pagamentoRepository.findBySalonId(unitId, pageable);

        List<TransactionResponse> data = pagamentos.getContent().stream()
                .map(this::toTransactionResponse)
                .toList();

        PageMeta meta = new PageMeta(
                pagamentos.getTotalElements(),
                page,
                limit,
                pagamentos.getTotalPages(),
                pagamentos.hasNext(),
                pagamentos.hasPrevious()
        );

        return ResponseEntity.ok(new PaginatedTransactionsResponse(data, data, meta));
    }

    private TransactionResponse toTransactionResponse(Pagamento pagamento) {
        Agendamento agendamento = pagamento.getAgendamento();
        Cliente cliente = agendamento != null ? agendamento.getCliente() : null;
        Servico servico = agendamento != null ? agendamento.getServico() : null;

        String clienteNome = cliente != null && cliente.getUsuario() != null
                ? cliente.getUsuario().getNome() : null;
        String servicoNome = servico != null ? servico.getNome() : "Atendimento";

        return new TransactionResponse(
                String.valueOf(pagamento.getId()),
                String.valueOf(pagamento.getSalon().getId()),
                String.valueOf(pagamento.getSalon().getId()),
                "income",
                "service",
                clienteNome != null ? servicoNome + " - " + clienteNome : servicoNome,
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

    // ===== CASH REGISTER =====

    @GetMapping("/cash-register/current")
    @Operation(summary = "Caixa atual", description = "Retorna o caixa aberto atual")
    public ResponseEntity<CashRegisterResponse> getCurrentCashRegister(
            @RequestParam(required = false) String unitId) {
        log.debug("Getting current cash register for unitId: {}", unitId);

        // Mock data - returns an open cash register
        CashRegisterResponse cashRegister = new CashRegisterResponse(
            "1",
            unitId != null ? unitId : "1",
            "1",
            "Admin",
            "open",
            LocalDateTime.now().minusHours(8),
            null,
            null,
            null,
            200.0,
            1850.0,
            150.0,
            100.0,
            800.0,
            650.0,
            300.0,
            100.0,
            0.0,
            LocalDateTime.now().minusHours(8),
            LocalDateTime.now()
        );

        return ResponseEntity.ok(cashRegister);
    }

    @GetMapping("/cash-register/{id}")
    @Operation(summary = "Buscar caixa por ID", description = "Retorna um caixa específico")
    public ResponseEntity<CashRegisterResponse> getCashRegisterById(@PathVariable String id) {
        log.debug("Getting cash register by id: {}", id);

        CashRegisterResponse cashRegister = new CashRegisterResponse(
            id,
            "1",
            "1",
            "Admin",
            "closed",
            LocalDateTime.now().minusDays(1).withHour(9),
            LocalDateTime.now().minusDays(1).withHour(18),
            "1",
            "Admin",
            200.0,
            2500.0,
            300.0,
            200.0,
            1000.0,
            800.0,
            500.0,
            200.0,
            0.0,
            LocalDateTime.now().minusDays(1),
            LocalDateTime.now().minusDays(1)
        );

        return ResponseEntity.ok(cashRegister);
    }

    @PostMapping("/cash-register/open")
    @Operation(summary = "Abrir caixa", description = "Abre um novo caixa")
    public ResponseEntity<CashRegisterResponse> openCashRegister(
            @RequestBody CashRegisterOpenRequest request) {
        log.debug("Opening cash register with balance: {}", request.openingBalance());

        CashRegisterResponse cashRegister = new CashRegisterResponse(
            UUID.randomUUID().toString(),
            request.unitId() != null ? request.unitId() : "1",
            "1",
            "Admin",
            "open",
            LocalDateTime.now(),
            null,
            null,
            null,
            request.openingBalance(),
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        return ResponseEntity.ok(cashRegister);
    }

    @PostMapping("/cash-register/{id}/close")
    @Operation(summary = "Fechar caixa", description = "Fecha o caixa atual")
    public ResponseEntity<CashRegisterResponse> closeCashRegister(
            @PathVariable String id,
            @RequestBody CashRegisterCloseRequest request) {
        log.debug("Closing cash register {} with balance: {}", id, request.closingBalance());

        CashRegisterResponse cashRegister = new CashRegisterResponse(
            id,
            "1",
            "1",
            "Admin",
            "closed",
            LocalDateTime.now().minusHours(8),
            LocalDateTime.now(),
            "1",
            "Admin",
            200.0,
            1850.0,
            150.0,
            100.0,
            800.0,
            650.0,
            300.0,
            100.0,
            0.0,
            LocalDateTime.now().minusHours(8),
            LocalDateTime.now()
        );

        return ResponseEntity.ok(cashRegister);
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
    @Operation(summary = "Relatório diário", description = "Retorna relatório financeiro do dia")
    public ResponseEntity<DailyReportResponse> getDailyReport(
            @RequestParam String date,
            @RequestParam(required = false) String unitId) {
        log.debug("Getting daily report for {} unitId: {}", date, unitId);

        // Revenue breakdown
        DailyRevenueSummary revenue = new DailyRevenueSummary(
            1500.0,  // services
            250.0,   // products
            100.0,   // packages
            50.0,    // tips
            0.0,     // other
            1900.0   // total
        );

        // Expenses breakdown
        List<ExpenseByCategory> expenseCategories = Arrays.asList(
            new ExpenseByCategory("1", "Produtos", 150.0, 50.0),
            new ExpenseByCategory("2", "Alimentação", 80.0, 26.7),
            new ExpenseByCategory("3", "Outros", 70.0, 23.3)
        );
        DailyExpensesSummary expenses = new DailyExpensesSummary(300.0, expenseCategories);

        // Payment methods
        DailyPaymentMethods paymentMethods = new DailyPaymentMethods(
            400.0,   // cash
            800.0,   // pix
            450.0,   // creditCard
            200.0,   // debitCard
            50.0     // voucher
        );

        // Appointments
        DailyAppointmentsSummary appointments = new DailyAppointmentsSummary(
            15,  // total
            12,  // completed
            2,   // canceled
            1    // noShow
        );

        DailyReportResponse report = new DailyReportResponse(
            date,
            "1",      // cashRegisterId
            "open",   // status
            revenue,
            expenses,
            paymentMethods,
            appointments,
            158.33,   // averageTicket
            1600.0    // profit
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
        LocalDateTime updatedAt
    ) {}

    public record CashRegisterOpenRequest(
        String unitId,
        double openingBalance,
        String notes
    ) {}

    public record CashRegisterCloseRequest(
        double closingBalance,
        String notes
    ) {}
}
