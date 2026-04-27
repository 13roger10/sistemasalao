"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Minus,
  DollarSign,
  CreditCard,
  Wallet,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  User,
  Scissors,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  History,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { DataTable, Column, ActionMenuItem } from "@/components/ui/DataTable";
import { financeService } from "@/services/salon/financeService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type {
  CashRegister,
  CashRegisterOpenInput,
  CashRegisterCloseInput,
  Transaction,
  TransactionCreateInput,
  TransactionType,
  TransactionCategory,
  DailyReport,
} from "@/types/salon";
import type { PaymentMethod } from "@/types/salon/common";

// ===== TIPOS =====
interface AuditLog {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

// ===== COMPONENTES AUXILIARES =====

// Badge de Status do Caixa
const CashStatusBadge = ({ status }: { status: "open" | "closed" }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
        status === "open"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
      }`}
    >
      {status === "open" ? (
        <Unlock className="h-4 w-4" />
      ) : (
        <Lock className="h-4 w-4" />
      )}
      {status === "open" ? "Aberto" : "Fechado"}
    </span>
  );
};

// Badge de Tipo de Transação
const TransactionTypeBadge = ({ type }: { type: TransactionType }) => {
  const config = {
    income: {
      label: "Entrada",
      icon: <ArrowUpRight className="h-3 w-3" />,
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
    },
    expense: {
      label: "Saída",
      icon: <ArrowDownRight className="h-3 w-3" />,
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
    },
    withdrawal: {
      label: "Sangria",
      icon: <Minus className="h-3 w-3" />,
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-400",
    },
  };

  const { label, icon, bg, text } = config[type];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
};

// Badge de Forma de Pagamento
const PaymentMethodBadge = ({ method }: { method: PaymentMethod }) => {
  const config: Record<PaymentMethod, { label: string; icon: React.ReactNode }> = {
    cash: { label: "Dinheiro", icon: <Wallet className="h-3 w-3" /> },
    pix: { label: "PIX", icon: <QrCode className="h-3 w-3" /> },
    credit_card: { label: "Crédito", icon: <CreditCard className="h-3 w-3" /> },
    debit_card: { label: "Débito", icon: <CreditCard className="h-3 w-3" /> },
    voucher: { label: "Voucher", icon: <Receipt className="h-3 w-3" /> },
    loyalty_points: { label: "Pontos", icon: <DollarSign className="h-3 w-3" /> },
  };

  const { label, icon } = config[method] || { label: method, icon: <DollarSign className="h-3 w-3" /> };

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      {icon}
      {label}
    </span>
  );
};

// Card de Estatísticas
const StatsCard = ({
  icon,
  label,
  value,
  color,
  trend,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  trend?: { value: number; positive: boolean };
  subtitle?: string;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start justify-between">
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      {trend && (
        <span
          className={`flex items-center gap-1 text-xs font-medium ${
            trend.positive ? "text-green-500" : "text-red-500"
          }`}
        >
          {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(trend.value)}%
        </span>
      )}
    </div>
    <div className="mt-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  </div>
);

// Card de Forma de Pagamento
const PaymentMethodCard = ({
  icon,
  label,
  value,
  percentage,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  percentage: number;
}) => (
  <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700 mb-2">
      {icon}
    </div>
    <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
    <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)}
    </p>
    <p className="text-xs text-gray-500 dark:text-gray-400">{percentage.toFixed(1)}%</p>
  </div>
);

// ===== COMPONENTE PRINCIPAL =====
export default function FinanceCashPage() {
  const { user } = useSalonAuth();
  const isRecepcionist = user?.role === "RECEPCIONIST";

  // Estados principais
  const [currentCashRegister, setCurrentCashRegister] = useState<CashRegister | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Estados de loading
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de modais
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Estados dos formulários
  const [openCashForm, setOpenCashForm] = useState<CashRegisterOpenInput>({
    unitId: "1",
    openingBalance: 0,
    openingNotes: "",
  });

  const [closeCashForm, setCloseCashForm] = useState<CashRegisterCloseInput>({
    closingBalance: 0,
    closingNotes: "",
  });

  const [transactionForm, setTransactionForm] = useState<TransactionCreateInput>({
    type: "income",
    category: "service",
    description: "",
    amount: 0,
    paymentMethod: "cash",
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: 0,
    reason: "",
  });

  // Funções de formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Carregar dados
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Carregar caixa atual
      const cashRegister = await financeService.cashRegister.getCurrent("1");
      setCurrentCashRegister(cashRegister);

      // Carregar relatório diário
      const report = await financeService.reports.daily(selectedDate);
      setDailyReport(report);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);

      // Mock data
      const mockCashRegister: CashRegister = {
        id: "1",
        unitId: "1",
        openedById: "1",
        openedByName: user?.name || "Admin",
        status: "open",
        openedAt: new Date(),
        openingBalance: 200,
        totalIncome: 1850,
        totalExpenses: 150,
        totalWithdrawals: 100,
        cashTotal: 800,
        pixTotal: 650,
        creditCardTotal: 300,
        debitCardTotal: 100,
        voucherTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setCurrentCashRegister(mockCashRegister);

      // Mock transactions
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          cashRegisterId: "1",
          unitId: "1",
          type: "income",
          category: "service",
          description: "Corte Masculino - João Silva",
          amount: 50,
          paymentMethod: "pix",
          clientId: "1",
          clientName: "João Silva",
          createdById: "1",
          createdByName: "Carlos",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          cashRegisterId: "1",
          unitId: "1",
          type: "income",
          category: "service",
          description: "Coloração - Maria Santos",
          amount: 150,
          paymentMethod: "credit_card",
          clientId: "2",
          clientName: "Maria Santos",
          createdById: "2",
          createdByName: "Ana",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          cashRegisterId: "1",
          unitId: "1",
          type: "income",
          category: "service",
          description: "Corte + Barba - Pedro Oliveira",
          amount: 70,
          paymentMethod: "cash",
          clientId: "3",
          clientName: "Pedro Oliveira",
          createdById: "1",
          createdByName: "Carlos",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "4",
          cashRegisterId: "1",
          unitId: "1",
          type: "expense",
          category: "supplies",
          description: "Compra de produtos - Shampoo",
          amount: 150,
          paymentMethod: "pix",
          createdById: "1",
          createdByName: "Admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "5",
          cashRegisterId: "1",
          unitId: "1",
          type: "withdrawal",
          category: "other_expense",
          description: "Sangria - Pagamento fornecedor",
          amount: 100,
          paymentMethod: "cash",
          createdById: "1",
          createdByName: "Admin",
          notes: "Pagamento fornecedor de toalhas",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      setTransactions(mockTransactions);

      // Mock daily report
      const mockReport: DailyReport = {
        date: selectedDate,
        cashRegisterId: "1",
        status: "open",
        revenue: {
          services: 1650,
          products: 150,
          packages: 50,
          tips: 0,
          other: 0,
          total: 1850,
        },
        expenses: {
          total: 150,
          byCategory: [
            { categoryId: "1", categoryName: "Produtos", amount: 100 },
            { categoryId: "2", categoryName: "Manutenção", amount: 50 },
          ],
        },
        paymentMethods: {
          cash: 800,
          pix: 650,
          creditCard: 300,
          debitCard: 100,
          voucher: 0,
        },
        appointments: {
          total: 15,
          completed: 12,
          canceled: 2,
          noShow: 1,
        },
        averageTicket: 154.17,
        profit: 1700,
      };
      setDailyReport(mockReport);

      // Mock audit logs
      const mockLogs: AuditLog[] = [
        {
          id: "1",
          action: "CASH_OPEN",
          description: "Caixa aberto com saldo inicial de R$ 200,00",
          userId: "1",
          userName: "Admin",
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        },
        {
          id: "2",
          action: "TRANSACTION_CREATE",
          description: "Transação criada: Corte Masculino - R$ 50,00",
          userId: "1",
          userName: "Carlos",
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        },
        {
          id: "3",
          action: "WITHDRAWAL",
          description: "Sangria realizada: R$ 100,00 - Pagamento fornecedor",
          userId: "1",
          userName: "Admin",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      ];
      setAuditLogs(mockLogs);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, user?.name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleOpenCash = async () => {
    setIsSubmitting(true);
    try {
      await financeService.cashRegister.open(openCashForm);
      setIsOpenCashModalOpen(false);
      setOpenCashForm({ unitId: "1", openingBalance: 0, openingNotes: "" });
      loadData();
    } catch (error) {
      console.error("Erro ao abrir caixa:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseCash = async () => {
    if (!currentCashRegister) return;

    setIsSubmitting(true);
    try {
      await financeService.cashRegister.close(currentCashRegister.id, closeCashForm);
      setIsCloseCashModalOpen(false);
      setCloseCashForm({ closingBalance: 0, closingNotes: "" });
      loadData();
    } catch (error) {
      console.error("Erro ao fechar caixa:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!transactionForm.description || transactionForm.amount <= 0) return;

    setIsSubmitting(true);
    try {
      await financeService.transactions.create(transactionForm);
      setIsAddTransactionModalOpen(false);
      setTransactionForm({
        type: "income",
        category: "service",
        description: "",
        amount: 0,
        paymentMethod: "cash",
      });
      loadData();
    } catch (error) {
      console.error("Erro ao criar transação:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!currentCashRegister || withdrawalForm.amount <= 0 || !withdrawalForm.reason) return;

    setIsSubmitting(true);
    try {
      await financeService.cashRegister.addWithdrawal(
        currentCashRegister.id,
        withdrawalForm.amount,
        withdrawalForm.reason
      );
      setIsWithdrawalModalOpen(false);
      setWithdrawalForm({ amount: 0, reason: "" });
      loadData();
    } catch (error) {
      console.error("Erro ao realizar sangria:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      // Criar dados para exportação
      const data = transactions.map((t) => ({
        Data: formatDateTime(t.createdAt),
        Tipo: t.type === "income" ? "Entrada" : t.type === "expense" ? "Saída" : "Sangria",
        Categoria: t.category,
        Descrição: t.description,
        Valor: t.amount,
        "Forma de Pagamento": t.paymentMethod,
        Cliente: t.clientName || "-",
        Responsável: t.createdByName,
      }));

      // Simular download (em produção usaria uma biblioteca como xlsx)
      const csv = [
        Object.keys(data[0]).join(","),
        ...data.map((row) => Object.values(row).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `caixa_${selectedDate.toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar:", error);
    }
  };

  // Calcular saldo esperado
  const expectedBalance = useMemo(() => {
    if (!currentCashRegister) return 0;
    return (
      currentCashRegister.openingBalance +
      currentCashRegister.cashTotal -
      currentCashRegister.totalWithdrawals
    );
  }, [currentCashRegister]);

  // Calcular totais por forma de pagamento
  const paymentMethodTotals = useMemo(() => {
    if (!dailyReport) return null;
    const total =
      dailyReport.paymentMethods.cash +
      dailyReport.paymentMethods.pix +
      dailyReport.paymentMethods.creditCard +
      dailyReport.paymentMethods.debitCard +
      dailyReport.paymentMethods.voucher;

    return {
      cash: { value: dailyReport.paymentMethods.cash, percentage: (dailyReport.paymentMethods.cash / total) * 100 },
      pix: { value: dailyReport.paymentMethods.pix, percentage: (dailyReport.paymentMethods.pix / total) * 100 },
      creditCard: { value: dailyReport.paymentMethods.creditCard, percentage: (dailyReport.paymentMethods.creditCard / total) * 100 },
      debitCard: { value: dailyReport.paymentMethods.debitCard, percentage: (dailyReport.paymentMethods.debitCard / total) * 100 },
      voucher: { value: dailyReport.paymentMethods.voucher, percentage: (dailyReport.paymentMethods.voucher / total) * 100 },
    };
  }, [dailyReport]);

  // Para recepcionista: apenas as transações que ela mesma registrou
  const visibleTransactions = isRecepcionist
    ? transactions.filter((t) => t.createdById === user?.id)
    : transactions;

  // Total de entradas visíveis (calculado da lista filtrada para recepcionista)
  const minhasEntradas = visibleTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  // Colunas da tabela de transações
  const transactionColumns: Column<Transaction>[] = [
    {
      key: "time",
      header: "Hora",
      render: (item) => (
        <span className="text-gray-900 dark:text-white">
          {new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (item) => <TransactionTypeBadge type={item.type} />,
    },
    {
      key: "description",
      header: "Descrição",
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{item.description}</p>
          {item.clientName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.clientName}</p>
          )}
        </div>
      ),
    },
    {
      key: "paymentMethod",
      header: "Pagamento",
      render: (item) => <PaymentMethodBadge method={item.paymentMethod} />,
    },
    {
      key: "amount",
      header: "Valor",
      render: (item) => (
        <span
          className={`font-semibold ${
            item.type === "income"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {item.type === "income" ? "+" : "-"} {formatCurrency(item.amount)}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "Responsável",
      render: (item) => (
        <span className="text-gray-600 dark:text-gray-400">{item.createdByName}</span>
      ),
    },
  ];

  return (
    <SalonLayout requiredRole={["ADMIN", "RECEPCIONIST"]} pageTitle="Caixa">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isRecepcionist ? "Minhas Movimentações" : "Caixa Diário"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {isRecepcionist
                ? "Pagamentos registrados por você hoje"
                : "Gerencie as movimentações financeiras do dia"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {!isRecepcionist && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsLogsModalOpen(true)}
                  leftIcon={<History className="h-4 w-4" />}
                >
                  Logs
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportExcel}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Exportar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status do Caixa */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <DollarSign className="h-7 w-7 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedDate.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </h2>
                  {currentCashRegister && (
                    <CashStatusBadge status={currentCashRegister.status} />
                  )}
                </div>
                {currentCashRegister?.status === "open" && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aberto por {currentCashRegister.openedByName} às{" "}
                    {new Date(currentCashRegister.openedAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {isRecepcionist ? (
                // Recepcionista: apenas registra lançamentos quando o caixa está aberto
                currentCashRegister?.status === "open" && (
                  <Button
                    onClick={() => setIsAddTransactionModalOpen(true)}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Registrar Pagamento
                  </Button>
                )
              ) : (
                !currentCashRegister || currentCashRegister.status === "closed" ? (
                  <Button
                    onClick={() => setIsOpenCashModalOpen(true)}
                    leftIcon={<Unlock className="h-4 w-4" />}
                  >
                    Abrir Caixa
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setIsWithdrawalModalOpen(true)}
                      leftIcon={<Minus className="h-4 w-4" />}
                    >
                      Sangria
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setIsAddTransactionModalOpen(true)}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Lançamento
                    </Button>
                    <Button
                      onClick={() => setIsCloseCashModalOpen(true)}
                      leftIcon={<Lock className="h-4 w-4" />}
                    >
                      Fechar Caixa
                    </Button>
                  </>
                )
              )}
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        {isRecepcionist ? (
          // Recepcionista: apenas o total das entradas que ela registrou
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatsCard
              icon={<ArrowUpRight className="h-5 w-5 text-green-500" />}
              label="Minhas Entradas"
              value={formatCurrency(minhasEntradas)}
              color="bg-green-100 dark:bg-green-900/30"
              subtitle={`${visibleTransactions.filter((t) => t.type === "income").length} pagamentos registrados`}
            />
            <StatsCard
              icon={<Receipt className="h-5 w-5 text-blue-500" />}
              label="Transações Registradas"
              value={String(visibleTransactions.length)}
              color="bg-blue-100 dark:bg-blue-900/30"
              subtitle="Movimentações do dia"
            />
          </div>
        ) : (
          dailyReport && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatsCard
                icon={<ArrowUpRight className="h-5 w-5 text-green-500" />}
                label="Entradas"
                value={formatCurrency(dailyReport.revenue.total)}
                color="bg-green-100 dark:bg-green-900/30"
                subtitle={`${dailyReport.appointments.completed} atendimentos`}
              />
              <StatsCard
                icon={<ArrowDownRight className="h-5 w-5 text-red-500" />}
                label="Saídas"
                value={formatCurrency(dailyReport.expenses.total)}
                color="bg-red-100 dark:bg-red-900/30"
              />
              <StatsCard
                icon={<DollarSign className="h-5 w-5 text-violet-500" />}
                label="Lucro"
                value={formatCurrency(dailyReport.profit)}
                color="bg-violet-100 dark:bg-violet-900/30"
                trend={{ value: 12, positive: true }}
              />
              <StatsCard
                icon={<Receipt className="h-5 w-5 text-blue-500" />}
                label="Ticket Médio"
                value={formatCurrency(dailyReport.averageTicket)}
                color="bg-blue-100 dark:bg-blue-900/30"
              />
              <StatsCard
                icon={<Wallet className="h-5 w-5 text-amber-500" />}
                label="Saldo em Caixa"
                value={formatCurrency(expectedBalance)}
                color="bg-amber-100 dark:bg-amber-900/30"
                subtitle="Dinheiro disponível"
              />
            </div>
          )
        )}

        {/* Formas de Pagamento — visível apenas para ADMIN */}
        {!isRecepcionist && paymentMethodTotals && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Controle por Forma de Pagamento
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <PaymentMethodCard
                icon={<Wallet className="h-5 w-5 text-green-500" />}
                label="Dinheiro"
                value={paymentMethodTotals.cash.value}
                percentage={paymentMethodTotals.cash.percentage}
              />
              <PaymentMethodCard
                icon={<QrCode className="h-5 w-5 text-violet-500" />}
                label="PIX"
                value={paymentMethodTotals.pix.value}
                percentage={paymentMethodTotals.pix.percentage}
              />
              <PaymentMethodCard
                icon={<CreditCard className="h-5 w-5 text-blue-500" />}
                label="Crédito"
                value={paymentMethodTotals.creditCard.value}
                percentage={paymentMethodTotals.creditCard.percentage}
              />
              <PaymentMethodCard
                icon={<CreditCard className="h-5 w-5 text-amber-500" />}
                label="Débito"
                value={paymentMethodTotals.debitCard.value}
                percentage={paymentMethodTotals.debitCard.percentage}
              />
              <PaymentMethodCard
                icon={<Receipt className="h-5 w-5 text-pink-500" />}
                label="Voucher"
                value={paymentMethodTotals.voucher.value}
                percentage={paymentMethodTotals.voucher.percentage}
              />
            </div>
          </div>
        )}

        {/* Lista de Transações */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isRecepcionist ? "Meus Pagamentos Registrados" : "Movimentações do Dia"}
            </h3>
            {isRecepcionist && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Apenas os pagamentos registrados por você
              </p>
            )}
          </div>
          <DataTable
            data={visibleTransactions}
            columns={transactionColumns}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage={
              isRecepcionist
                ? "Nenhum pagamento registrado por você hoje"
                : "Nenhuma movimentação registrada"
            }
            striped
          />
        </div>
      </div>

      {/* Modal de Abrir Caixa */}
      <Modal
        isOpen={isOpenCashModalOpen}
        onClose={() => setIsOpenCashModalOpen(false)}
        title="Abrir Caixa"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpenCashModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenCash} isLoading={isSubmitting}>
              Abrir Caixa
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Saldo Inicial (Dinheiro em caixa) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={openCashForm.openingBalance}
                onChange={(e) =>
                  setOpenCashForm({ ...openCashForm, openingBalance: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações
            </label>
            <textarea
              value={openCashForm.openingNotes}
              onChange={(e) => setOpenCashForm({ ...openCashForm, openingNotes: e.target.value })}
              placeholder="Observações sobre a abertura..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>
      </Modal>

      {/* Modal de Fechar Caixa */}
      <Modal
        isOpen={isCloseCashModalOpen}
        onClose={() => setIsCloseCashModalOpen(false)}
        title="Fechar Caixa"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCloseCashModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCloseCash} isLoading={isSubmitting}>
              Fechar Caixa
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Resumo */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <h4 className="mb-3 font-medium text-gray-900 dark:text-white">Resumo do Dia</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Saldo Inicial:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formatCurrency(currentCashRegister?.openingBalance || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Entradas (Dinheiro):</span>
                <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                  +{formatCurrency(currentCashRegister?.cashTotal || 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Sangrias:</span>
                <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                  -{formatCurrency(currentCashRegister?.totalWithdrawals || 0)}
                </span>
              </div>
              <div className="border-t pt-2 dark:border-gray-700">
                <span className="font-medium text-gray-900 dark:text-white">Saldo Esperado:</span>
                <span className="ml-2 text-lg font-bold text-violet-600 dark:text-violet-400">
                  {formatCurrency(expectedBalance)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Saldo Contado (Dinheiro físico) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={closeCashForm.closingBalance}
                onChange={(e) =>
                  setCloseCashForm({ ...closeCashForm, closingBalance: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Diferença */}
          {closeCashForm.closingBalance > 0 && (
            <div
              className={`rounded-lg p-4 ${
                closeCashForm.closingBalance === expectedBalance
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "bg-yellow-50 dark:bg-yellow-900/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {closeCashForm.closingBalance === expectedBalance ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <span
                  className={`font-medium ${
                    closeCashForm.closingBalance === expectedBalance
                      ? "text-green-700 dark:text-green-400"
                      : "text-yellow-700 dark:text-yellow-400"
                  }`}
                >
                  {closeCashForm.closingBalance === expectedBalance
                    ? "Caixa conferido corretamente!"
                    : `Diferença de ${formatCurrency(Math.abs(closeCashForm.closingBalance - expectedBalance))}`}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações
            </label>
            <textarea
              value={closeCashForm.closingNotes}
              onChange={(e) => setCloseCashForm({ ...closeCashForm, closingNotes: e.target.value })}
              placeholder="Observações sobre o fechamento..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>
      </Modal>

      {/* Modal de Adicionar Transação */}
      <Modal
        isOpen={isAddTransactionModalOpen}
        onClose={() => setIsAddTransactionModalOpen(false)}
        title="Novo Lançamento"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddTransactionModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTransaction} isLoading={isSubmitting}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo *
              </label>
              <select
                value={transactionForm.type}
                onChange={(e) =>
                  setTransactionForm({ ...transactionForm, type: e.target.value as TransactionType })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="income">Entrada</option>
                <option value="expense">Saída</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoria *
              </label>
              <select
                value={transactionForm.category}
                onChange={(e) =>
                  setTransactionForm({
                    ...transactionForm,
                    category: e.target.value as TransactionCategory,
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {transactionForm.type === "income" ? (
                  <>
                    <option value="service">Serviço</option>
                    <option value="product">Produto</option>
                    <option value="package">Pacote/Combo</option>
                    <option value="tip">Gorjeta</option>
                    <option value="other_income">Outros</option>
                  </>
                ) : (
                  <>
                    <option value="supplies">Produtos/Suprimentos</option>
                    <option value="utilities">Contas (Água, Luz)</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="marketing">Marketing</option>
                    <option value="other_expense">Outros</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <Input
            label="Descrição *"
            value={transactionForm.description}
            onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
            placeholder="Descreva o lançamento..."
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(e) =>
                    setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Forma de Pagamento *
              </label>
              <select
                value={transactionForm.paymentMethod}
                onChange={(e) =>
                  setTransactionForm({ ...transactionForm, paymentMethod: e.target.value as PaymentMethod })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="cash">Dinheiro</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="debit_card">Cartão de Débito</option>
                <option value="voucher">Voucher</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de Sangria */}
      <Modal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        title="Realizar Sangria"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsWithdrawalModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleWithdrawal} isLoading={isSubmitting}>
              Confirmar Sangria
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                A sangria retira dinheiro do caixa. Certifique-se de registrar o motivo corretamente.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Valor da Sangria *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={withdrawalForm.amount}
                onChange={(e) =>
                  setWithdrawalForm({ ...withdrawalForm, amount: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Motivo *
            </label>
            <textarea
              value={withdrawalForm.reason}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, reason: e.target.value })}
              placeholder="Descreva o motivo da sangria..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>
      </Modal>

      {/* Modal de Logs */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title="Logs de Alteração"
        size="lg"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <History className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{log.description}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Por: {log.userName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </SalonLayout>
  );
}
