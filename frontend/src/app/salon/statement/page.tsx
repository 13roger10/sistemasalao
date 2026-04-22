"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  RefreshCw,
  Calendar,
  Sun,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  QrCode,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { commissionService } from "@/services/salon";
import { api } from "@/services/salon/api";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Commission } from "@/types/salon";

// ===== TIPOS =====
type PaymentStatus = "PENDENTE" | "PROCESSANDO" | "PAGO" | "CANCELADO";
type FormaPagamento = "PIX" | "DINHEIRO" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "TRANSFERENCIA" | "VALE" | null;

interface ProfessionalPayment {
  id: number;
  periodoInicio: string;
  periodoFim: string;
  totalServicos: number;
  valorTotalServicos: number;
  valorTotalComissoes: number;
  status: PaymentStatus;
  formaPagamento?: FormaPagamento;
  formaPagamentoDescricao?: string;
  referenciaTransacao?: string;
  pagoEm?: string;
  recebimentoConfirmadoEm?: string;
  autenticacaoValidada?: boolean;
  criadoEm: string;
}

type EntryKind = "entrada" | "saida";

interface StatementEntry {
  id: string;
  kind: EntryKind;
  date: Date;
  // entrada (comissão)
  serviceName?: string;
  clientName?: string;
  commissionValue?: number;
  commissionStatus?: Commission["status"];
  // saida (pagamento)
  paymentTotal?: number;
  paymentStatus?: PaymentStatus;
  formaPagamento?: FormaPagamento;
  formaPagamentoDescricao?: string;
  periodoInicio?: string;
  periodoFim?: string;
  totalServicos?: number;
  recebimentoConfirmadoEm?: string;
  autenticacaoValidada?: boolean;
}

// ===== HELPERS =====
const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toDateInput = (d: Date) => d.toISOString().split("T")[0];
const todayStr = () => toDateInput(new Date());

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

const inRange = (d: Date, start: Date, end: Date) => d >= start && d <= end;

type ActivePeriod = "day" | "week" | "month" | "custom";

