"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Percent,
  Hash,
  CreditCard,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Search,
  FileSpreadsheet,
  Wallet,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { DataTable, Column, ActionMenuItem } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/Toast";
import { escaparHtml } from "@/utils/html";
import { baixarCsv } from "@/utils/csv";
import { commissionService } from "@/services/salon";
import { dataLocal } from "@/services/salon/financeService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { useUnit } from "@/contexts/UnitContext";

const mensagemDeErro = (error: unknown): string =>
  error instanceof Error ? error.message.replace(/^\[HTTP \d+\]\s*/, "") : "Tente novamente.";
import type {
  Commission,
  CommissionStatus,
  CommissionFilters,
  CommissionPayment,
  CommissionPaymentInput,
  ProfessionalCommissionSummary,
  CommissionStats,
  CommissionRule,
  CommissionRuleCreateInput,
} from "@/types/salon";
import type { CommissionType } from "@/types/salon/professional";
import type { DateRange } from "@/types/salon/common";

// ===== COMPONENTES AUXILIARES =====

// Badge de Status da Comissão
const CommissionStatusBadge = ({ status }: { status: CommissionStatus }) => {
  const config = {
    pending: {
      label: "Pendente",
      icon: <Clock className="h-3 w-3" />,
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-400",
    },
    paid: {
      label: "Pago",
      icon: <CheckCircle className="h-3 w-3" />,
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
    },
    canceled: {
      label: "Cancelado",
      icon: <XCircle className="h-3 w-3" />,
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
    },
  };

  const { label, icon, bg, text } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      {icon}
      {label}
    </span>
  );
};

// Badge de Tipo de Comissão
const CommissionTypeBadge = ({
  type,
  value,
}: {
  type: CommissionType;
  value: number;
}) => {
  if (type === "percentage") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <Percent className="h-3 w-3" />
        {value}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      <Hash className="h-3 w-3" />
      R$ {value.toFixed(2)}
    </span>
  );
};

