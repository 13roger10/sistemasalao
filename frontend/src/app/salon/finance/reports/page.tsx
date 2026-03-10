"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  Users,
  Scissors,
  CreditCard,
  Wallet,
  QrCode,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Printer,
  History,
  Database,
  CheckCircle,
  Clock,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { financeService } from "@/services/salon/financeService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type { MonthlyReport, FinanceStats } from "@/types/salon";

// ===== TIPOS =====
interface BackupInfo {
  id: string;
  date: Date;
  size: string;
  status: "completed" | "in_progress" | "failed";
  type: "automatic" | "manual";
}

// ===== COMPONENTES AUXILIARES =====

// Tabs
const Tabs = ({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
}) => (
  <div className="border-b border-gray-200 dark:border-gray-700">
    <nav className="-mb-px flex space-x-4 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  </div>
);

// Card de Estatísticas Grande
const BigStatsCard = ({
  icon,
  label,
  value,
  color,
  trend,
  comparison,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  trend?: { value: number; positive: boolean };
  comparison?: string;
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start justify-between">
      <div className={`rounded-xl p-3 ${color}`}>{icon}</div>
      {trend && (
        <div
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
            trend.positive
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      {comparison && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{comparison}</p>
      )}
    </div>
  </div>
);

// Barra de Progresso
const ProgressBar = ({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) => {
  const percentage = (value / maxValue) * 100;
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-900 dark:text-white">{formatCurrency(value)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

// ===== COMPONENTE PRINCIPAL =====
export default function FinanceReportsPage() {
  const { user } = useSalonAuth();

  // Estados principais
  const [activeTab, setActiveTab] = useState<"overview" | "professional" | "service" | "payment" | "backup">("overview");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);

  // Estados de loading
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Funções de formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month, 1).toLocaleDateString("pt-BR", { month: "long" });
  };

  // Navegação de mês
  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  // Carregar dados
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [report, financeStats] = await Promise.all([
        financeService.reports.monthly(selectedMonth + 1, selectedYear),
        financeService.getStats(),
      ]);
      setMonthlyReport(report);
      setStats(financeStats);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);

      // Mock data
      const mockReport: MonthlyReport = {
        month: selectedMonth + 1,
        year: selectedYear,
        revenue: {
          total: 45750,
          byWeek: [10500, 12300, 11200, 11750],
          byDay: Array.from({ length: 30 }, (_, i) => ({
            date: `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
            amount: 1200 + Math.random() * 800,
          })),
          comparison: {
            previousMonth: 42000,
            percentageChange: 8.9,
          },
        },
        expenses: {
          total: 12500,
          byCategory: [
            { categoryId: "1", categoryName: "Produtos", amount: 5000, percentage: 40 },
            { categoryId: "2", categoryName: "Aluguel", amount: 3500, percentage: 28 },
            { categoryId: "3", categoryName: "Contas", amount: 2000, percentage: 16 },
            { categoryId: "4", categoryName: "Marketing", amount: 1500, percentage: 12 },
            { categoryId: "5", categoryName: "Outros", amount: 500, percentage: 4 },
          ],
          comparison: {
            previousMonth: 11800,
            percentageChange: 5.9,
          },
        },
        profit: {
          total: 33250,
          margin: 72.7,
          comparison: {
            previousMonth: 30200,
            percentageChange: 10.1,
          },
        },
        appointments: {
          total: 320,
          averagePerDay: 10.7,
          completionRate: 92,
        },
        topServices: [
          { serviceId: "1", serviceName: "Corte Masculino", revenue: 12500, count: 250 },
          { serviceId: "2", serviceName: "Coloração", revenue: 9800, count: 65 },
          { serviceId: "3", serviceName: "Corte + Barba", revenue: 8750, count: 125 },
          { serviceId: "4", serviceName: "Barba", revenue: 5200, count: 148 },
          { serviceId: "5", serviceName: "Limpeza de Pele", revenue: 4800, count: 40 },
        ],
        topProfessionals: [
          { professionalId: "1", professionalName: "Carlos", revenue: 15200, appointments: 120 },
          { professionalId: "2", professionalName: "Ana", revenue: 12800, appointments: 85 },
          { professionalId: "3", professionalName: "Roberto", revenue: 10500, appointments: 95 },
          { professionalId: "4", professionalName: "Juliana", revenue: 7250, appointments: 60 },
        ],
        topClients: [
          { clientId: "1", clientName: "João Silva", spent: 850, visits: 8 },
          { clientId: "2", clientName: "Maria Santos", spent: 720, visits: 4 },
          { clientId: "3", clientName: "Pedro Oliveira", spent: 680, visits: 6 },
          { clientId: "4", clientName: "Lucia Costa", spent: 550, visits: 5 },
          { clientId: "5", clientName: "Carlos Mendes", spent: 480, visits: 4 },
        ],
      };
      setMonthlyReport(mockReport);

      const mockStats: FinanceStats = {
        today: {
          revenue: 1850,
          expenses: 150,
          profit: 1700,
          appointments: 12,
          averageTicket: 154.17,
        },
        week: {
          revenue: 8500,
          expenses: 800,
          profit: 7700,
        },
        month: {
          revenue: 45750,
          expenses: 12500,
          profit: 33250,
          revenueTarget: 50000,
          targetProgress: 91.5,
        },
        pendingExpenses: 2500,
        pendingCommissions: 3800,
      };
      setStats(mockStats);

      // Mock backups
      const mockBackups: BackupInfo[] = [
        { id: "1", date: new Date(), size: "125 MB", status: "completed", type: "automatic" },
        { id: "2", date: new Date(Date.now() - 24 * 60 * 60 * 1000), size: "123 MB", status: "completed", type: "automatic" },
        { id: "3", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), size: "121 MB", status: "completed", type: "automatic" },
        { id: "4", date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), size: "120 MB", status: "completed", type: "manual" },
        { id: "5", date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), size: "118 MB", status: "completed", type: "automatic" },
      ];
      setBackups(mockBackups);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exportar relatório
  const handleExport = async (format: "xlsx" | "pdf") => {
    setIsExporting(true);
    try {
      if (!monthlyReport) return;

      // Criar dados para exportação
      const data = {
        periodo: `${getMonthName(selectedMonth)} ${selectedYear}`,
        faturamento: monthlyReport.revenue.total,
        despesas: monthlyReport.expenses.total,
        lucro: monthlyReport.profit.total,
        margemLucro: monthlyReport.profit.margin,
        atendimentos: monthlyReport.appointments.total,
        ticketMedio: monthlyReport.revenue.total / monthlyReport.appointments.total,
        topServicos: monthlyReport.topServices,
        topProfissionais: monthlyReport.topProfessionals,
      };

      if (format === "xlsx") {
        // Criar CSV para download
        const headers = [
          "Período",
          "Faturamento",
          "Despesas",
          "Lucro",
          "Margem",
          "Atendimentos",
        ];
        const values = [
          data.periodo,
          data.faturamento,
          data.despesas,
          data.lucro,
          `${data.margemLucro}%`,
          data.atendimentos,
        ];

        let csv = headers.join(",") + "\n" + values.join(",") + "\n\n";

        csv += "Top Serviços\n";
        csv += "Serviço,Faturamento,Quantidade\n";
        data.topServicos.forEach((s) => {
          csv += `${s.serviceName},${s.revenue},${s.count}\n`;
        });

        csv += "\nTop Profissionais\n";
        csv += "Profissional,Faturamento,Atendimentos\n";
        data.topProfissionais.forEach((p) => {
          csv += `${p.professionalName},${p.revenue},${p.appointments}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio_${selectedYear}_${selectedMonth + 1}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Erro ao exportar:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Criar backup manual
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      // Simular backup
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const newBackup: BackupInfo = {
        id: Date.now().toString(),
        date: new Date(),
        size: "126 MB",
        status: "completed",
        type: "manual",
      };
      setBackups([newBackup, ...backups]);
    } catch (error) {
      console.error("Erro ao criar backup:", error);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Calcular totais por forma de pagamento (mock)
  const paymentMethodTotals = useMemo(() => {
    if (!monthlyReport) return null;
    return {
      cash: { value: monthlyReport.revenue.total * 0.35, percentage: 35 },
      pix: { value: monthlyReport.revenue.total * 0.30, percentage: 30 },
      creditCard: { value: monthlyReport.revenue.total * 0.20, percentage: 20 },
      debitCard: { value: monthlyReport.revenue.total * 0.12, percentage: 12 },
      voucher: { value: monthlyReport.revenue.total * 0.03, percentage: 3 },
    };
  }, [monthlyReport]);

  if (isLoading) {
    return (
      <SalonLayout requiredRole={["ADMIN"]} pageTitle="Relatórios">
        <div className="flex h-96 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout requiredRole={["ADMIN"]} pageTitle="Relatórios Financeiros">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Relatórios Financeiros
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Análise detalhada do desempenho financeiro
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Seletor de Mês */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 dark:border-gray-600 dark:bg-gray-700">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[140px] text-center font-medium text-gray-900 dark:text-white capitalize">
                {getMonthName(selectedMonth)} {selectedYear}
              </span>
              <button
                onClick={() => navigateMonth("next")}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Button
              variant="secondary"
              onClick={() => handleExport("xlsx")}
              isLoading={isExporting}
              leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            >
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: "overview", label: "Visão Geral", icon: <BarChart3 className="h-4 w-4" /> },
            { id: "professional", label: "Por Profissional", icon: <Users className="h-4 w-4" /> },
            { id: "service", label: "Por Serviço", icon: <Scissors className="h-4 w-4" /> },
            { id: "payment", label: "Por Pagamento", icon: <CreditCard className="h-4 w-4" /> },
            { id: "backup", label: "Backup", icon: <Database className="h-4 w-4" /> },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {/* Tab: Visão Geral */}
        {activeTab === "overview" && monthlyReport && (
          <div className="space-y-6">
            {/* Cards Principais */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BigStatsCard
                icon={<DollarSign className="h-6 w-6 text-green-500" />}
                label="Faturamento"
                value={formatCurrency(monthlyReport.revenue.total)}
                color="bg-green-100 dark:bg-green-900/30"
                trend={{
                  value: monthlyReport.revenue.comparison.percentageChange,
                  positive: monthlyReport.revenue.comparison.percentageChange > 0,
                }}
                comparison={`vs ${formatCurrency(monthlyReport.revenue.comparison.previousMonth)} mês anterior`}
              />
              <BigStatsCard
                icon={<ArrowDownRight className="h-6 w-6 text-red-500" />}
                label="Despesas"
                value={formatCurrency(monthlyReport.expenses.total)}
                color="bg-red-100 dark:bg-red-900/30"
                trend={{
                  value: monthlyReport.expenses.comparison.percentageChange,
                  positive: monthlyReport.expenses.comparison.percentageChange < 0,
                }}
              />
              <BigStatsCard
                icon={<TrendingUp className="h-6 w-6 text-violet-500" />}
                label="Lucro Líquido"
                value={formatCurrency(monthlyReport.profit.total)}
                color="bg-violet-100 dark:bg-violet-900/30"
                trend={{
                  value: monthlyReport.profit.comparison.percentageChange,
                  positive: monthlyReport.profit.comparison.percentageChange > 0,
                }}
                comparison={`Margem: ${monthlyReport.profit.margin.toFixed(1)}%`}
              />
              <BigStatsCard
                icon={<Calendar className="h-6 w-6 text-blue-500" />}
                label="Atendimentos"
                value={monthlyReport.appointments.total.toString()}
                color="bg-blue-100 dark:bg-blue-900/30"
                comparison={`Média: ${monthlyReport.appointments.averagePerDay.toFixed(1)}/dia`}
              />
            </div>

            {/* Meta de Faturamento */}
            {stats?.month.revenueTarget && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Meta de Faturamento
                  </h3>
                  <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                    {stats.month.targetProgress?.toFixed(1)}%
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                    style={{ width: `${Math.min(stats.month.targetProgress || 0, 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Atual: {formatCurrency(stats.month.revenue)}</span>
                  <span>Meta: {formatCurrency(stats.month.revenueTarget)}</span>
                </div>
              </div>
            )}

            {/* Faturamento por Semana */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Faturamento por Semana
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {monthlyReport.revenue.byWeek.map((value, index) => (
                  <div key={index} className="text-center">
                    <div
                      className="mx-auto mb-2 w-full rounded-lg bg-violet-100 dark:bg-violet-900/30"
                      style={{
                        height: `${(value / Math.max(...monthlyReport.revenue.byWeek)) * 120}px`,
                        minHeight: "40px",
                      }}
                    />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(value)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Semana {index + 1}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Despesas por Categoria */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Despesas por Categoria
              </h3>
              <div className="space-y-4">
                {monthlyReport.expenses.byCategory.map((category) => (
                  <ProgressBar
                    key={category.categoryId}
                    label={category.categoryName}
                    value={category.amount}
                    maxValue={monthlyReport.expenses.total}
                    color="bg-red-500"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Por Profissional */}
        {activeTab === "professional" && monthlyReport && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Desempenho por Profissional
                </h3>
              </div>
              <div className="divide-y dark:divide-gray-700">
                {monthlyReport.topProfessionals.map((prof, index) => (
                  <div key={prof.professionalId} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {prof.professionalName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {prof.appointments} atendimentos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(prof.revenue)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Ticket: {formatCurrency(prof.revenue / prof.appointments)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico de Barras Simulado */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Comparativo de Faturamento
              </h3>
              <div className="space-y-4">
                {monthlyReport.topProfessionals.map((prof) => (
                  <ProgressBar
                    key={prof.professionalId}
                    label={prof.professionalName}
                    value={prof.revenue}
                    maxValue={monthlyReport.topProfessionals[0].revenue}
                    color="bg-violet-500"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Por Serviço */}
        {activeTab === "service" && monthlyReport && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Faturamento por Serviço
                </h3>
              </div>
              <div className="divide-y dark:divide-gray-700">
                {monthlyReport.topServices.map((service, index) => (
                  <div key={service.serviceId} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-600 dark:bg-green-900/50 dark:text-green-400">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {service.serviceName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {service.count} realizados
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(service.revenue)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Média: {formatCurrency(service.revenue / service.count)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico de Barras */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Distribuição de Faturamento
              </h3>
              <div className="space-y-4">
                {monthlyReport.topServices.map((service) => (
                  <ProgressBar
                    key={service.serviceId}
                    label={service.serviceName}
                    value={service.revenue}
                    maxValue={monthlyReport.topServices[0].revenue}
                    color="bg-green-500"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Por Forma de Pagamento */}
        {activeTab === "payment" && paymentMethodTotals && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                    <Wallet className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dinheiro</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(paymentMethodTotals.cash.value)}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${paymentMethodTotals.cash.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {paymentMethodTotals.cash.percentage.toFixed(1)}% do total
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-violet-100 p-3 dark:bg-violet-900/30">
                    <QrCode className="h-6 w-6 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">PIX</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(paymentMethodTotals.pix.value)}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-violet-500"
                    style={{ width: `${paymentMethodTotals.pix.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {paymentMethodTotals.pix.percentage.toFixed(1)}% do total
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                    <CreditCard className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cartão de Crédito</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(paymentMethodTotals.creditCard.value)}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${paymentMethodTotals.creditCard.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {paymentMethodTotals.creditCard.percentage.toFixed(1)}% do total
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
                    <CreditCard className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cartão de Débito</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(paymentMethodTotals.debitCard.value)}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{ width: `${paymentMethodTotals.debitCard.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {paymentMethodTotals.debitCard.percentage.toFixed(1)}% do total
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-pink-100 p-3 dark:bg-pink-900/30">
                    <Receipt className="h-6 w-6 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Voucher</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(paymentMethodTotals.voucher.value)}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-pink-500"
                    style={{ width: `${paymentMethodTotals.voucher.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {paymentMethodTotals.voucher.percentage.toFixed(1)}% do total
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Backup */}
        {activeTab === "backup" && (
          <div className="space-y-6">
            {/* Configuração de Backup Automático */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Backup Automático
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Backups são realizados automaticamente todos os dias às 03:00
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Ativo
                  </span>
                  <Button
                    onClick={handleBackup}
                    isLoading={isBackingUp}
                    leftIcon={<Database className="h-4 w-4" />}
                  >
                    Backup Manual
                  </Button>
                </div>
              </div>
            </div>

            {/* Lista de Backups */}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Histórico de Backups
                </h3>
              </div>
              <div className="divide-y dark:divide-gray-700">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          backup.status === "completed"
                            ? "bg-green-100 dark:bg-green-900/30"
                            : backup.status === "in_progress"
                            ? "bg-yellow-100 dark:bg-yellow-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                        }`}
                      >
                        {backup.status === "completed" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : backup.status === "in_progress" ? (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <History className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(backup.date)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {backup.type === "automatic" ? "Automático" : "Manual"} • {backup.size}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                      Baixar
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Informações de Retenção */}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <History className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                    Política de Retenção
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Os backups automáticos são mantidos por 30 dias. Backups manuais são mantidos por 90 dias.
                    Após esse período, os arquivos são automaticamente excluídos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SalonLayout>
  );
}
