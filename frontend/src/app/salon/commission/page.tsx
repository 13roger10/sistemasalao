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
import { commissionService } from "@/services/salon";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
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

// ===== DADOS MOCK =====
const mockProfessionals = [
  {
    id: "1",
    name: "Maria Silva",
    avatar: "",
    commissionType: "percentage" as CommissionType,
    commissionValue: 40,
  },
  {
    id: "2",
    name: "João Santos",
    avatar: "",
    commissionType: "percentage" as CommissionType,
    commissionValue: 35,
  },
  {
    id: "3",
    name: "Ana Costa",
    avatar: "",
    commissionType: "fixed" as CommissionType,
    commissionValue: 50,
  },
];

const mockServices = [
  { id: "1", name: "Corte Feminino", price: 80 },
  { id: "2", name: "Coloração", price: 200 },
  { id: "3", name: "Manicure", price: 50 },
  { id: "4", name: "Escova Progressiva", price: 350 },
];

const generateMockCommissions = (): Commission[] => {
  const commissions: Commission[] = [];
  const statuses: CommissionStatus[] = ["pending", "paid", "paid", "pending", "paid"];

  for (let i = 1; i <= 25; i++) {
    const professional = mockProfessionals[Math.floor(Math.random() * mockProfessionals.length)];
    const service = mockServices[Math.floor(Math.random() * mockServices.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const commissionValue =
      professional.commissionType === "percentage"
        ? (service.price * professional.commissionValue) / 100
        : professional.commissionValue;

    commissions.push({
      id: `comm-${i}`,
      professionalId: professional.id,
      professionalName: professional.name,
      appointmentId: `app-${i}`,
      serviceId: service.id,
      serviceName: service.name,
      clientId: `client-${i}`,
      clientName: `Cliente ${i}`,
      servicePrice: service.price,
      commissionType: professional.commissionType,
      commissionRate: professional.commissionValue,
      commissionValue,
      status,
      appointmentDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      unitId: "unit-1",
      paidAt: status === "paid" ? new Date(Date.now() - (daysAgo - 2) * 24 * 60 * 60 * 1000) : undefined,
      paidById: status === "paid" ? "admin-1" : undefined,
      paidByName: status === "paid" ? "Administrador" : undefined,
      createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    });
  }

  return commissions.sort(
    (a, b) => b.appointmentDate.getTime() - a.appointmentDate.getTime()
  );
};

const generateMockSummaries = (commissions: Commission[]): ProfessionalCommissionSummary[] => {
  const summaryMap = new Map<string, ProfessionalCommissionSummary>();

  commissions.forEach((commission) => {
    if (!summaryMap.has(commission.professionalId)) {
      const professional = mockProfessionals.find(
        (p) => p.id === commission.professionalId
      );
      summaryMap.set(commission.professionalId, {
        professionalId: commission.professionalId,
        professionalName: commission.professionalName,
        avatar: professional?.avatar,
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

    // Atualizar breakdown por serviço
    const serviceIndex = summary.byService.findIndex(
      (s) => s.serviceId === commission.serviceId
    );
    if (serviceIndex >= 0) {
      summary.byService[serviceIndex].count += 1;
      summary.byService[serviceIndex].revenue += commission.servicePrice;
      summary.byService[serviceIndex].commission += commission.commissionValue;
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

const mockCommissionRules: CommissionRule[] = [
  {
    id: "rule-1",
    name: "Comissão Padrão",
    description: "Comissão padrão para todos os serviços",
    type: "global",
    commissionType: "percentage",
    commissionValue: 40,
    priority: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "rule-2",
    name: "Coloração Premium",
    description: "Comissão especial para serviços de coloração acima de R$ 150",
    type: "category",
    targetId: "cat-coloracao",
    commissionType: "percentage",
    commissionValue: 45,
    minServicePrice: 150,
    priority: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "rule-3",
    name: "Bônus Maria Silva",
    description: "Bônus fixo por atendimento para Maria Silva",
    type: "professional",
    targetId: "1",
    commissionType: "fixed",
    commissionValue: 10,
    priority: 3,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// ===== COMPONENTE PRINCIPAL =====
export default function CommissionPage() {
  const { user } = useSalonAuth();

  // ===== ESTADOS =====
  const [activeTab, setActiveTab] = useState<"commissions" | "summary" | "rules" | "report">("commissions");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summaries, setSummaries] = useState<ProfessionalCommissionSummary[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | "all">("all");
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const [showFilters, setShowFilters] = useState(false);

  // Modais
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPayMultipleModal, setShowPayMultipleModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalCommissionSummary | null>(null);
  const [selectedRule, setSelectedRule] = useState<CommissionRule | null>(null);

  // Formulário de Regra
  const [ruleForm, setRuleForm] = useState<CommissionRuleCreateInput>({
    name: "",
    description: "",
    type: "global",
    commissionType: "percentage",
    commissionValue: 0,
    priority: 1,
  });

  // Formulário de Pagamento
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "pix",
    paymentReference: "",
    deductions: 0,
    bonuses: 0,
    notes: "",
  });

  // ===== CARREGAR DADOS =====
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Em produção: await commissionService.list(...)
      const mockData = generateMockCommissions();
      setCommissions(mockData);
      setSummaries(generateMockSummaries(mockData));
      setRules(mockCommissionRules);
    } catch (error) {
      console.error("Erro ao carregar comissões:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
  const handlePayCommission = (commission: Commission) => {
    setSelectedCommission(commission);
    setPaymentForm({
      paymentMethod: "pix",
      paymentReference: "",
      deductions: 0,
      bonuses: 0,
      notes: "",
    });
    setShowPayModal(true);
  };

  const handlePayMultiple = () => {
    if (selectedCommissions.length === 0) return;
    setPaymentForm({
      paymentMethod: "pix",
      paymentReference: "",
      deductions: 0,
      bonuses: 0,
      notes: "",
    });
    setShowPayMultipleModal(true);
  };

  const handleConfirmPay = async () => {
    try {
      if (selectedCommission) {
        // Em produção: await commissionService.markAsPaid(selectedCommission.id)
        setCommissions((prev) =>
          prev.map((c) =>
            c.id === selectedCommission.id
              ? {
                  ...c,
                  status: "paid" as CommissionStatus,
                  paidAt: new Date(),
                  paidById: user?.id,
                  paidByName: user?.name,
                }
              : c
          )
        );
      }
      setShowPayModal(false);
      setSelectedCommission(null);
    } catch (error) {
      console.error("Erro ao pagar comissão:", error);
    }
  };

  const handleConfirmPayMultiple = async () => {
    try {
      // Em produção: await commissionService.markMultipleAsPaid(selectedCommissions)
      setCommissions((prev) =>
        prev.map((c) =>
          selectedCommissions.includes(c.id)
            ? {
                ...c,
                status: "paid" as CommissionStatus,
                paidAt: new Date(),
                paidById: user?.id,
                paidByName: user?.name,
              }
            : c
        )
      );
      setSelectedCommissions([]);
      setShowPayMultipleModal(false);
    } catch (error) {
      console.error("Erro ao pagar comissões:", error);
    }
  };

  const handleCancelCommission = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowConfirmCancel(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedCommission) return;
    try {
      // Em produção: await commissionService.cancel(selectedCommission.id)
      setCommissions((prev) =>
        prev.map((c) =>
          c.id === selectedCommission.id
            ? { ...c, status: "canceled" as CommissionStatus }
            : c
        )
      );
      setShowConfirmCancel(false);
      setSelectedCommission(null);
    } catch (error) {
      console.error("Erro ao cancelar comissão:", error);
    }
  };

  const handleSaveRule = async () => {
    try {
      if (selectedRule) {
        // Editar regra existente
        setRules((prev) =>
          prev.map((r) =>
            r.id === selectedRule.id
              ? { ...r, ...ruleForm, updatedAt: new Date() }
              : r
          )
        );
      } else {
        // Criar nova regra
        const newRule: CommissionRule = {
          id: `rule-${Date.now()}`,
          ...ruleForm,
          priority: ruleForm.priority ?? 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setRules((prev) => [...prev, newRule]);
      }
      setShowRuleModal(false);
      setSelectedRule(null);
      setRuleForm({
        name: "",
        description: "",
        type: "global",
        commissionType: "percentage",
        commissionValue: 0,
        priority: 1,
      });
    } catch (error) {
      console.error("Erro ao salvar regra:", error);
    }
  };

  const handleToggleRule = (rule: CommissionRule) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === rule.id ? { ...r, isActive: !r.isActive } : r
      )
    );
  };

  const handleDeleteRule = (rule: CommissionRule) => {
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
  };

  const handleEditRule = (rule: CommissionRule) => {
    setSelectedRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description,
      type: rule.type,
      targetId: rule.targetId,
      commissionType: rule.commissionType,
      commissionValue: rule.commissionValue,
      minServicePrice: rule.minServicePrice,
      maxServicePrice: rule.maxServicePrice,
      validFrom: rule.validFrom,
      validUntil: rule.validUntil,
      priority: rule.priority,
    });
    setShowRuleModal(true);
  };

  const handlePayProfessionalCommissions = (
    summary: ProfessionalCommissionSummary
  ) => {
    setSelectedProfessional(summary);
    const pendingCommissions = commissions.filter(
      (c) =>
        c.professionalId === summary.professionalId && c.status === "pending"
    );
    setSelectedCommissions(pendingCommissions.map((c) => c.id));
    setShowPayMultipleModal(true);
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

    // Converter para CSV
    const headers = Object.keys(exportData[0] || {});
    const csv = [
      headers.join(";"),
      ...exportData.map((row) =>
        headers.map((h) => row[h as keyof typeof row]).join(";")
      ),
    ].join("\n");

    // Download
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comissoes_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ===== COLUNAS DA TABELA =====
  const commissionColumns: Column<Commission>[] = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={
            selectedCommissions.length > 0 &&
            selectedCommissions.length ===
              filteredCommissions.filter((c) => c.status === "pending").length
          }
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCommissions(
                filteredCommissions
                  .filter((c) => c.status === "pending")
                  .map((c) => c.id)
              );
            } else {
              setSelectedCommissions([]);
            }
          }}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
      width: "40px",
      render: (commission) =>
        commission.status === "pending" ? (
          <input
            type="checkbox"
            checked={selectedCommissions.includes(commission.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedCommissions((prev) => [...prev, commission.id]);
              } else {
                setSelectedCommissions((prev) =>
                  prev.filter((id) => id !== commission.id)
                );
              }
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
        ) : null,
    },
    {
      key: "professional",
      header: "Profissional",
      render: (commission) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {commission.professionalName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {commission.clientName}
          </p>
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
        <CommissionStatusBadge status={commission.status} />
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
      {commission.status === "pending" && (
        <ActionMenuItem
          onClick={() => handlePayCommission(commission)}
          icon={<CheckCircle className="h-4 w-4" />}
        >
          Pagar
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
      {commission.status === "pending" && (
        <ActionMenuItem
          onClick={() => handleCancelCommission(commission)}
          icon={<XCircle className="h-4 w-4" />}
          variant="danger"
        >
          Cancelar
        </ActionMenuItem>
      )}
    </>
  );

  // ===== COLUNAS DA TABELA DE REGRAS =====
  const ruleColumns: Column<CommissionRule>[] = [
    {
      key: "name",
      header: "Regra",
      render: (rule) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {rule.name}
          </p>
          {rule.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {rule.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (rule) => {
        const typeLabels = {
          global: "Global",
          service: "Serviço",
          category: "Categoria",
          professional: "Profissional",
        };
        return (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {typeLabels[rule.type]}
          </span>
        );
      },
    },
    {
      key: "commission",
      header: "Comissão",
      render: (rule) => (
        <CommissionTypeBadge
          type={rule.commissionType}
          value={rule.commissionValue}
        />
      ),
    },
    {
      key: "priority",
      header: "Prioridade",
      render: (rule) => (
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          #{rule.priority}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (rule) => (
        <button
          onClick={() => handleToggleRule(rule)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            rule.isActive ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              rule.isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      ),
    },
  ];

  const renderRuleActions = (rule: CommissionRule) => (
    <>
      <ActionMenuItem
        onClick={() => handleEditRule(rule)}
        icon={<Edit2 className="h-4 w-4" />}
      >
        Editar
      </ActionMenuItem>
      <ActionMenuItem
        onClick={() => handleDeleteRule(rule)}
        icon={<Trash2 className="h-4 w-4" />}
        variant="danger"
      >
        Excluir
      </ActionMenuItem>
    </>
  );

  // ===== RENDER =====
  return (
    <SalonLayout requiredRole="ADMIN">
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
              Exportar
            </Button>
            {selectedCommissions.length > 0 && (
              <Button variant="primary" onClick={handlePayMultiple}>
                <Wallet className="mr-2 h-4 w-4" />
                Pagar Selecionados ({selectedCommissions.length})
              </Button>
            )}
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
              { id: "summary", label: "Por Profissional", icon: Users },
              { id: "rules", label: "Regras", icon: Settings },
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
                  placeholder="Buscar por profissional, cliente ou serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                    {mockProfessionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data Início
                  </label>
                  <Input
                    type="date"
                    value={dateRange.startDate.toISOString().split("T")[0]}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        startDate: new Date(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data Fim
                  </label>
                  <Input
                    type="date"
                    value={dateRange.endDate.toISOString().split("T")[0]}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        endDate: new Date(e.target.value),
                      }))
                    }
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
        {activeTab === "summary" && (
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

        {/* Tab: Regras */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedRule(null);
                  setRuleForm({
                    name: "",
                    description: "",
                    type: "global",
                    commissionType: "percentage",
                    commissionValue: 0,
                    priority: 1,
                  });
                  setShowRuleModal(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Regra
              </Button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Regras com maior prioridade são aplicadas primeiro. Se
                  múltiplas regras se aplicam, a de maior prioridade prevalece.
                </p>
              </div>
            </div>

            <DataTable
              data={rules}
              columns={ruleColumns}
              rowActions={renderRuleActions}
              keyExtractor={(item) => item.id}
              emptyMessage="Nenhuma regra cadastrada"
            />
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

            {/* Tabela de Relatório por Profissional */}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
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
            </div>
          </div>
        )}
      </div>

      {/* Modal: Pagar Comissão Individual */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Pagar Comissão"
      >
        {selectedCommission && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Profissional:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedCommission.professionalName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Serviço:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedCommission.serviceName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Valor do Serviço:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    R$ {selectedCommission.servicePrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">
                    Comissão:
                  </span>
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    R$ {selectedCommission.commissionValue.toFixed(2)}
                  </span>
                </div>
              </div>
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
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Referência do Pagamento
              </label>
              <Input
                placeholder="Ex: Comprovante PIX #123"
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
              <Button variant="outline" onClick={() => setShowPayModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmPay}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Pagar Múltiplas Comissões */}
      <Modal
        isOpen={showPayMultipleModal}
        onClose={() => setShowPayMultipleModal(false)}
        title="Pagar Múltiplas Comissões"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Comissões selecionadas:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedCommissions.length}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">
                  Total a Pagar:
                </span>
                <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  R${" "}
                  {commissions
                    .filter((c) => selectedCommissions.includes(c.id))
                    .reduce((sum, c) => sum + c.commissionValue, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Descontos
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.deductions}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    deductions: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bônus
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.bonuses}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    bonuses: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
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
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
              <option value="transfer">Transferência</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Referência do Pagamento
            </label>
            <Input
              placeholder="Ex: Comprovante PIX #123"
              value={paymentForm.paymentReference}
              onChange={(e) =>
                setPaymentForm((prev) => ({
                  ...prev,
                  paymentReference: e.target.value,
                }))
              }
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Subtotal:
                </span>
                <span className="text-gray-900 dark:text-white">
                  R${" "}
                  {commissions
                    .filter((c) => selectedCommissions.includes(c.id))
                    .reduce((sum, c) => sum + c.commissionValue, 0)
                    .toFixed(2)}
                </span>
              </div>
              {paymentForm.deductions > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-500">Descontos:</span>
                  <span className="text-red-500">
                    - R$ {paymentForm.deductions.toFixed(2)}
                  </span>
                </div>
              )}
              {paymentForm.bonuses > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-500">Bônus:</span>
                  <span className="text-green-500">
                    + R$ {paymentForm.bonuses.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <span className="font-medium text-gray-900 dark:text-white">
                  Valor Final:
                </span>
                <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  R${" "}
                  {(
                    commissions
                      .filter((c) => selectedCommissions.includes(c.id))
                      .reduce((sum, c) => sum + c.commissionValue, 0) -
                    paymentForm.deductions +
                    paymentForm.bonuses
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPayMultipleModal(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmPayMultiple}>
              <Wallet className="mr-2 h-4 w-4" />
              Confirmar Pagamento
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Regra de Comissão */}
      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title={selectedRule ? "Editar Regra" : "Nova Regra de Comissão"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome da Regra *
            </label>
            <Input
              value={ruleForm.name}
              onChange={(e) =>
                setRuleForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ex: Comissão Padrão"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <textarea
              value={ruleForm.description || ""}
              onChange={(e) =>
                setRuleForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de Regra
              </label>
              <select
                value={ruleForm.type}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    type: e.target.value as CommissionRule["type"],
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="global">Global</option>
                <option value="service">Por Serviço</option>
                <option value="category">Por Categoria</option>
                <option value="professional">Por Profissional</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prioridade
              </label>
              <Input
                type="number"
                min="1"
                value={ruleForm.priority}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    priority: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de Comissão
              </label>
              <select
                value={ruleForm.commissionType}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    commissionType: e.target.value as CommissionType,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor
              </label>
              <Input
                type="number"
                min="0"
                step={ruleForm.commissionType === "percentage" ? "1" : "0.01"}
                max={ruleForm.commissionType === "percentage" ? "100" : undefined}
                value={ruleForm.commissionValue}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    commissionValue: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor Mínimo do Serviço
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={ruleForm.minServicePrice || ""}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    minServicePrice: parseFloat(e.target.value) || undefined,
                  }))
                }
                placeholder="Sem limite"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor Máximo do Serviço
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={ruleForm.maxServicePrice || ""}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    maxServicePrice: parseFloat(e.target.value) || undefined,
                  }))
                }
                placeholder="Sem limite"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRuleModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveRule}
              disabled={!ruleForm.name || ruleForm.commissionValue <= 0}
            >
              {selectedRule ? "Salvar Alterações" : "Criar Regra"}
            </Button>
          </div>
        </div>
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

      {/* Modal: Confirmar Cancelamento */}
      <ConfirmModal
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={handleConfirmCancel}
        title="Cancelar Comissão"
        message="Tem certeza que deseja cancelar esta comissão? Esta ação não pode ser desfeita."
        confirmText="Cancelar Comissão"
        variant="danger"
      />
    </SalonLayout>
  );
}
