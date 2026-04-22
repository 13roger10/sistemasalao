"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  Scissors,
  RefreshCw,
  Calendar,
  Sun,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { commissionService } from "@/services/salon";
import { useRouter } from "next/navigation";
import type { Commission } from "@/types/salon";

// ===== HELPERS =====
const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toDateInput = (d: Date) => d.toISOString().split("T")[0];
const todayStr = () => toDateInput(new Date());

/** start/end of a unit relative to a base Date */
const startOf = (unit: "day" | "week" | "month", base = new Date()): Date => {
  const d = new Date(base);
  if (unit === "day") { d.setHours(0, 0, 0, 0); return d; }
  if (unit === "week") { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const endOf = (unit: "day" | "week" | "month", base = new Date()): Date => {
  const d = new Date(base);
  if (unit === "day") { d.setHours(23, 59, 59, 999); return d; }
  if (unit === "week") {
    const s = startOf("week", base);
    const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999); return e;
  }
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
};

const inRange = (c: Commission, start: Date, end: Date) => {
  const d = new Date(c.appointmentDate);
  return d >= start && d <= end;
};

const sumCommissions = (list: Commission[]) =>
  list.reduce((s, c) => s + (c.commissionValue ?? 0), 0);

// ===== COMPONENTE PRINCIPAL =====
export default function EarningsPage() {
  const { user, isLoading: authLoading } = useSalonAuth();
  const router = useRouter();

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<"day" | "week" | "month" | "custom">("day");
  // selectedDate controla qual dia está em foco quando activePeriod === "day"
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  // weekOffset: 0 = semana atual, -1 = semana passada, etc.
  const [weekOffset, setWeekOffset] = useState<number>(0);
  // monthOffset: 0 = mês atual, -1 = mês passado, etc.
  const [monthOffset, setMonthOffset] = useState<number>(0);
  // custom range
  const [customStart, setCustomStart] = useState<string>(todayStr());
  const [customEnd, setCustomEnd] = useState<string>(todayStr());

  // Redireciona não-profissional
  useEffect(() => {
    if (!authLoading && user?.role !== "PROFESSIONAL") {
      router.replace("/salon/dashboard");
    }
  }, [authLoading, user, router]);

  // ===== CARGA =====
  const loadEarnings = useCallback(async () => {
    if (!user?.professionalId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await commissionService.listByProfessional(
        String(user.professionalId),
        { page: 1, size: 500 }
      );
      setCommissions(response.data ?? []);
    } catch (err) {
      console.error("Erro ao carregar ganhos:", err);
      setError("Não foi possível carregar os dados financeiros.");
    } finally {
      setLoading(false);
    }
  }, [user?.professionalId]);

  useEffect(() => {
    if (!authLoading && user?.role === "PROFESSIONAL") {
      loadEarnings();
    }
  }, [authLoading, user, loadEarnings]);

  // base date para o filtro de dia
  const selectedDateObj = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);

  // base date para o filtro de semana (deslocada por weekOffset semanas)
  const weekBase = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  // base date para o filtro de mês (deslocada por monthOffset meses)
  const monthBase = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  // ===== COMISSÕES DO PERÍODO ATIVO =====
  const periodCommissions = useMemo(() => {
    if (activePeriod === "custom") {
      const start = new Date(customStart + "T00:00:00");
      const end = new Date(customEnd + "T23:59:59");
      return commissions.filter((c) => inRange(c, start, end));
    }
    const base = activePeriod === "day" ? selectedDateObj : activePeriod === "week" ? weekBase : monthBase;
    const start = startOf(activePeriod, base);
    const end = endOf(activePeriod, base);
    return commissions.filter((c) => inRange(c, start, end));
  }, [commissions, activePeriod, selectedDateObj, weekBase, monthBase, customStart, customEnd]);

  // ===== TOTAIS FIXOS (sempre calculados para os 3 períodos) =====
  const daily = useMemo(() => {
    const list = commissions.filter((c) => inRange(c, startOf("day", selectedDateObj), endOf("day", selectedDateObj)));
    return {
      total: sumCommissions(list),
      paid: sumCommissions(list.filter((c) => c.status === "paid")),
      pending: sumCommissions(list.filter((c) => c.status === "pending")),
      count: list.length,
    };
  }, [commissions, selectedDateObj]);

  const weekly = useMemo(() => {
    const list = commissions.filter((c) => inRange(c, startOf("week", weekBase), endOf("week", weekBase)));
    return {
      total: sumCommissions(list),
      paid: sumCommissions(list.filter((c) => c.status === "paid")),
      pending: sumCommissions(list.filter((c) => c.status === "pending")),
      count: list.length,
    };
  }, [commissions, weekBase]);

  const monthly = useMemo(() => {
    const list = commissions.filter((c) => inRange(c, startOf("month", monthBase), endOf("month", monthBase)));
    return {
      total: sumCommissions(list),
      paid: sumCommissions(list.filter((c) => c.status === "paid")),
      pending: sumCommissions(list.filter((c) => c.status === "pending")),
      count: list.length,
    };
  }, [commissions, monthBase]);

  // ===== DETALHES DO PERÍODO ATIVO =====
  const activeDetail = activePeriod === "day" ? daily : activePeriod === "week" ? weekly : monthly;

  // Agrupamento dos últimos itens do período ativo por serviço
  const byService = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>();
    periodCommissions.forEach((c) => {
      const key = c.serviceName || "Serviço";
      const entry = map.get(key) ?? { name: key, count: 0, total: 0 };
      entry.count += 1;
      entry.total += c.commissionValue ?? 0;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [periodCommissions]);

  const isToday = selectedDate === todayStr();
  const dayLabel = isToday
    ? "hoje"
    : new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const dayTitle = isToday
    ? "Hoje"
    : new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const isCurrentMonth = monthOffset === 0;
  const monthTitle = isCurrentMonth
    ? "Este Mês"
    : monthBase.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const isCurrentWeek = weekOffset === 0;
  const weekStart = startOf("week", weekBase);
  const weekEnd = endOf("week", weekBase);
  const weekRangeLabel = `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} – ${weekEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  const weekTitle = isCurrentWeek ? "Esta Semana" : weekRangeLabel;

  const customRangeLabel = customStart === customEnd
    ? new Date(customStart + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : `${new Date(customStart + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} – ${new Date(customEnd + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;

  const periodLabel = activePeriod === "day" ? dayLabel
    : activePeriod === "week" ? (isCurrentWeek ? "esta semana" : `semana de ${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`)
    : activePeriod === "month" ? (isCurrentMonth ? "este mês" : monthBase.toLocaleDateString("pt-BR", { month: "long" }))
    : customRangeLabel;
  const periodTitle = activePeriod === "day" ? dayTitle
    : activePeriod === "week" ? weekTitle
    : activePeriod === "month" ? monthTitle
    : customRangeLabel;

  // ===== LOADING =====
  if (authLoading || (loading && commissions.length === 0)) {
    return (
      <SalonLayout>
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resumo Financeiro</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Seus ganhos de comissão por período
            </p>
          </div>
          <Button variant="outline" onClick={loadEarnings} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Cards dos 4 períodos — sempre visíveis */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Hoje */}
          <div
            onClick={() => setActivePeriod("day")}
            className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${
              activePeriod === "day"
                ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
            }`}
          >
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  activePeriod === "day"
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}>
                  <Sun className="h-4 w-4" />
                </div>
                <span className={`text-sm font-medium ${
                  activePeriod === "day" ? "text-primary-700 dark:text-primary-300" : "text-gray-500 dark:text-gray-400"
                }`}>{isToday ? "Hoje" : dayTitle}</span>
              </div>
              {/* Date picker — linha separada para não ficar colado ao label */}
              <input
                type="date"
                value={selectedDate}
                max={todayStr()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setActivePeriod("day");
                  }
                }}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              />
            </div>
            <p className={`text-2xl font-bold ${
              activePeriod === "day" ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white"
            }`}>
              {formatCurrency(daily.total)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{daily.count} atendimento{daily.count !== 1 ? "s" : ""}</p>
          </div>

          {/* Esta Semana */}
          <div
            onClick={() => setActivePeriod("week")}
            className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${
              activePeriod === "week"
                ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  activePeriod === "week"
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}>
                  <CalendarDays className="h-4 w-4" />
                </div>
                <span className={`text-sm font-medium ${
                  activePeriod === "week" ? "text-primary-700 dark:text-primary-300" : "text-gray-500 dark:text-gray-400"
                }`}>{weekTitle}</span>
              </div>
              {/* Navegação prev/next semana */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setWeekOffset((o) => o - 1); setActivePeriod("week"); }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  title="Semana anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setWeekOffset((o) => Math.min(0, o + 1)); setActivePeriod("week"); }}
                  disabled={weekOffset === 0}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  title="Próxima semana"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className={`text-2xl font-bold ${
              activePeriod === "week" ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white"
            }`}>
              {formatCurrency(weekly.total)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {weekly.count} atendimento{weekly.count !== 1 ? "s" : ""}
              {!isCurrentWeek && <span className="ml-1 text-gray-400">· {weekRangeLabel}</span>}
            </p>
          </div>

          {/* Este Mês */}
          <div
            onClick={() => setActivePeriod("month")}
            className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${
              activePeriod === "month"
                ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  activePeriod === "month"
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}>
                  <CalendarRange className="h-4 w-4" />
                </div>
                <span className={`text-sm font-medium capitalize ${
                  activePeriod === "month" ? "text-primary-700 dark:text-primary-300" : "text-gray-500 dark:text-gray-400"
                }`}>{monthTitle}</span>
              </div>
              {/* Navegação prev/next mês */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setMonthOffset((o) => o - 1); setActivePeriod("month"); }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  title="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setMonthOffset((o) => Math.min(0, o + 1)); setActivePeriod("month"); }}
                  disabled={monthOffset === 0}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  title="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className={`text-2xl font-bold ${
              activePeriod === "month" ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white"
            }`}>
              {formatCurrency(monthly.total)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {monthly.count} atendimento{monthly.count !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Período Personalizado */}
          <div
            onClick={() => setActivePeriod("custom")}
            className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${
              activePeriod === "custom"
                ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                activePeriod === "custom"
                  ? "bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                <Calendar className="h-4 w-4" />
              </div>
              <span className={`text-sm font-medium ${
                activePeriod === "custom" ? "text-primary-700 dark:text-primary-300" : "text-gray-500 dark:text-gray-400"
              }`}>Personalizado</span>
            </div>

            {/* Date pickers — visíveis sempre */}
            <div className="mb-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <label className="w-10 text-xs text-gray-500 dark:text-gray-400">De</label>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => {
                    if (e.target.value) { setCustomStart(e.target.value); setActivePeriod("custom"); }
                  }}
                  className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-10 text-xs text-gray-500 dark:text-gray-400">Até</label>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={todayStr()}
                  onChange={(e) => {
                    if (e.target.value) { setCustomEnd(e.target.value); setActivePeriod("custom"); }
                  }}
                  className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                />
              </div>
            </div>

            <p className={`text-2xl font-bold ${
              activePeriod === "custom" ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white"
            }`}>
              {formatCurrency(activePeriod === "custom" ? periodCommissions.reduce((s, c) => s + (c.commissionValue ?? 0), 0) : 0)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {activePeriod === "custom" ? `${periodCommissions.length} atendimento${periodCommissions.length !== 1 ? "s" : ""}` : "selecione um intervalo"}
            </p>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Detalhamento do período ativo */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Breakdown pago/pendente */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <DollarSign className="h-4 w-4 text-primary-600" />
              Detalhamento — {periodTitle}
            </h2>

            {activeDetail.count === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum atendimento {periodLabel}.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total de comissões</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(activeDetail.total)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 dark:bg-green-900/20">
                  <span className="text-sm text-green-700 dark:text-green-400">Já recebido</span>
                  <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(activeDetail.paid)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-yellow-50 px-4 py-3 dark:bg-yellow-900/20">
                  <span className="text-sm text-yellow-700 dark:text-yellow-400">Aguardando pagamento</span>
                  <span className="font-semibold text-yellow-700 dark:text-yellow-400">{formatCurrency(activeDetail.pending)}</span>
                </div>

                {/* Barra de progresso */}
                {activeDetail.total > 0 && (
                  <div className="pt-1">
                    <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Progresso de pagamento</span>
                      <span>{activeDetail.total > 0 ? Math.round((activeDetail.paid / activeDetail.total) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${activeDetail.total > 0 ? (activeDetail.paid / activeDetail.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Por serviço */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <Scissors className="h-4 w-4 text-primary-600" />
              Por Serviço — {periodTitle}
            </h2>

            {byService.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum serviço {periodLabel}.</p>
            ) : (
              <div className="space-y-2">
                {byService.map((s) => (
                  <div key={s.name} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.count}× realizado{s.count !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                      {formatCurrency(s.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lista de comissões do período */}
        {periodCommissions.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Calendar className="h-4 w-4 text-primary-600" />
                Atendimentos — {periodTitle} ({periodCommissions.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {periodCommissions
                .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                        <Scissors className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{c.clientName || "Cliente"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {c.serviceName || "Serviço"} · {new Date(c.appointmentDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {formatCurrency(c.commissionValue ?? 0)}
                      </p>
                      <p className={`text-xs ${c.status === "paid" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                        {c.status === "paid" ? "Pago" : "Pendente"}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </SalonLayout>
  );
}
