"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
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
  ArrowLeftRight,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { financeService } from "@/services/salon/financeService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type { MonthlyReport, FinanceStats } from "@/types/salon";
import { baixarCsv } from "@/utils/csv";

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
  const [activeTab, setActiveTab] = useState<"overview" | "professional" | "service" | "payment">("overview");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estados de loading
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Funções de formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
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
      setLoadError(null);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      // Sem dados de exemplo: antes, qualquer falha mostrava números inventados como se fossem reais
      setMonthlyReport(null);
      setStats(null);
      setLoadError(error instanceof Error ? error.message.replace(/^\[HTTP \d+\]\s*/, "") : "Tente novamente.");
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
        ticketMedio: monthlyReport.appointments.total > 0 ? monthlyReport.revenue.total / monthlyReport.appointments.total : 0,
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

        // Nomes de serviço/profissional vêm de cadastro: baixarCsv neutraliza fórmulas (CSV injection)
        baixarCsv(`relatorio_${selectedYear}_${selectedMonth + 1}.csv`, [
          headers,
          values,
          [],
          ["Top Serviços"],
          ["Serviço", "Faturamento", "Quantidade"],
          ...data.topServicos.map((s) => [s.serviceName, s.revenue, s.count]),
          [],
          ["Top Profissionais"],
          ["Profissional", "Faturamento", "Atendimentos"],
          ...data.topProfissionais.map((p) => [p.professionalName, p.revenue, p.appointments]),
        ]);
      }
    } catch (error) {
      console.error("Erro ao exportar:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Recebido no mês por forma de pagamento, vindo do backend (antes era uma divisão fixa
  // 35/30/20/12/3% do faturamento, igual para todo salão e todo mês)
  const paymentMethodTotals = useMemo(() => {
    const formas = monthlyReport?.paymentMethods;
    if (!formas) return null;
    const total = formas.cash + formas.pix + formas.creditCard + formas.debitCard + formas.voucher + (formas.transfer ?? 0);
    const item = (value: number) => ({ value, percentage: total > 0 ? (value / total) * 100 : 0 });
    return {
      cash: item(formas.cash),
      pix: item(formas.pix),
      creditCard: item(formas.creditCard),
      debitCard: item(formas.debitCard),
      voucher: item(formas.voucher),
      // Transferência com total próprio (BUG-034: antes somada ao débito)
      transfer: item(formas.transfer ?? 0),
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
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {loadError && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            <span>Não foi possível carregar o relatório: {loadError}</span>
            <Button variant="secondary" size="sm" onClick={loadData} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Tentar novamente
            </Button>
          </div>
        )}

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
            {stats && (stats.month.revenueTarget ?? 0) > 0 && (
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
                  <span>Meta: {formatCurrency(stats.month.revenueTarget ?? 0)}</span>
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

              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg bg-teal-100 p-3 dark:bg-teal-900/30">
                    <ArrowLeftRight className="h-6 w-6 text-teal-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Transferência</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(paymentMethodTotals.transfer.value)}
                    </p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-teal-500"
                    style={{ width: `${paymentMethodTotals.transfer.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {paymentMethodTotals.transfer.percentage.toFixed(1)}% do total
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SalonLayout>
  );
}
