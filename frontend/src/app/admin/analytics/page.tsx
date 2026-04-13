"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Heart,
  Eye,
  MessageCircle,
  Share2,
  BarChart2,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Instagram,
  Facebook,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  analyticsService,
  presetToRange,
  type PeriodoPreset,
  type MetricasAgendamento,
  type MetricasFinanceiras,
  type MetricasSocial,
  PERIODO_LABELS,
} from "@/services/analytics";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SALON_ID = 1;

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito",
  PIX: "PIX",
  TRANSFERENCIA: "Transferência",
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return iso.slice(5); // MM-DD
}

// ─── Shared KPI card ──────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  sub,
  icon,
  color = "violet",
  trend,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: number;
}) {
  const bg: Record<string, string> = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    pink: "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2.5 ${bg[color] ?? bg.violet}`}>{icon}</div>
        {trend !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-500 dark:text-red-400"
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{children}</h3>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`} />
  );
}

// ─── Tab: Agendamentos ────────────────────────────────────────────────────────

function TabAgendamentos({ data }: { data: MetricasAgendamento }) {
  const chartData = data.evolucaoDiaria.slice(-30).map((d) => ({
    name: fmtDate(d.data),
    Concluídos: d.concluidos,
    Cancelados: d.cancelados,
    Total: d.total,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Total de agendamentos"
          value={fmt(data.total)}
          icon={<Calendar className="h-5 w-5" />}
          color="violet"
        />
        <KpiCard
          title="Concluídos"
          value={fmt(data.concluidos)}
          sub={`${data.taxaConclusao.toFixed(1)}% de conclusão`}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <KpiCard
          title="Cancelados"
          value={fmt(data.cancelados)}
          icon={<XCircle className="h-5 w-5" />}
          color="red"
        />
        <KpiCard
          title="No-shows"
          value={fmt(data.noShows)}
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* Daily evolution chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <SectionTitle>Evolução diária (últimos 30 dias)</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradConcluidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCancelados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="Concluídos"
                stroke="#10b981"
                fill="url(#gradConcluidos)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Cancelados"
                stroke="#ef4444"
                fill="url(#gradCancelados)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By professional & service */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data.porProfissional.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <SectionTitle>Por profissional</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.porProfissional.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="profissionalNome"
                  type="category"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip />
                <Bar dataKey="totalAgendamentos" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Total" />
                <Bar dataKey="concluidos" fill="#10b981" radius={[0, 4, 4, 0]} name="Concluídos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.porServico.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <SectionTitle>Top serviços</SectionTitle>
            <ul className="space-y-2.5">
              {data.porServico.slice(0, 6).map((s) => (
                <li key={s.servicoId} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-gray-700 dark:text-gray-300">
                    {s.servicoNome}
                  </span>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{fmt(s.totalAgendamentos)} agend.</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {fmtMoney(s.ticketMedio)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Financeiro ──────────────────────────────────────────────────────────

function TabFinanceiro({ data }: { data: MetricasFinanceiras }) {
  const evolucaoData = data.evolucaoMensal.map((m) => ({
    name: m.mes.slice(0, 7),
    Faturamento: Number(m.totalBruto),
    Ticket: Number(m.ticketMedio),
    crescimento: m.crescimentoPercentual,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Faturamento bruto"
          value={fmtMoney(Number(data.totalBruto))}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
          trend={
            data.evolucaoMensal.length >= 2
              ? data.evolucaoMensal[data.evolucaoMensal.length - 1].crescimentoPercentual
              : undefined
          }
        />
        <KpiCard
          title="Ticket médio"
          value={fmtMoney(Number(data.ticketMedio))}
          icon={<Award className="h-5 w-5" />}
          color="violet"
        />
        <KpiCard
          title="Atendimentos pagos"
          value={fmt(data.totalAtendimentos)}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <KpiCard
          title="Faturamento líquido"
          value={fmtMoney(Number(data.totalLiquido))}
          icon={<TrendingUp className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* Monthly evolution */}
      {evolucaoData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <SectionTitle>Evolução mensal do faturamento</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={evolucaoData}>
              <defs>
                <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v: number) => fmtMoney(v)} />
              <Area
                type="monotone"
                dataKey="Faturamento"
                stroke="#8b5cf6"
                fill="url(#gradFat)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment method pie */}
        {data.porFormaPagamento.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <SectionTitle>Por forma de pagamento</SectionTitle>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie
                    data={data.porFormaPagamento}
                    dataKey="percentual"
                    nameKey="formaPagamento"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                  >
                    {data.porFormaPagamento.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 text-xs">
                {data.porFormaPagamento.map((f, i) => (
                  <li key={f.formaPagamento} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-gray-600 dark:text-gray-400">
                      {FORMA_PAGAMENTO_LABELS[f.formaPagamento] ?? f.formaPagamento}
                    </span>
                    <span className="ml-auto font-medium text-gray-900 dark:text-white">
                      {f.percentual.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Revenue by professional */}
        {data.porProfissional.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <SectionTitle>Faturamento por profissional</SectionTitle>
            <ul className="space-y-2.5">
              {data.porProfissional.slice(0, 6).map((p) => (
                <li key={p.profissionalId} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-gray-700 dark:text-gray-300">
                    {p.profissionalNome}
                  </span>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{fmt(p.quantidade)} atend.</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {fmtMoney(Number(p.total))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Social ──────────────────────────────────────────────────────────────

function TabSocial({ data }: { data: MetricasSocial }) {
  const chartData = data.evolucaoDiaria.slice(-30).map((d) => ({
    name: fmtDate(d.data),
    Curtidas: d.curtidas,
    Comentários: d.comentarios,
    Alcance: d.alcance,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Posts publicados"
          value={fmt(data.postsPublicados)}
          icon={<BarChart2 className="h-5 w-5" />}
          color="violet"
        />
        <KpiCard
          title="Alcance total"
          value={fmt(data.alcanceTotal)}
          icon={<Eye className="h-5 w-5" />}
          color="blue"
        />
        <KpiCard
          title="Curtidas"
          value={fmt(data.totalCurtidas)}
          icon={<Heart className="h-5 w-5" />}
          color="pink"
        />
        <KpiCard
          title="Engajamento médio"
          value={`${data.engajamentoMedio.toFixed(2)}%`}
          sub={`Melhor dia: ${data.melhorDia} · Melhor horário: ${data.melhorHorario}`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Engagement area chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <SectionTitle>Engajamento diário (últimos 30 dias)</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradCurtidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAlcance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="Curtidas"
                stroke="#ec4899"
                fill="url(#gradCurtidas)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Comentários"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="transparent"
              />
              <Area
                type="monotone"
                dataKey="Alcance"
                stroke="#3b82f6"
                fill="url(#gradAlcance)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By platform */}
        {data.porPlataforma.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <SectionTitle>Por plataforma</SectionTitle>
            <div className="space-y-4">
              {data.porPlataforma.map((p) => (
                <div key={p.plataforma} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                    {p.plataforma === "INSTAGRAM" ? (
                      <Instagram className="h-4 w-4 text-pink-500" />
                    ) : (
                      <Facebook className="h-4 w-4 text-blue-500" />
                    )}
                    {p.plataforma.charAt(0) + p.plataforma.slice(1).toLowerCase()}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      <Heart className="mr-0.5 inline h-3 w-3" />
                      {fmt(p.totalCurtidas)}
                    </span>
                    <span>
                      <MessageCircle className="mr-0.5 inline h-3 w-3" />
                      {fmt(p.totalComentarios)}
                    </span>
                    <span>
                      <Share2 className="mr-0.5 inline h-3 w-3" />
                      {fmt(p.totalCompartilhamentos)}
                    </span>
                    <span>
                      <Eye className="mr-0.5 inline h-3 w-3" />
                      {fmt(p.alcanceTotal)}
                    </span>
                    <span className="col-span-2 font-medium text-gray-700 dark:text-gray-300">
                      {p.engajamentoMedio.toFixed(2)}% engaj.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top posts */}
        {data.topPosts.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <SectionTitle>Top posts</SectionTitle>
            <ul className="space-y-3">
              {data.topPosts.slice(0, 5).map((post, i) => (
                <li key={post.postId} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                    {i + 1}
                  </span>
                  {post.imagemUrl && (
                    <img
                      src={post.imagemUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                      {post.legenda ?? "—"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      ♥ {fmt(post.curtidas)} · 👁 {fmt(post.alcance)} · {post.engajamentoRate.toFixed(1)}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "agendamentos" | "financeiro" | "social";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("agendamentos");
  const [preset, setPreset] = useState<PeriodoPreset>("this_month");
  const [isLoading, setIsLoading] = useState(false);

  const [agendamentos, setAgendamentos] = useState<MetricasAgendamento | null>(null);
  const [financeiro, setFinanceiro] = useState<MetricasFinanceiras | null>(null);
  const [social, setSocial] = useState<MetricasSocial | null>(null);

  const salonId = DEFAULT_SALON_ID;

  const load = useCallback(async () => {
    setIsLoading(true);
    const range = presetToRange(preset);
    try {
      if (tab === "agendamentos") {
        const data = await analyticsService.agendamentos(salonId, range);
        setAgendamentos(data);
      } else if (tab === "financeiro") {
        const data = await analyticsService.financeiro(salonId, range);
        setFinanceiro(data);
      } else {
        const data = await analyticsService.social(salonId, range);
        setSocial(data);
      }
    } catch {
      // Silently fail; real app would show error toast
    } finally {
      setIsLoading(false);
    }
  }, [salonId, tab, preset]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "agendamentos", label: "Agendamentos" },
    { key: "financeiro", label: "Financeiro" },
    { key: "social", label: "Social Media" },
  ];

  const presets: PeriodoPreset[] = [
    "this_month",
    "last_30",
    "last_3_months",
    "last_6_months",
    "this_year",
  ];

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Métricas de agendamentos, faturamento e redes sociais.
            </p>
          </div>

          {/* Period selector */}
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as PeriodoPreset)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            {presets.map((p) => (
              <option key={p} value={p}>
                {PERIODO_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-b-2 border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-64" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        ) : (
          <>
            {tab === "agendamentos" && agendamentos && (
              <TabAgendamentos data={agendamentos} />
            )}
            {tab === "financeiro" && financeiro && (
              <TabFinanceiro data={financeiro} />
            )}
            {tab === "social" && social && (
              <TabSocial data={social} />
            )}
            {((tab === "agendamentos" && !agendamentos) ||
              (tab === "financeiro" && !financeiro) ||
              (tab === "social" && !social)) && (
              <div className="flex items-center justify-center py-24 text-gray-400">
                <p className="text-sm">Nenhum dado disponível para o período selecionado.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