// ===== BADGES =====
function CommissionStatusBadge({ status }: { status: Commission["status"] }) {
  if (status === "paid") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
      <CheckCircle2 className="h-3 w-3" /> Pago
    </span>
  );
  if (status === "canceled") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
      <XCircle className="h-3 w-3" /> Cancelado
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
      <Clock className="h-3 w-3" /> Pendente
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = {
    PAGO:        { cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",  icon: <CheckCircle2 className="h-3 w-3" />, label: "Pago" },
    PROCESSANDO: { cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",      icon: <Clock className="h-3 w-3" />,        label: "Processando" },
    PENDENTE:    { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",  icon: <Clock className="h-3 w-3" />,        label: "Pendente" },
    CANCELADO:   { cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",          icon: <XCircle className="h-3 w-3" />,      label: "Cancelado" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.cls)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function FormaBadge({ forma, descricao }: { forma?: FormaPagamento | null; descricao?: string }) {
  if (!forma) return null;
  const cfg: Record<string, { icon: React.ReactNode; cls: string }> = {
    PIX:            { icon: <QrCode className="h-3 w-3" />,         cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400" },
    DINHEIRO:       { icon: <Banknote className="h-3 w-3" />,       cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
    CARTAO_CREDITO: { icon: <CreditCard className="h-3 w-3" />,     cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
    CARTAO_DEBITO:  { icon: <CreditCard className="h-3 w-3" />,     cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400" },
    TRANSFERENCIA:  { icon: <ArrowLeftRight className="h-3 w-3" />, cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
    VALE:           { icon: <Wallet className="h-3 w-3" />,         cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
  };
  const c = cfg[forma] ?? { icon: null, cls: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", c.cls)}>
      {c.icon} {descricao ?? forma}
    </span>
  );
}

// ===== COMPONENTE PRINCIPAL =====
export default function StatementPage() {
  const { user, isLoading: authLoading } = useSalonAuth();
  const router = useRouter();

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payments, setPayments] = useState<ProfessionalPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Period state
  const [activePeriod, setActivePeriod] = useState<ActivePeriod>("month");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [customStart, setCustomStart] = useState(toDateInput(startOf("month")));
  const [customEnd, setCustomEnd] = useState(todayStr());

  // Redirect non-professionals
  useEffect(() => {
    if (!authLoading && user?.role !== "PROFESSIONAL") {
      router.replace("/salon/dashboard");
    }
  }, [authLoading, user, router]);

  const fetchData = useCallback(async () => {
    if (!user?.professionalId) return;
    setIsLoading(true);
    try {
      const [commRes, paymRes] = await Promise.allSettled([
        commissionService.getByProfessional(user.professionalId, { page: 0, limit: 500 }),
        api.get<{ content: ProfessionalPayment[]; totalElements: number }>(
          `/api/pagamentos-profissional/profissional/${user.professionalId}`,
          { page: 0, size: 200 }
        ),
      ]);

      if (commRes.status === "fulfilled") {
        const items = (commRes.value.data ?? commRes.value.items ?? []) as Commission[];
        setCommissions(items);
      }

      if (paymRes.status === "fulfilled") {
        const raw = paymRes.value as unknown as { content?: ProfessionalPayment[] } | ProfessionalPayment[];
        const list = Array.isArray(raw) ? raw : ((raw as { content?: ProfessionalPayment[] }).content ?? []);
        setPayments(list);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.professionalId]);

  useEffect(() => {
    if (!authLoading && user?.role === "PROFESSIONAL") fetchData();
  }, [authLoading, user, fetchData]);

  // ===== Period bounds =====
  const selectedDateObj = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);
  const weekBase = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); return d;
  }, [weekOffset]);
  const monthBase = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() + monthOffset); return d;
  }, [monthOffset]);

  const periodStart = useMemo((): Date => {
    if (activePeriod === "day") return startOf("day", selectedDateObj);
    if (activePeriod === "week") return startOf("week", weekBase);
    if (activePeriod === "month") return startOf("month", monthBase);
    return new Date(customStart + "T00:00:00");
  }, [activePeriod, selectedDateObj, weekBase, monthBase, customStart]);

  const periodEnd = useMemo((): Date => {
    if (activePeriod === "day") return endOf("day", selectedDateObj);
    if (activePeriod === "week") return endOf("week", weekBase);
    if (activePeriod === "month") return endOf("month", monthBase);
    return new Date(customEnd + "T23:59:59");
  }, [activePeriod, selectedDateObj, weekBase, monthBase, customEnd]);

  // Build unified timeline entries
  const allEntries = useMemo((): StatementEntry[] => {
    const result: StatementEntry[] = [];

    // Entradas: commissions
    for (const c of commissions) {
      const d = new Date(c.appointmentDate);
      if (!inRange(d, periodStart, periodEnd)) continue;
      result.push({
        id: `c-${c.id}`,
        kind: "entrada",
        date: d,
        serviceName: c.serviceName,
        clientName: c.clientName,
        commissionValue: c.commissionValue ?? 0,
        commissionStatus: c.status,
      });
    }

    // Saídas: payment records
    for (const p of payments) {
      // Use pagoEm if paid, otherwise criadoEm
      const rawDate = p.pagoEm ?? p.criadoEm;
      const d = rawDate ? new Date(rawDate) : new Date();
      if (!inRange(d, periodStart, periodEnd)) continue;
      result.push({
        id: `p-${p.id}`,
        kind: "saida",
        date: d,
        paymentTotal: p.valorTotalComissoes,
        paymentStatus: p.status,
        formaPagamento: p.formaPagamento,
        formaPagamentoDescricao: p.formaPagamentoDescricao,
        periodoInicio: p.periodoInicio,
        periodoFim: p.periodoFim,
        totalServicos: p.totalServicos,
        recebimentoConfirmadoEm: p.recebimentoConfirmadoEm,
        autenticacaoValidada: p.autenticacaoValidada,
      });
    }

    // Sort newest first
    return result.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [commissions, payments, periodStart, periodEnd]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, StatementEntry[]>();
    for (const e of allEntries) {
      const key = toDateInput(e.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allEntries]);

  // ===== SALDO ATUAL (global — independent of period filter) =====
  const saldoAtual = useMemo(() => {
    const totalComissoesGanhas = commissions
      .filter(c => c.status !== "canceled")
      .reduce((s, c) => s + (c.commissionValue ?? 0), 0);
    const totalRecebido = payments
      .filter(p => p.status === "PAGO")
      .reduce((s, p) => s + (p.valorTotalComissoes ?? 0), 0);
    const totalAReceber = commissions
      .filter(c => c.status === "pending")
      .reduce((s, c) => s + (c.commissionValue ?? 0), 0);
    const ultimoPagamento = payments
      .filter(p => p.status === "PAGO" && p.pagoEm)
      .sort((a, b) => new Date(b.pagoEm!).getTime() - new Date(a.pagoEm!).getTime())[0];
    return { totalComissoesGanhas, totalRecebido, totalAReceber, ultimoPagamento };
  }, [commissions, payments]);

  // Summary totals (period-scoped)
  const totalEntradas = useMemo(() =>
    allEntries.filter(e => e.kind === "entrada").reduce((s, e) => s + (e.commissionValue ?? 0), 0),
    [allEntries]
  );
  const totalSaidas = useMemo(() =>
    allEntries.filter(e => e.kind === "saida" && e.paymentStatus === "PAGO").reduce((s, e) => s + (e.paymentTotal ?? 0), 0),
    [allEntries]
  );
  const totalPendente = useMemo(() =>
    allEntries.filter(e => e.kind === "entrada" && e.commissionStatus === "pending").reduce((s, e) => s + (e.commissionValue ?? 0), 0),
    [allEntries]
  );

  const weekLabel = useMemo(() => {
    const s = startOf("week", weekBase);
    const e = endOf("week", weekBase);
    if (weekOffset === 0) return "Esta Semana";
    return `${format(s, "dd/MM")} – ${format(e, "dd/MM")}`;
  }, [weekBase, weekOffset]);

  const monthLabel = useMemo(() => {
    if (monthOffset === 0) return "Este Mês";
    return format(monthBase, "MMMM yyyy", { locale: ptBR });
  }, [monthBase, monthOffset]);

  const dayLabel = useMemo(() => {
    if (selectedDate === todayStr()) return "Hoje";
    return format(selectedDateObj, "dd/MMM", { locale: ptBR });
  }, [selectedDate, selectedDateObj]);

  const handleExportExcel = () => {
    const fmtCurrency = (v: number) =>
      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const fmtDate = (d: Date) => format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
    const statusLabel = (e: StatementEntry) => {
      if (e.kind === "entrada") {
        return e.commissionStatus === "paid" ? "Pago" : e.commissionStatus === "canceled" ? "Cancelado" : "Pendente";
      }
      return { PAGO: "Pago", PROCESSANDO: "Processando", PENDENTE: "Pendente", CANCELADO: "Cancelado" }[e.paymentStatus!] ?? e.paymentStatus;
    };

    const headers = ["Tipo", "Data", "Descrição", "Complemento", "Valor", "Status", "Forma Pgto"];
    const rows = allEntries.map(e => [
      e.kind === "entrada" ? "Entrada (comissão)" : "Saída (pagamento)",
      fmtDate(e.date),
      e.kind === "entrada" ? (e.serviceName || "Serviço") : "Pagamento recebido",
      e.kind === "entrada" ? (e.clientName || "") : `${e.periodoInicio ?? ""} – ${e.periodoFim ?? ""}`,
      fmtCurrency(e.kind === "entrada" ? (e.commissionValue ?? 0) : (e.paymentTotal ?? 0)),
      statusLabel(e),
      e.kind === "saida" ? (e.formaPagamentoDescricao ?? e.formaPagamento ?? "") : "",
    ]);

    const csv = [
      headers.join(";"),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (authLoading || user?.role !== "PROFESSIONAL") return null;

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Extrato Financeiro</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Entradas (comissões) e saídas (pagamentos) por período</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || allEntries.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Saldo Atual — global, independent of period filter */}
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 p-5 text-white shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 opacity-80" />
                <span className="text-sm font-medium opacity-90">Saldo atual</span>
              </div>
              <p className="text-3xl font-bold tracking-tight">
                {isLoading ? "—" : formatCurrency(saldoAtual.totalAReceber)}
              </p>
              <p className="mt-1 text-xs opacity-70">
                {saldoAtual.ultimoPagamento
                  ? `Último pagamento: ${format(new Date(saldoAtual.ultimoPagamento.pagoEm!), "dd/MM/yyyy", { locale: ptBR })}`
                  : "Nenhum pagamento recebido ainda"}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-1.5">
              <span className="text-xs font-medium opacity-90">A receber</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-4">
            <div>
              <p className="text-xs opacity-70 mb-0.5">Total ganho (comissões)</p>
              <p className="text-base font-semibold">
                {isLoading ? "—" : formatCurrency(saldoAtual.totalComissoesGanhas)}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70 mb-0.5">Total recebido</p>
              <p className="text-base font-semibold">
                {isLoading ? "—" : formatCurrency(saldoAtual.totalRecebido)}
              </p>
            </div>
          </div>
        </div>

        {/* Period filter cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Dia */}
          <div
            onClick={() => setActivePeriod("day")}
            className={cn(
              "relative cursor-pointer rounded-xl border-2 p-3 transition-all",
              activePeriod === "day"
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                : "border-gray-200 bg-white hover:border-violet-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-violet-700"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sun className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Dia</span>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{dayLabel}</p>
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
              onClick={e => e.stopPropagation()}
              onChange={e => { setSelectedDate(e.target.value); setActivePeriod("day"); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* Semana */}
          <div
            onClick={() => setActivePeriod("week")}
            className={cn(
              "cursor-pointer rounded-xl border-2 p-3 transition-all",
              activePeriod === "week"
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                : "border-gray-200 bg-white hover:border-violet-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-violet-700"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Semana</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{weekLabel}</p>
              <div className="flex gap-0.5 ml-1 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); setWeekOffset(o => o - 1); setActivePeriod("week"); }} className="rounded p-0.5 hover:bg-violet-100 dark:hover:bg-violet-900/40">
                  <ChevronLeft className="h-3 w-3 dark:text-gray-300" />
                </button>
                <button onClick={e => { e.stopPropagation(); if (weekOffset < 0) { setWeekOffset(o => o + 1); setActivePeriod("week"); } }} disabled={weekOffset === 0} className="rounded p-0.5 hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-30">
                  <ChevronRight className="h-3 w-3 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Mês */}
          <div
            onClick={() => setActivePeriod("month")}
            className={cn(
              "cursor-pointer rounded-xl border-2 p-3 transition-all",
              activePeriod === "month"
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                : "border-gray-200 bg-white hover:border-violet-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-violet-700"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Mês</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-white capitalize truncate">{monthLabel}</p>
              <div className="flex gap-0.5 ml-1 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); setMonthOffset(o => o - 1); setActivePeriod("month"); }} className="rounded p-0.5 hover:bg-violet-100 dark:hover:bg-violet-900/40">
                  <ChevronLeft className="h-3 w-3 dark:text-gray-300" />
                </button>
                <button onClick={e => { e.stopPropagation(); if (monthOffset < 0) { setMonthOffset(o => o + 1); setActivePeriod("month"); } }} disabled={monthOffset === 0} className="rounded p-0.5 hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-30">
                  <ChevronRight className="h-3 w-3 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Personalizado */}
          <div
            onClick={() => setActivePeriod("custom")}
            className={cn(
              "cursor-pointer rounded-xl border-2 p-3 transition-all",
              activePeriod === "custom"
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                : "border-gray-200 bg-white hover:border-violet-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-violet-700"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <CalendarRange className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Personalizado</span>
            </div>
            <div className="space-y-1" onClick={e => e.stopPropagation()}>
              <input type="date" value={customStart} max={customEnd} onChange={e => { setCustomStart(e.target.value); setActivePeriod("custom"); }} className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              <input type="date" value={customEnd} min={customStart} max={todayStr()} onChange={e => { setCustomEnd(e.target.value); setActivePeriod("custom"); }} className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Entradas (comissões)</p>
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalEntradas)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{allEntries.filter(e => e.kind === "entrada").length} lançamento{allEntries.filter(e => e.kind === "entrada").length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Saídas (recebido)</p>
            </div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalSaidas)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{allEntries.filter(e => e.kind === "saida" && e.paymentStatus === "PAGO").length} pagamento{allEntries.filter(e => e.kind === "saida" && e.paymentStatus === "PAGO").length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-gray-500 dark:text-gray-400">A receber</p>
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalPendente)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{allEntries.filter(e => e.kind === "entrada" && e.commissionStatus === "pending").length} pendente{allEntries.filter(e => e.kind === "entrada" && e.commissionStatus === "pending").length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Statement list */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-500" />
              <span className="font-semibold text-gray-800 dark:text-white text-sm">Lançamentos</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft className="h-3 w-3" /> Entrada
              </span>
              <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <ArrowUpRight className="h-3 w-3" /> Saída
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{allEntries.length} registro{allEntries.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum lançamento neste período</p>
            </div>
          ) : (
            <div>
              {grouped.map(([dateKey, items]) => {
                const dayEntradas = items.filter(e => e.kind === "entrada").reduce((s, e) => s + (e.commissionValue ?? 0), 0);
                const daySaidas = items.filter(e => e.kind === "saida" && e.paymentStatus === "PAGO").reduce((s, e) => s + (e.paymentTotal ?? 0), 0);
                const dateObj = new Date(dateKey + "T12:00:00");
                const dateLabel = format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR });

                return (
                  <div key={dateKey}>
                    {/* Day header */}
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">{dateLabel}</span>
                      <div className="flex items-center gap-3 text-xs">
                        {dayEntradas > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{formatCurrency(dayEntradas)}</span>
                        )}
                        {daySaidas > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">−{formatCurrency(daySaidas)}</span>
                        )}
                      </div>
                    </div>

                    {/* Entries */}
                    {items.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3",
                          idx < items.length - 1 && "border-b border-gray-50 dark:border-gray-700/50"
                        )}
                      >
                        {entry.kind === "entrada" ? (
                          <>
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                              <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                {entry.serviceName || "Serviço"}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {entry.clientName && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.clientName}</span>
                                )}
                                <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{format(entry.date, "HH:mm")}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                + {formatCurrency(entry.commissionValue ?? 0)}
                              </span>
                              <CommissionStatusBadge status={entry.commissionStatus!} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                              <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-white">
                                Pagamento recebido
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                {entry.periodoInicio && entry.periodoFim && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {entry.periodoInicio} – {entry.periodoFim}
                                  </span>
                                )}
                                {entry.totalServicos != null && (
                                  <>
                                    <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                      {entry.totalServicos} serviço{entry.totalServicos !== 1 ? "s" : ""}
                                    </span>
                                  </>
                                )}
                                {entry.recebimentoConfirmadoEm && (
                                  <>
                                    <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      Confirmado em {format(new Date(entry.recebimentoConfirmadoEm), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className={cn(
                                "text-sm font-semibold",
                                entry.paymentStatus === "PAGO" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                              )}>
                                {entry.paymentStatus === "PAGO" ? "− " : ""}{formatCurrency(entry.paymentTotal ?? 0)}
                              </span>
                              <div className="flex items-center gap-1 flex-wrap justify-end">
                                <PaymentStatusBadge status={entry.paymentStatus!} />
                                <FormaBadge forma={entry.formaPagamento} descricao={entry.formaPagamentoDescricao} />
                                {entry.autenticacaoValidada && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                                    <CheckCircle2 className="h-3 w-3" /> Autenticado
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Saldo do período</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Entradas: {formatCurrency(totalEntradas)}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Recebido: {formatCurrency(totalSaidas)}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">A receber: {formatCurrency(totalPendente)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SalonLayout>
  );
}