// Card de Estatística
const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "primary",
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "primary" | "success" | "warning" | "danger";
}) => {
  const colorClasses = {
    primary: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[color]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend === "up" ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
};

// Card de Profissional com Resumo de Comissões
const ProfessionalCommissionCard = ({
  summary,
  onViewDetails,
  onPayCommissions,
}: {
  summary: ProfessionalCommissionSummary;
  onViewDetails: () => void;
  onPayCommissions: () => void;
}) => {
  const pendingPercentage =
    summary.totalCommission > 0
      ? (summary.pendingCommission / summary.totalCommission) * 100
      : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {summary.avatar ? (
              <img
                src={summary.avatar}
                alt={summary.professionalName}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <Users className="h-6 w-6" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {summary.professionalName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {summary.totalServices} serviços
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Comissões
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            R$ {summary.totalCommission.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Faturamento
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            R$ {summary.totalRevenue.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Pendente</span>
          <span className="font-medium text-yellow-600 dark:text-yellow-400">
            R$ {summary.pendingCommission.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${100 - pendingPercentage}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Pago: R$ {summary.paidCommission.toFixed(2)}</span>
          <span>{(100 - pendingPercentage).toFixed(0)}%</span>
        </div>
      </div>

      {summary.pendingCommission > 0 && (
        <Button
          variant="primary"
          size="sm"
          className="mt-4 w-full"
          onClick={onPayCommissions}
        >
          <Wallet className="mr-2 h-4 w-4" />
          Pagar Comissões
        </Button>
      )}
    </div>
  );
};

/** Resumo por profissional a partir das comissões carregadas (dados reais do backend). */
const resumirPorProfissional = (commissions: Commission[]): ProfessionalCommissionSummary[] => {
  const summaryMap = new Map<string, ProfessionalCommissionSummary>();

  commissions.forEach((commission) => {
    if (commission.status === "canceled") return;
    if (!summaryMap.has(commission.professionalId)) {
      summaryMap.set(commission.professionalId, {
        professionalId: commission.professionalId,
        professionalName: commission.professionalName,
        period: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
        totalServices: 0,
        totalRevenue: 0,
        totalCommission: 0,
        pendingCommission: 0,
        paidCommission: 0,
        byService: [],
      });
    }

    const summary = summaryMap.get(commission.professionalId)!;
    summary.totalServices += 1;
    summary.totalRevenue += commission.servicePrice;
    summary.totalCommission += commission.commissionValue;

    if (commission.status === "pending") {
      summary.pendingCommission += commission.commissionValue;
    } else if (commission.status === "paid") {
      summary.paidCommission += commission.commissionValue;
    }

    const service = summary.byService.find((s) => s.serviceId === commission.serviceId);
    if (service) {
      service.count += 1;
      service.revenue += commission.servicePrice;
      service.commission += commission.commissionValue;
    } else {
      summary.byService.push({
        serviceId: commission.serviceId,
        serviceName: commission.serviceName,
        count: 1,
        revenue: commission.servicePrice,
        commission: commission.commissionValue,
      });
    }
  });

  return Array.from(summaryMap.values());
};

/** Comissão que ainda pode entrar num repasse: pendente e fora de outro repasse. */
const disponivelParaRepasse = (c: Commission) => c.status === "pending" && !c.payoutId;

const FORMAS_REPASSE = [
  { value: "PIX", label: "PIX" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "TRANSFERENCIA", label: "Transferência" },
];

// ===== COMPONENTE PRINCIPAL =====
export default function CommissionPage() {
  const { user } = useSalonAuth();
  const { selectedUnitId } = useUnit();
  const toast = useToast();

  const isProfessional = user?.role === 'PROFESSIONAL';

  // ===== ESTADOS =====
  const [activeTab, setActiveTab] = useState<"commissions" | "summary" | "report">("commissions");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summaries, setSummaries] = useState<ProfessionalCommissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | "all">("all");
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");

  const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const todayEnd = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };

  const [activePeriod, setActivePeriod] = useState<"day" | "week" | "month" | "custom">(
    isProfessional ? "day" : "month"
  );
  const [dateRange, setDateRange] = useState<DateRange>(
    isProfessional
      ? { startDate: todayStart(), endDate: todayEnd() }
      : { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date() }
  );
  const [showFilters, setShowFilters] = useState(false);

  const applyPeriod = (period: "day" | "week" | "month") => {
    const now = new Date();
    let start: Date;
    let end: Date;
    if (period === "day") {
      start = todayStart();
      end = todayEnd();
    } else if (period === "week") {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    setActivePeriod(period);
    setDateRange({ startDate: start, endDate: end });
  };

  // Modais
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalCommissionSummary | null>(null);

  // Repasse ao profissional: comissões pendentes (fora de outro repasse) dele no filtro atual
  const [payout, setPayout] = useState<{ professionalId: string; professionalName: string; commissions: Commission[] } | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "PIX",
    paymentReference: "",
    notes: "",
  });

  // ===== CARREGAR DADOS =====
  const loadData = useCallback(async () => {
    // Auth hydrates from localStorage asynchronously — user is briefly null on mount.
    // Without this guard, that first render fires with user=null, which falls through
    // to the ADMIN/RECEPCIONIST branch below (listBySalon) before the real role is known.
    if (!user) return;
    setLoading(true);
    try {
      let data: Commission[];
      if (user?.role === 'PROFESSIONAL') {
        // PROFESSIONAL sem professionalId configurado: bloqueia — não expõe dados de outros
        if (!user.professionalId) {
          setCommissions([]);
          setSummaries([]);
          return;
        }
        // Endpoint dedicado garante isolamento no backend
        const response = await commissionService.listByProfessional(String(user.professionalId));
        data = response.data;
        // Aplica filtro client-side automático como defesa em profundidade
        setProfessionalFilter(String(user.professionalId));
      } else {
        // ADMIN / RECEPCIONIST: listagem geral do salão do usuário (antes era sempre o salão 1)
        if (!selectedUnitId) return;
        const response = await commissionService.listBySalon(String(selectedUnitId));
        data = response.data;
      }
      setCommissions(data);
      setSummaries(resumirPorProfissional(data));
    } catch (error) {
      console.error("Erro ao carregar comissões:", error);
      toast.error("Não foi possível carregar as comissões", mensagemDeErro(error));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedUnitId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== ESTATÍSTICAS =====
  const stats = useMemo(() => {
    const pending = commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.commissionValue, 0);
    const paidThisMonth = commissions
      .filter(
        (c) =>
          c.status === "paid" &&
          c.paidAt &&
          c.paidAt.getMonth() === new Date().getMonth()
      )
      .reduce((sum, c) => sum + c.commissionValue, 0);
    const total = commissions.reduce((sum, c) => sum + c.commissionValue, 0);

    return {
      totalPending: pending,
      totalPaidThisMonth: paidThisMonth,
      totalCommissions: total,
      averageCommission:
        commissions.length > 0 ? total / commissions.length : 0,
    };
  }, [commissions]);

  // ===== FILTROS =====
  const filteredCommissions = useMemo(() => {
    return commissions.filter((commission) => {
      // Filtro de busca
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !commission.professionalName.toLowerCase().includes(search) &&
          !commission.clientName.toLowerCase().includes(search) &&
          !commission.serviceName.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      // Filtro de status
      if (statusFilter !== "all" && commission.status !== statusFilter) {
        return false;
      }

      // Filtro de profissional
      if (
        professionalFilter !== "all" &&
        commission.professionalId !== professionalFilter
      ) {
        return false;
      }

      // Filtro de data
      const commissionDate = new Date(commission.appointmentDate);
      if (
        commissionDate < dateRange.startDate ||
        commissionDate > dateRange.endDate
      ) {
        return false;
      }

      return true;
    });
  }, [commissions, searchTerm, statusFilter, professionalFilter, dateRange]);

  // ===== HANDLERS =====
  // Repasse ao profissional: junta as comissões pendentes dele no filtro atual (fora de outro
  // repasse). O backend paga por período, então todas as comissões pendentes do profissional
  // naquele período entram juntas — não dá para pagar uma comissão avulsa.
  const abrirRepasse = (professionalId: string, professionalName: string) => {
    const pendentes = filteredCommissions.filter(
      (c) => c.professionalId === professionalId && disponivelParaRepasse(c)
    );
    if (pendentes.length === 0) {
      toast.info("Nada a repassar", `${professionalName} não tem comissões pendentes fora de outro repasse neste período.`);
      return;
    }
    setPayout({ professionalId, professionalName, commissions: pendentes });
    setPaymentForm({ paymentMethod: "PIX", paymentReference: "", notes: "" });
    setShowPayModal(true);
  };

  const handleConfirmPay = async () => {
    if (!payout || !selectedUnitId) return;
    if (!paymentForm.paymentReference.trim()) {
      toast.error("Informe a referência", "Ex.: ID do PIX, número da transferência ou \"pago em dinheiro\".");
      return;
    }
    // Período do repasse = dias em que as comissões foram geradas (o backend filtra por essa data)
    const datas = payout.commissions.map((c) => dataLocal(new Date(c.createdAt))).sort();
    setIsPaying(true);
    let repasseId: number | undefined;
    try {
      const repasse = await commissionService.payouts.gerar(String(selectedUnitId), {
        professionalId: payout.professionalId,
        periodStart: datas[0],
        periodEnd: datas[datas.length - 1],
        notes: paymentForm.notes,
      });
      repasseId = repasse.id;
      await commissionService.payouts.confirmar(repasse.id, {
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.paymentReference.trim(),
        notes: paymentForm.notes,
      });
      toast.success("Repasse registrado",
        `${payout.professionalName}: ${repasse.totalServicos} comissão(ões), R$ ${Number(repasse.valorTotalComissoes).toFixed(2)}.`);
      setShowPayModal(false);
      setPayout(null);
      loadData();
    } catch (error) {
      toast.error(
        repasseId ? "Repasse gerado, mas não confirmado" : "Não foi possível gerar o repasse",
        mensagemDeErro(error)
      );
      if (repasseId) loadData();
    } finally {
      setIsPaying(false);
    }
  };

  const handlePayProfessionalCommissions = (summary: ProfessionalCommissionSummary) => {
    abrirRepasse(summary.professionalId, summary.professionalName);
  };

  const handleExportPDF = () => {
    const formatCurrency = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (d: Date | string) =>
      new Date(d).toLocaleDateString('pt-BR');
    const statusLabel = (s: string) =>
      s === 'paid' ? 'Pago' : s === 'pending' ? 'Pendente' : 'Cancelado';

    // Todo valor passa por escaparHtml: nomes vêm de cadastros que clientes e profissionais editam
    // (um nome "<img onerror=…>" executava no navegador de quem exportava e lia o token de sessão)
    const e = escaparHtml;
    const rows = filteredCommissions.map(c => `
      <tr>
        <td>${e(isProfessional ? (c.clientName || '—') : (c.professionalName || '—'))}</td>
        <td>${e(c.serviceName || '—')}</td>
        <td>${e(formatCurrency(c.servicePrice))}</td>
        <td>${e(c.commissionType === 'percentage' ? c.commissionRate + '%' : formatCurrency(c.commissionRate))}</td>
        <td class="value">${e(formatCurrency(c.commissionValue))}</td>
        <td class="status-${e(c.status)}">${e(statusLabel(c.status))}</td>
        <td>${e(formatDate(c.appointmentDate))}</td>
      </tr>`).join('');

    const totalComissoes = filteredCommissions.reduce((s, c) => s + c.commissionValue, 0);
    const totalPago = filteredCommissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.commissionValue, 0);
    const totalPendente = filteredCommissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commissionValue, 0);

    const colLabel = isProfessional ? 'Cliente' : 'Profissional';
    const geradoEm = new Date().toLocaleString('pt-BR');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <!-- Nenhum script roda nesta janela, mesmo que algum valor escape do escaparHtml -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"/>
  <title>Relatório de Comissões</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; padding: 24px; }
    h1 { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
    .subtitle { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
    .summary { display: flex; gap: 24px; margin-bottom: 20px; }
    .summary-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; }
    .summary-item .label { font-size: 10px; color: #6b7280; margin-bottom: 2px; }
    .summary-item .amount { font-size: 14px; font-weight: bold; }
    .amount-green { color: #059669; }
    .amount-amber { color: #d97706; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #7c3aed; color: white; }
    thead th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
    td.value { font-weight: 600; }
    td.status-paid { color: #059669; font-weight: 600; }
    td.status-pending { color: #d97706; font-weight: 600; }
    td.status-canceled { color: #dc2626; font-weight: 600; }
    .footer { margin-top: 16px; font-size: 10px; color: #9ca3af; text-align: right; }
    @media print {
      body { padding: 0; }
      @page { margin: 15mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <h1>Relatório de Comissões</h1>
  <p class="subtitle">Gerado em ${e(geradoEm)} · ${filteredCommissions.length} registro(s)</p>
  <div class="summary">
    <div class="summary-item">
      <div class="label">Total comissões</div>
      <div class="amount">${formatCurrency(totalComissoes)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Pago</div>
      <div class="amount amount-green">${formatCurrency(totalPago)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Pendente</div>
      <div class="amount amount-amber">${formatCurrency(totalPendente)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${e(colLabel)}</th><th>Serviço</th><th>Valor Serviço</th>
        <th>Taxa</th><th>Comissão</th><th>Status</th><th>Data</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Belezza · ${e(geradoEm)}</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      // A impressão é chamada daqui: a CSP da janela não deixa rodar script dentro dela
      w.focus();
      w.print();
    }
  };

  const handleExportExcel = () => {
    // Criar dados para exportação
    const exportData = filteredCommissions.map((commission) => ({
      Profissional: commission.professionalName,
      Cliente: commission.clientName,
      Serviço: commission.serviceName,
      "Valor Serviço": commission.servicePrice.toFixed(2),
      "Tipo Comissão": commission.commissionType === "percentage" ? "%" : "R$",
      Taxa: commission.commissionRate,
      "Valor Comissão": commission.commissionValue.toFixed(2),
      Status:
        commission.status === "paid"
          ? "Pago"
          : commission.status === "pending"
          ? "Pendente"
          : "Cancelado",
      Data: new Date(commission.appointmentDate).toLocaleDateString("pt-BR"),
      "Data Pagamento": commission.paidAt
        ? new Date(commission.paidAt).toLocaleDateString("pt-BR")
        : "-",
    }));

    // Nomes de cliente/servi\u00e7o v\u00eam de cadastro: baixarCsv neutraliza f\u00f3rmulas (CSV injection)
    const headers = Object.keys(exportData[0] || {});
    baixarCsv(`comissoes_${new Date().toISOString().split("T")[0]}.csv`, [
      headers,
      ...exportData.map((row) => headers.map((h) => row[h as keyof typeof row])),
    ]);
  };

  // ===== COLUNAS DA TABELA =====
  const commissionColumns: Column<Commission>[] = [
    {
      key: "professional",
      header: isProfessional ? "Cliente" : "Profissional",
      render: (commission) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {isProfessional ? commission.clientName : commission.professionalName}
          </p>
          {!isProfessional && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {commission.clientName}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "service",
      header: "Serviço",
      render: (commission) => (
        <div>
          <p className="text-gray-900 dark:text-white">
            {commission.serviceName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            R$ {commission.servicePrice.toFixed(2)}
          </p>
        </div>
      ),
    },
    {
      key: "commission",
      header: "Comissão",
      render: (commission) => (
        <div className="flex flex-col items-start gap-1">
          <CommissionTypeBadge
            type={commission.commissionType}
            value={commission.commissionRate}
          />
          <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
            R$ {commission.commissionValue.toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (commission) => (
        <div className="flex flex-col items-start gap-1">
          <CommissionStatusBadge status={commission.status} />
          {commission.status === "pending" && commission.payoutId && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              No repasse #{commission.payoutId}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "date",
      header: "Data",
      render: (commission) => (
        <div>
          <p className="text-gray-900 dark:text-white">
            {new Date(commission.appointmentDate).toLocaleDateString("pt-BR")}
          </p>
          {commission.paidAt && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pago em {new Date(commission.paidAt).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      ),
    },
  ];

  const renderCommissionActions = (commission: Commission) => (
    <>
      {!isProfessional && disponivelParaRepasse(commission) && (
        <ActionMenuItem
          onClick={() => abrirRepasse(commission.professionalId, commission.professionalName)}
          icon={<CheckCircle className="h-4 w-4" />}
        >
          Repassar ao profissional
        </ActionMenuItem>
      )}
      <ActionMenuItem
        onClick={() => {
          setSelectedCommission(commission);
          setShowDetailsModal(true);
        }}
        icon={<Eye className="h-4 w-4" />}
      >
        Ver Detalhes
      </ActionMenuItem>
    </>
  );

  // ===== RENDER =====
  return (
    <SalonLayout requiredRole={["ADMIN", "PROFESSIONAL"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Comissões
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Gerencie as comissões dos profissionais
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Pendente"
            value={`R$ ${stats.totalPending.toFixed(2)}`}
            icon={Clock}
            color="warning"
          />
          <StatsCard
            title="Pago este mês"
            value={`R$ ${stats.totalPaidThisMonth.toFixed(2)}`}
            icon={CheckCircle}
            color="success"
          />
          <StatsCard
            title="Total Comissões"
            value={`R$ ${stats.totalCommissions.toFixed(2)}`}
            icon={DollarSign}
            color="primary"
          />
          <StatsCard
            title="Média por Serviço"
            value={`R$ ${stats.averageCommission.toFixed(2)}`}
            icon={TrendingUp}
            color="primary"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "commissions", label: "Comissões", icon: DollarSign },
              ...(!isProfessional ? [
                { id: "summary", label: "Por Profissional", icon: Users },
              ] : []),
              { id: "report", label: "Relatório", icon: FileSpreadsheet },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab: Comissões */}
        {activeTab === "commissions" && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={isProfessional ? "Buscar por cliente ou serviço..." : "Buscar por profissional, cliente ou serviço..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isProfessional ? (
                <div className="flex items-center gap-2">
                  {(["day", "week", "month"] as const).map((period) => {
                    const labels = { day: "Hoje", week: "Esta Semana", month: "Este Mês" };
                    const active = activePeriod === period;
                    return (
                      <button
                        key={period}
                        onClick={() => applyPeriod(period)}
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
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                  {showFilters ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as CommissionStatus | "all")
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </div>
                {!isProfessional && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Profissional
                    </label>
                    <select
                      value={professionalFilter}
                      onChange={(e) => setProfessionalFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">Todos</option>
                      {summaries.map((p) => (
                        <option key={p.professionalId} value={p.professionalId}>
                          {p.professionalName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data Início
                  </label>
                  <Input
                    type="date"
                    value={dateRange.startDate.toISOString().split("T")[0]}
                    onChange={(e) => {
                      setActivePeriod("custom");
                      setDateRange((prev) => ({
                        ...prev,
                        startDate: new Date(e.target.value),
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data Fim
                  </label>
                  <Input
                    type="date"
                    value={dateRange.endDate.toISOString().split("T")[0]}
                    onChange={(e) => {
                      setActivePeriod("custom");
                      setDateRange((prev) => ({
                        ...prev,
                        endDate: new Date(e.target.value),
                      }));
                    }}
                  />
                </div>
              </div>
            )}

            {/* Tabela de Comissões */}
            <DataTable
              data={filteredCommissions}
              columns={commissionColumns}
              rowActions={renderCommissionActions}
              keyExtractor={(item) => item.id}
              isLoading={loading}
              emptyMessage="Nenhuma comissão encontrada"
            />
          </div>
        )}

        {/* Tab: Por Profissional */}
        {activeTab === "summary" && !isProfessional && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <ProfessionalCommissionCard
                key={summary.professionalId}
                summary={summary}
                onViewDetails={() => {
                  setSelectedProfessional(summary);
                  setShowDetailsModal(true);
                }}
                onPayCommissions={() =>
                  handlePayProfessionalCommissions(summary)
                }
              />
            ))}
          </div>
        )}

        {/* Tab: Relatório */}
        {activeTab === "report" && (
          <div className="space-y-6">
            {/* Filtros do Relatório */}
            <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Período
                </label>
                <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="week">Última Semana</option>
                  <option value="month" selected>
                    Último Mês
                  </option>
                  <option value="quarter">Último Trimestre</option>
                  <option value="year">Último Ano</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Agrupar por
                </label>
                <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="day">Dia</option>
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full" onClick={handleExportExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Excel
                </Button>
              </div>
            </div>

            {/* Resumo do Relatório */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total Comissões
                    </p>
                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                      R$ {stats.totalCommissions.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Valor Pago
                    </p>
                    <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
                      R$ {stats.totalPaidThisMonth.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Valor Pendente
                    </p>
                    <p className="mt-1 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      R$ {stats.totalPending.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Relatório por Profissional — oculta para PROFESSIONAL */}
            {!isProfessional && <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Comissões por Profissional
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Profissional
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Serviços
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Faturamento
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Comissão
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Pago
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Pendente
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {summaries.map((summary) => (
                      <tr key={summary.professionalId}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                              <Users className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {summary.professionalName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                          {summary.totalServices}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                          R$ {summary.totalRevenue.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          R$ {summary.totalCommission.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                          R$ {summary.paidCommission.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-yellow-600 dark:text-yellow-400">
                          R$ {summary.pendingCommission.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {summaries.reduce((sum, s) => sum + s.totalServices, 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        R${" "}
                        {summaries
                          .reduce((sum, s) => sum + s.totalRevenue, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        R${" "}
                        {summaries
                          .reduce((sum, s) => sum + s.totalCommission, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                        R${" "}
                        {summaries
                          .reduce((sum, s) => sum + s.paidCommission, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-yellow-600 dark:text-yellow-400">
                        R${" "}
                        {summaries
                          .reduce((sum, s) => sum + s.pendingCommission, 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>}
          </div>
        )}
      </div>

      {/* Modal: Repasse ao profissional (gera e confirma o repasse no backend) */}
      <Modal
        isOpen={showPayModal}
        onClose={() => { if (!isPaying) setShowPayModal(false); }}
        title="Repasse ao Profissional"
      >
        {payout && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Profissional:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{payout.professionalName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Comissões pendentes:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{payout.commissions.length}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Total a repassar:</span>
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    R$ {payout.commissions.reduce((s, c) => s + c.commissionValue, 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Entram todas as comissões pendentes de {payout.professionalName} geradas entre{" "}
                {new Date(Math.min(...payout.commissions.map((c) => new Date(c.createdAt).getTime()))).toLocaleDateString("pt-BR")} e{" "}
                {new Date(Math.max(...payout.commissions.map((c) => new Date(c.createdAt).getTime()))).toLocaleDateString("pt-BR")}.
                O profissional é avisado e confirma o recebimento na tela de recibos.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Forma de Pagamento
              </label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {FORMAS_REPASSE.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Referência do Pagamento *
              </label>
              <Input
                placeholder="Ex: ID do PIX, nº da transferência ou &quot;pago em dinheiro&quot;"
                value={paymentForm.paymentReference}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    paymentReference: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Observações
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPayModal(false)} disabled={isPaying}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmPay} isLoading={isPaying}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Repasse
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Detalhes da Comissão */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedCommission(null);
          setSelectedProfessional(null);
        }}
        title={
          selectedProfessional
            ? `Detalhes - ${selectedProfessional.professionalName}`
            : "Detalhes da Comissão"
        }
        size="lg"
      >
        {selectedCommission && !selectedProfessional && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                  Informações do Serviço
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Serviço:</span>
                    <span className="font-medium">{selectedCommission.serviceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor:</span>
                    <span className="font-medium">
                      R$ {selectedCommission.servicePrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Data:</span>
                    <span className="font-medium">
                      {new Date(selectedCommission.appointmentDate).toLocaleDateString(
                        "pt-BR"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                  Informações da Comissão
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tipo:</span>
                    <CommissionTypeBadge
                      type={selectedCommission.commissionType}
                      value={selectedCommission.commissionRate}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor:</span>
                    <span className="text-lg font-bold text-primary-600">
                      R$ {selectedCommission.commissionValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <CommissionStatusBadge status={selectedCommission.status} />
                  </div>
                </div>
              </div>
            </div>

            {selectedCommission.paidAt && (
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <h4 className="mb-2 font-medium text-green-800 dark:text-green-300">
                  Informações do Pagamento
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600 dark:text-green-400">
                      Pago em:
                    </span>
                    <span className="font-medium text-green-800 dark:text-green-300">
                      {new Date(selectedCommission.paidAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600 dark:text-green-400">
                      Pago por:
                    </span>
                    <span className="font-medium text-green-800 dark:text-green-300">
                      {selectedCommission.paidByName}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedProfessional && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-500">Serviços</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedProfessional.totalServices}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-500">Faturamento</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  R$ {selectedProfessional.totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-500">Total Comissões</p>
                <p className="text-2xl font-bold text-primary-600">
                  R$ {selectedProfessional.totalCommission.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Comissões por Serviço
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                        Serviço
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                        Qtd
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                        Faturamento
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                        Comissão
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedProfessional.byService.map((service) => (
                      <tr key={service.serviceId}>
                        <td className="px-4 py-2 text-gray-900 dark:text-white">
                          {service.serviceName}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                          {service.count}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                          R$ {service.revenue.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-primary-600">
                          R$ {service.commission.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </SalonLayout>
  );
}
