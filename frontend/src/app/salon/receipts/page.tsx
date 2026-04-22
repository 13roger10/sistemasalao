"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  Clock,
  CheckCircle,
  CheckCheck,
  XCircle,
  Loader2,
  RefreshCw,
  Calendar,
  DollarSign,
  Scissors,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  QrCode,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { api } from "@/services/salon/api";
import { useRouter } from "next/navigation";

// ===== TIPOS =====
type PaymentStatus = "PENDENTE" | "PROCESSANDO" | "PAGO" | "CANCELADO";
type FormaPagamento = "PIX" | "DINHEIRO" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "TRANSFERENCIA" | "VALE" | null;

interface ProfessionalPayment {
  id: number;
  salonId: number;
  profissionalId: number;
  profissionalNome: string;
  periodoInicio: string;
  periodoFim: string;
  totalServicos: number;
  valorTotalServicos: number;
  valorTotalComissoes: number;
  status: PaymentStatus;
  statusDescricao: string;
  formaPagamento?: FormaPagamento;
  formaPagamentoDescricao?: string;
  observacoes?: string;
  referenciaTransacao?: string;
  pagoEm?: string;
  recebimentoConfirmadoEm?: string;
  autenticacaoValidada?: boolean;
  criadoEm: string;
}

// ===== HELPERS =====
const statusConfig: Record<PaymentStatus, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  PENDENTE: {
    label: "Pendente",
    icon: <Clock className="h-3 w-3" />,
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  PROCESSANDO: {
    label: "Processando",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  PAGO: {
    label: "Pago",
    icon: <CheckCircle className="h-3 w-3" />,
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
  },
  CANCELADO: {
    label: "Cancelado",
    icon: <XCircle className="h-3 w-3" />,
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
};

const StatusBadge = ({ status }: { status: PaymentStatus }) => {
  const cfg = statusConfig[status] ?? statusConfig.PENDENTE;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

const formaConfig: Record<NonNullable<FormaPagamento>, { label: string; icon: React.ReactNode; color: string }> = {
  PIX: { label: "PIX", icon: <QrCode className="h-3 w-3" />, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  DINHEIRO: { label: "Dinheiro", icon: <Banknote className="h-3 w-3" />, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  CARTAO_CREDITO: { label: "Cartão de Crédito", icon: <CreditCard className="h-3 w-3" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  CARTAO_DEBITO: { label: "Cartão de Débito", icon: <CreditCard className="h-3 w-3" />, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  TRANSFERENCIA: { label: "Transferência", icon: <ArrowLeftRight className="h-3 w-3" />, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  VALE: { label: "Vale", icon: <Wallet className="h-3 w-3" />, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
};

const FormaPagamentoBadge = ({ forma }: { forma?: FormaPagamento }) => {
  if (!forma) return <span className="text-sm text-gray-400 dark:text-gray-500">—</span>;
  const cfg = formaConfig[forma];
  if (!cfg) return <span className="text-sm text-gray-500">{forma}</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ===== COMPONENTE PRINCIPAL =====
export default function ReceiptsPage() {
  const { user, isLoading: authLoading } = useSalonAuth();
  const router = useRouter();

  const [payments, setPayments] = useState<ProfessionalPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [activePeriod, setActivePeriod] = useState<"day" | "week" | "month" | "all">("month");
  const [showFilters, setShowFilters] = useState(false);

  // Confirmação de recebimento
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSenha, setConfirmSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [operacaoBloqueada, setOperacaoBloqueada] = useState(false);
  const [confirmForma, setConfirmForma] = useState<FormaPagamento | "">("");

  // Redireciona não-profissional
  useEffect(() => {
    if (!authLoading && user?.role !== "PROFESSIONAL") {
      router.replace("/salon/dashboard");
    }
  }, [authLoading, user, router]);

  // ===== CARGA DE DADOS =====
  const loadPayments = useCallback(async () => {
    if (!user?.professionalId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        content: ProfessionalPayment[];
        totalElements: number;
      }>(`/pagamentos-profissional/profissional/${user.professionalId}`, {
        page: 0,
        size: 100,
        sort: "criadoEm,desc",
      });
      setPayments(response.content ?? []);
    } catch (err) {
      console.error("Erro ao carregar recebimentos:", err);
      setError("Não foi possível carregar os recebimentos.");
    } finally {
      setLoading(false);
    }
  }, [user?.professionalId]);

  useEffect(() => {
    if (!authLoading && user?.role === "PROFESSIONAL") {
      loadPayments();
    }
  }, [authLoading, user, loadPayments]);

  const handleConfirmarRecebimento = async () => {
    if (!confirmingId || operacaoBloqueada) return;
    if (!confirmForma) {
      setConfirmError("Selecione a forma de pagamento recebida.");
      return;
    }
    if (!confirmSenha.trim()) {
      setConfirmError("Digite sua senha para confirmar.");
      return;
    }
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      // Step 1 — JWT re-authentication via dedicated endpoint
      const validacao = await api.post<{ valido: boolean }>(
        `/auth/validar-senha`,
        { senha: confirmSenha }
      );
      if (!validacao.valido) {
        setConfirmError("Senha incorreta. Verifique e tente novamente.");
        setConfirmSenha("");
        setConfirmLoading(false);
        return;
      }

      // Step 2 — business action (also validates server-side with brute-force guard)
      const updated = await api.post<ProfessionalPayment>(
        `/pagamentos-profissional/${confirmingId}/confirmar-recebimento`,
        { senha: confirmSenha, formaPagamento: confirmForma }
      );
      setPayments(prev =>
        prev.map(p => p.id === confirmingId
          ? { ...p, recebimentoConfirmadoEm: updated.recebimentoConfirmadoEm, autenticacaoValidada: updated.autenticacaoValidada }
          : p)
      );
      setConfirmingId(null);
      setConfirmSenha("");
      setShowSenha(false);
      setOperacaoBloqueada(false);
      setConfirmForma("");
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      const code = apiErr?.code ?? "";
      const rawMessage = apiErr?.message ?? "";
      // Strip "[HTTP 4xx] " prefix added by api.ts
      const message = rawMessage.replace(/^\[HTTP \d+\]\s*/, "");

      if (code === "MUITAS_TENTATIVAS_SENHA") {
        setOperacaoBloqueada(true);
        setConfirmError(message || "Operação bloqueada por excesso de tentativas. Feche e tente mais tarde.");
        setConfirmSenha("");
      } else if (code === "SENHA_INVALIDA") {
        setConfirmError(message || "Senha incorreta.");
        setConfirmSenha("");
      } else {
        setConfirmError("Não foi possível confirmar o recebimento. Tente novamente.");
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  // ===== FILTRO POR PERÍODO =====
  const periodRange = useMemo(() => {
    const now = new Date();
    if (activePeriod === "day") {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (activePeriod === "week") {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (activePeriod === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    return null; // "all"
  }, [activePeriod]);

  // ===== FILTROS APLICADOS =====
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;

      if (periodRange) {
        const created = new Date(p.criadoEm);
        if (created < periodRange.start || created > periodRange.end) return false;
      }

      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const period = `${formatDate(p.periodoInicio)} - ${formatDate(p.periodoFim)}`;
        if (
          !period.toLowerCase().includes(s) &&
          !(p.referenciaTransacao ?? "").toLowerCase().includes(s) &&
          !(p.observacoes ?? "").toLowerCase().includes(s)
        ) return false;
      }

      return true;
    });
  }, [payments, statusFilter, periodRange, searchTerm]);

  // ===== TOTAIS =====
  const totals = useMemo(() => ({
    received: filtered.filter((p) => p.status === "PAGO").reduce((s, p) => s + p.valorTotalComissoes, 0),
    pending: filtered.filter((p) => p.status === "PENDENTE").reduce((s, p) => s + p.valorTotalComissoes, 0),
    processing: filtered.filter((p) => p.status === "PROCESSANDO").reduce((s, p) => s + p.valorTotalComissoes, 0),
    totalServices: filtered.reduce((s, p) => s + p.totalServicos, 0),
  }), [filtered]);

  const confirmingPayment = payments.find(p => p.id === confirmingId) ?? null;

  // ===== LOADING / ERROR STATES =====
  if (authLoading || (loading && payments.length === 0)) {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recebimentos</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Histórico de pagamentos de comissões recebidos
            </p>
          </div>
          <Button variant="outline" onClick={loadPayments} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recebido</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totals.received)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pendente</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totals.pending)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Loader2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Processando</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totals.processing)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                <Scissors className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de Serviços</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{totals.totalServices}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por período ou referência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick period filters */}
            <div className="flex items-center gap-2">
              {(["day", "week", "month", "all"] as const).map((period) => {
                const labels = { day: "Hoje", week: "Esta Semana", month: "Este Mês", all: "Todos" };
                const active = activePeriod === period;
                return (
                  <button
                    key={period}
                    onClick={() => setActivePeriod(period)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary-600 text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {labels[period]}
                  </button>
                );
              })}
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-1 h-4 w-4" />
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="max-w-xs">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "all")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">Todos</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="PROCESSANDO">Processando</option>
                  <option value="PAGO">Pago</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Lista de recebimentos */}
        {filtered.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 dark:border-gray-600">
            <Wallet className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum recebimento encontrado</p>
            {activePeriod !== "all" && (
              <button
                onClick={() => setActivePeriod("all")}
                className="mt-2 text-sm text-primary-600 hover:underline dark:text-primary-400"
              >
                Ver todos os períodos
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Período</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Serviços</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Valor Serviços</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Comissão</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Forma de Pagamento</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Pago em</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatDate(p.periodoInicio)} – {formatDate(p.periodoFim)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Criado em {formatDateTime(p.criadoEm)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{p.totalServicos}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {formatCurrency(p.valorTotalServicos)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                        {formatCurrency(p.valorTotalComissoes)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <FormaPagamentoBadge forma={p.formaPagamento} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {p.pagoEm ? formatDateTime(p.pagoEm) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "PAGO" && !p.recebimentoConfirmadoEm ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => { setConfirmingId(p.id); setConfirmError(null); setConfirmSenha(""); setShowSenha(false); setOperacaoBloqueada(false); setConfirmForma(p.formaPagamento ?? ""); }}
                        >
                          <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                          Confirmar Recebimento
                        </Button>
                      ) : p.recebimentoConfirmadoEm ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCheck className="h-3 w-3" />
                            Recebido em {formatDate(p.recebimentoConfirmadoEm)}
                          </span>
                          {p.autenticacaoValidada && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                              <CheckCheck className="h-3 w-3" />
                              Autenticado
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé com total */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} recebimento{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
              <DollarSign className="h-4 w-4 text-primary-600" />
              Total recebido: {formatCurrency(totals.received)}
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmação de recebimento */}
      {confirmingId !== null && confirmingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Confirmar Recebimento
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Período</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDate(confirmingPayment.periodoInicio)} – {formatDate(confirmingPayment.periodoFim)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Serviços</span>
                <span className="font-medium text-gray-900 dark:text-white">{confirmingPayment.totalServicos}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Valor da comissão</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(confirmingPayment.valorTotalComissoes)}
                </span>
              </div>
              {confirmingPayment.formaPagamento && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Forma de pagamento</span>
                  <FormaPagamentoBadge forma={confirmingPayment.formaPagamento} />
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Ao confirmar, você declara ter recebido o valor acima. Informe como o pagamento foi recebido e sua senha.
            </p>

            {/* Forma de pagamento */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Como você recebeu? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "PIX",            label: "PIX",           icon: <QrCode className="h-4 w-4" /> },
                    { value: "DINHEIRO",        label: "Dinheiro",      icon: <Banknote className="h-4 w-4" /> },
                    { value: "TRANSFERENCIA",   label: "Transferência", icon: <ArrowLeftRight className="h-4 w-4" /> },
                    { value: "CARTAO_CREDITO",  label: "Créd.",         icon: <CreditCard className="h-4 w-4" /> },
                    { value: "CARTAO_DEBITO",   label: "Déb.",          icon: <CreditCard className="h-4 w-4" /> },
                    { value: "VALE",            label: "Vale",          icon: <Wallet className="h-4 w-4" /> },
                  ] as { value: FormaPagamento; label: string; icon: React.ReactNode }[]
                ).map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setConfirmForma(value); setConfirmError(null); }}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-xs font-medium transition-all ${
                      confirmForma === value
                        ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                        : "border-gray-200 bg-white text-gray-600 hover:border-violet-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de senha */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  value={confirmSenha}
                  onChange={e => { setConfirmSenha(e.target.value); setConfirmError(null); }}
                  onKeyDown={e => e.key === "Enter" && !confirmLoading && handleConfirmarRecebimento()}
                  placeholder="Digite sua senha"
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {confirmError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {confirmError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setConfirmingId(null); setConfirmError(null); setConfirmSenha(""); setShowSenha(false); setOperacaoBloqueada(false); setConfirmForma(""); }}
                disabled={confirmLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleConfirmarRecebimento}
                disabled={confirmLoading || operacaoBloqueada}
              >
                {confirmLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="mr-2 h-4 w-4" />
                )}
                {operacaoBloqueada ? "Operação Bloqueada" : "Confirmar Recebimento"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </SalonLayout>
  );
}
