"use client";

import { useState, useMemo } from "react";
import {
  Star,
  Gift,
  Users,
  TrendingUp,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Award,
  Target,
  Percent,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Scissors,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Medal,
  Trophy,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { DataTable, Column, ActionMenuItem } from "@/components/ui/DataTable";
import type { LoyaltyLevel } from "@/types/salon";
import type {
  LoyaltyProgram,
  ClientLoyaltyProgress,
  Reward,
  LoyaltyMemberSummary,
  LoyaltyStats,
  PointsTransaction,
} from "@/types/salon";

// ===== COMPONENTES AUXILIARES =====

// Badge de Nível
const LevelBadge = ({ level }: { level: LoyaltyLevel }) => {
  const config = {
    bronze: {
      icon: <Medal className="h-3 w-3" />,
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      label: "Bronze",
    },
    silver: {
      icon: <Award className="h-3 w-3" />,
      bg: "bg-gray-200 dark:bg-gray-700",
      text: "text-gray-700 dark:text-gray-300",
      label: "Prata",
    },
    gold: {
      icon: <Crown className="h-3 w-3" />,
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-400",
      label: "Ouro",
    },
  };

  const { icon, bg, text, label } = config[level];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      {icon}
      {label}
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
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "primary" | "success" | "warning" | "info" | "purple";
  subtitle?: string;
}) => {
  const colorClasses = {
    primary: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
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
        {subtitle && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

// Card de Programa de Fidelidade (10 cortes = 1 grátis)
const ProgramCard = ({
  program,
  onEdit,
  onToggle,
}: {
  program: LoyaltyProgram;
  onEdit: () => void;
  onToggle: () => void;
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <Scissors className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {program.name}
            </h3>
            {program.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {program.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              program.isActive ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                program.isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
        <div className="text-center">
          <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
            {program.requiredServices}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Serviços necessários
          </p>
        </div>
        <div className="flex items-center justify-center">
          <ChevronRight className="h-6 w-6 text-gray-400" />
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {program.rewardServices}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Serviço(s) grátis
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {program.trackByService
            ? "Contagem por serviço específico"
            : "Contagem de qualquer serviço"}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            program.isActive
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          {program.isActive ? (
            <>
              <CheckCircle className="h-3 w-3" /> Ativo
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" /> Inativo
            </>
          )}
        </span>
      </div>
    </div>
  );
};

// Card de Conversão de Pontos
const ConversionCard = ({
  pointsPerCurrency,
  currencyPerPoint,
  minPointsToRedeem,
  onEdit,
}: {
  pointsPerCurrency: number;
  currencyPerPoint: number;
  minPointsToRedeem: number;
  onEdit: () => void;
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <Percent className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Conversão de Pontos
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure como os pontos são convertidos em descontos
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ganho de Pontos
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {pointsPerCurrency} pontos por R$ 1,00
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
            <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Conversão para Desconto
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {(1 / currencyPerPoint).toFixed(0)} pontos = R$ 1,00 de desconto
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
          <div>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Mínimo para Resgate
            </p>
            <p className="mt-1 text-xl font-semibold text-amber-800 dark:text-amber-300">
              {minPointsToRedeem} pontos
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Card de Membro
const MemberCard = ({
  member,
  onClick,
}: {
  member: LoyaltyMemberSummary;
  onClick: () => void;
}) => {
  const progressPercent = member.programProgress
    ? (member.programProgress.current / member.programProgress.required) * 100
    : 0;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            {member.clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {member.clientName}
            </h3>
            <LevelBadge level={member.currentLevel} />
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
          <p className="text-lg font-semibold text-violet-600 dark:text-violet-400">
            {member.currentPoints} pts
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Acumulado</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {member.lifetimePoints} pts
          </p>
        </div>
      </div>

      {member.programProgress && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Progresso: {member.programProgress.programName}</span>
            <span>
              {member.programProgress.current}/{member.programProgress.required}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          {member.programProgress.freeServicesAvailable > 0 && (
            <p className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
              {member.programProgress.freeServicesAvailable} serviço(s) grátis
              disponível(eis)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ===== DADOS MOCK =====
const mockPrograms: LoyaltyProgram[] = [
  {
    id: "prog-1",
    name: "10 Cortes = 1 Grátis",
    description: "A cada 10 cortes realizados, ganhe 1 corte grátis",
    requiredServices: 10,
    rewardServices: 1,
    trackByService: true,
    applicableServiceIds: ["service-corte-masc", "service-corte-fem"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockConversion = {
  pointsPerCurrency: 1,
  currencyPerPoint: 0.01,
  minPointsToRedeem: 100,
};

const mockMembers: LoyaltyMemberSummary[] = [
  {
    clientId: "client-1",
    clientName: "Maria Silva",
    currentLevel: "gold",
    nextLevel: undefined,
    currentPoints: 850,
    lifetimePoints: 2500,
    pointsExpiringSoon: 100,
    programProgress: {
      programId: "prog-1",
      programName: "10 Cortes = 1 Grátis",
      current: 8,
      required: 10,
      freeServicesAvailable: 1,
    },
    availableRewards: [],
    redeemedRewards: [],
    memberSince: new Date("2023-01-15"),
  },
  {
    clientId: "client-2",
    clientName: "João Santos",
    currentLevel: "silver",
    nextLevel: "gold",
    pointsToNextLevel: 300,
    currentPoints: 450,
    lifetimePoints: 1200,
    pointsExpiringSoon: 0,
    programProgress: {
      programId: "prog-1",
      programName: "10 Cortes = 1 Grátis",
      current: 5,
      required: 10,
      freeServicesAvailable: 0,
    },
    availableRewards: [],
    redeemedRewards: [],
    memberSince: new Date("2023-06-20"),
  },
  {
    clientId: "client-3",
    clientName: "Ana Costa",
    currentLevel: "bronze",
    nextLevel: "silver",
    pointsToNextLevel: 150,
    currentPoints: 150,
    lifetimePoints: 350,
    pointsExpiringSoon: 50,
    programProgress: {
      programId: "prog-1",
      programName: "10 Cortes = 1 Grátis",
      current: 3,
      required: 10,
      freeServicesAvailable: 0,
    },
    availableRewards: [],
    redeemedRewards: [],
    memberSince: new Date("2024-01-10"),
  },
  {
    clientId: "client-4",
    clientName: "Pedro Oliveira",
    currentLevel: "gold",
    currentPoints: 1200,
    lifetimePoints: 3500,
    pointsExpiringSoon: 200,
    programProgress: {
      programId: "prog-1",
      programName: "10 Cortes = 1 Grátis",
      current: 2,
      required: 10,
      freeServicesAvailable: 2,
    },
    availableRewards: [],
    redeemedRewards: [],
    memberSince: new Date("2022-03-05"),
  },
];

const mockStats: LoyaltyStats = {
  totalMembers: 156,
  membersByLevel: {
    bronze: 80,
    silver: 52,
    gold: 24,
  },
  totalPointsIssued: 45000,
  totalPointsRedeemed: 12500,
  totalRewardsRedeemed: 89,
  pointsExpiringSoon: 3200,
  mostPopularRewards: [
    { rewardId: "reward-1", rewardName: "Corte Grátis", redemptions: 45 },
    { rewardId: "reward-2", rewardName: "10% de Desconto", redemptions: 32 },
  ],
  topMembers: [
    { clientId: "client-1", clientName: "Maria Silva", points: 850, level: "gold" },
    { clientId: "client-4", clientName: "Pedro Oliveira", points: 1200, level: "gold" },
  ],
};

const mockTransactions: PointsTransaction[] = [
  {
    id: "tx-1",
    clientId: "client-1",
    clientName: "Maria Silva",
    type: "earn",
    points: 80,
    balanceAfter: 850,
    description: "Corte Feminino + Escova",
    appointmentId: "app-1",
    unitId: "unit-1",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "tx-2",
    clientId: "client-2",
    clientName: "João Santos",
    type: "redeem",
    points: -100,
    balanceAfter: 450,
    description: "Resgate: 10% de Desconto",
    rewardId: "reward-2",
    rewardName: "10% de Desconto",
    unitId: "unit-1",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "tx-3",
    clientId: "client-3",
    clientName: "Ana Costa",
    type: "bonus",
    points: 50,
    balanceAfter: 150,
    description: "Bônus de Aniversário",
    unitId: "unit-1",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
];

// ===== COMPONENTE PRINCIPAL =====
export default function LoyaltyPage() {
  // ===== ESTADOS =====
  const [activeTab, setActiveTab] = useState<
    "overview" | "programs" | "members" | "transactions"
  >("overview");

  const [programs, setPrograms] = useState<LoyaltyProgram[]>(mockPrograms);
  const [members] = useState<LoyaltyMemberSummary[]>(mockMembers);
  const [conversion, setConversion] = useState(mockConversion);
  const [transactions] = useState<PointsTransaction[]>(mockTransactions);
  const [stats] = useState<LoyaltyStats>(mockStats);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<LoyaltyLevel | "all">("all");

  // Modais
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<LoyaltyProgram | null>(
    null
  );
  const [selectedMember, setSelectedMember] =
    useState<LoyaltyMemberSummary | null>(null);

  // Formulários
  const [programForm, setProgramForm] = useState({
    name: "",
    description: "",
    requiredServices: 10,
    rewardServices: 1,
    trackByService: true,
  });

  const [conversionForm, setConversionForm] = useState({
    pointsPerCurrency: 1,
    currencyPerPoint: 0.01,
    minPointsToRedeem: 100,
  });

  const [awardForm, setAwardForm] = useState({
    clientId: "",
    points: 0,
    description: "",
    reason: "manual" as "welcome" | "birthday" | "referral" | "manual",
  });

  // ===== FILTROS =====
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!member.clientName.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (levelFilter !== "all" && member.currentLevel !== levelFilter) {
        return false;
      }
      return true;
    });
  }, [members, searchTerm, levelFilter]);

  // ===== HANDLERS =====
  const handleEditProgram = (program: LoyaltyProgram) => {
    setSelectedProgram(program);
    setProgramForm({
      name: program.name,
      description: program.description || "",
      requiredServices: program.requiredServices,
      rewardServices: program.rewardServices,
      trackByService: program.trackByService,
    });
    setShowProgramModal(true);
  };

  const handleToggleProgram = (program: LoyaltyProgram) => {
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === program.id ? { ...p, isActive: !p.isActive } : p
      )
    );
  };

  const handleSaveProgram = () => {
    if (selectedProgram) {
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === selectedProgram.id
            ? { ...p, ...programForm, updatedAt: new Date() }
            : p
        )
      );
    } else {
      const newProgram: LoyaltyProgram = {
        id: `prog-${Date.now()}`,
        ...programForm,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setPrograms((prev) => [...prev, newProgram]);
    }
    setShowProgramModal(false);
    setSelectedProgram(null);
    setProgramForm({
      name: "",
      description: "",
      requiredServices: 10,
      rewardServices: 1,
      trackByService: true,
    });
  };

  const handleSaveConversion = () => {
    setConversion(conversionForm);
    setShowConversionModal(false);
  };

  const handleViewMember = (member: LoyaltyMemberSummary) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  const handleAwardPoints = () => {
    // Em produção: chamar loyaltyService.transactions.awardBonus
    console.log("Award points:", awardForm);
    setShowAwardModal(false);
    setAwardForm({
      clientId: "",
      points: 0,
      description: "",
      reason: "manual",
    });
  };

  // ===== COLUNAS DAS TABELAS =====
  const transactionColumns: Column<PointsTransaction>[] = [
    {
      key: "client",
      header: "Cliente",
      render: (tx) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {tx.clientName}
        </span>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (tx) => {
        const config = {
          earn: {
            label: "Ganho",
            bg: "bg-green-100 dark:bg-green-900/30",
            text: "text-green-700 dark:text-green-400",
          },
          redeem: {
            label: "Resgate",
            bg: "bg-blue-100 dark:bg-blue-900/30",
            text: "text-blue-700 dark:text-blue-400",
          },
          expire: {
            label: "Expirado",
            bg: "bg-red-100 dark:bg-red-900/30",
            text: "text-red-700 dark:text-red-400",
          },
          adjust: {
            label: "Ajuste",
            bg: "bg-yellow-100 dark:bg-yellow-900/30",
            text: "text-yellow-700 dark:text-yellow-400",
          },
          bonus: {
            label: "Bônus",
            bg: "bg-purple-100 dark:bg-purple-900/30",
            text: "text-purple-700 dark:text-purple-400",
          },
        };
        const c = config[tx.type];
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
          >
            {c.label}
          </span>
        );
      },
    },
    {
      key: "points",
      header: "Pontos",
      render: (tx) => (
        <span
          className={`font-semibold ${
            tx.points > 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {tx.points > 0 ? "+" : ""}
          {tx.points}
        </span>
      ),
    },
    {
      key: "description",
      header: "Descrição",
      render: (tx) => (
        <span className="text-gray-600 dark:text-gray-400">
          {tx.description}
        </span>
      ),
    },
    {
      key: "date",
      header: "Data",
      render: (tx) => (
        <span className="text-gray-500 dark:text-gray-400">
          {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
  ];

  // ===== RENDER =====
  return (
    <SalonLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Programa de Fidelidade
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Gerencie regras, pontos e recompensas dos clientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAwardForm({
                  clientId: "",
                  points: 0,
                  description: "",
                  reason: "manual",
                });
                setShowAwardModal(true);
              }}
            >
              <Gift className="mr-2 h-4 w-4" />
              Bonificar Pontos
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Membros"
            value={stats.totalMembers.toString()}
            icon={Users}
            color="primary"
            trend="up"
            trendValue="12%"
          />
          <StatsCard
            title="Pontos Emitidos"
            value={stats.totalPointsIssued.toLocaleString("pt-BR")}
            icon={Star}
            color="info"
          />
          <StatsCard
            title="Pontos Resgatados"
            value={stats.totalPointsRedeemed.toLocaleString("pt-BR")}
            icon={Gift}
            color="success"
          />
          <StatsCard
            title="Expirando em 30 dias"
            value={stats.pointsExpiringSoon.toLocaleString("pt-BR")}
            icon={AlertCircle}
            color="warning"
            subtitle="pontos"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "overview", label: "Visão Geral", icon: Star },
              { id: "programs", label: "Programas", icon: Target },
              { id: "members", label: "Membros", icon: Users },
              { id: "transactions", label: "Movimentações", icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-violet-500 text-violet-600 dark:text-violet-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab: Visão Geral */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Programa Principal */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Regra Automática: 10 Cortes = 1 Grátis
              </h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {programs.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onEdit={() => handleEditProgram(program)}
                    onToggle={() => handleToggleProgram(program)}
                  />
                ))}
                {programs.length === 0 && (
                  <div className="col-span-2 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                    <Scissors className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                      Nenhum programa configurado
                    </h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      Configure a regra de fidelidade para seus clientes
                    </p>
                    <Button
                      variant="primary"
                      className="mt-4"
                      onClick={() => {
                        setSelectedProgram(null);
                        setProgramForm({
                          name: "10 Cortes = 1 Grátis",
                          description:
                            "A cada 10 cortes realizados, ganhe 1 corte grátis",
                          requiredServices: 10,
                          rewardServices: 1,
                          trackByService: true,
                        });
                        setShowProgramModal(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Programa
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Conversão de Pontos */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Conversão de Pontos em Desconto
              </h2>
              <ConversionCard
                {...conversion}
                onEdit={() => {
                  setConversionForm(conversion);
                  setShowConversionModal(true);
                }}
              />
            </div>

            {/* Membros por Nível */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Distribuição de Membros
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Medal className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        Bronze
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {stats.membersByLevel.bronze}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 w-full rounded-full bg-amber-200 dark:bg-amber-900/50">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{
                          width: `${
                            (stats.membersByLevel.bronze / stats.totalMembers) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-300 bg-gray-100 p-4 dark:border-gray-600 dark:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        Prata
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {stats.membersByLevel.silver}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 w-full rounded-full bg-gray-300 dark:bg-gray-600">
                      <div
                        className="h-full rounded-full bg-gray-500"
                        style={{
                          width: `${
                            (stats.membersByLevel.silver / stats.totalMembers) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-medium text-yellow-800 dark:text-yellow-300">
                        Ouro
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                      {stats.membersByLevel.gold}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 w-full rounded-full bg-yellow-200 dark:bg-yellow-900/50">
                      <div
                        className="h-full rounded-full bg-yellow-500"
                        style={{
                          width: `${
                            (stats.membersByLevel.gold / stats.totalMembers) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Programas */}
        {activeTab === "programs" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedProgram(null);
                  setProgramForm({
                    name: "",
                    description: "",
                    requiredServices: 10,
                    rewardServices: 1,
                    trackByService: true,
                  });
                  setShowProgramModal(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Programa
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onEdit={() => handleEditProgram(program)}
                  onToggle={() => handleToggleProgram(program)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab: Membros */}
        {activeTab === "members" && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar membro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(e.target.value as LoyaltyLevel | "all")
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todos os níveis</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Prata</option>
                <option value="gold">Ouro</option>
              </select>
            </div>

            {/* Grid de Membros */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <MemberCard
                  key={member.clientId}
                  member={member}
                  onClick={() => handleViewMember(member)}
                />
              ))}
            </div>

            {filteredMembers.length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">
                  Nenhum membro encontrado
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Movimentações */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <DataTable
              data={transactions}
              columns={transactionColumns}
              keyExtractor={(item) => item.id}
              emptyMessage="Nenhuma movimentação encontrada"
            />
          </div>
        )}
      </div>

      {/* Modal: Programa de Fidelidade */}
      <Modal
        isOpen={showProgramModal}
        onClose={() => setShowProgramModal(false)}
        title={selectedProgram ? "Editar Programa" : "Novo Programa"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome do Programa *
            </label>
            <Input
              value={programForm.name}
              onChange={(e) =>
                setProgramForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ex: 10 Cortes = 1 Grátis"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <textarea
              value={programForm.description}
              onChange={(e) =>
                setProgramForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Descrição do programa..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Serviços Necessários *
              </label>
              <Input
                type="number"
                min="1"
                value={programForm.requiredServices}
                onChange={(e) =>
                  setProgramForm((prev) => ({
                    ...prev,
                    requiredServices: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Serviços Grátis *
              </label>
              <Input
                type="number"
                min="1"
                value={programForm.rewardServices}
                onChange={(e) =>
                  setProgramForm((prev) => ({
                    ...prev,
                    rewardServices: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="trackByService"
              checked={programForm.trackByService}
              onChange={(e) =>
                setProgramForm((prev) => ({
                  ...prev,
                  trackByService: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <label
              htmlFor="trackByService"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Contar apenas serviços específicos (ex: apenas cortes)
            </label>
          </div>

          <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
            <p className="text-sm text-violet-800 dark:text-violet-300">
              <strong>Resultado:</strong> A cada{" "}
              <span className="font-bold">{programForm.requiredServices}</span>{" "}
              serviço(s), o cliente ganha{" "}
              <span className="font-bold">{programForm.rewardServices}</span>{" "}
              serviço(s) grátis.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowProgramModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveProgram}
              disabled={!programForm.name}
            >
              {selectedProgram ? "Salvar Alterações" : "Criar Programa"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Conversão de Pontos */}
      <Modal
        isOpen={showConversionModal}
        onClose={() => setShowConversionModal(false)}
        title="Configurar Conversão de Pontos"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pontos ganhos por R$ 1,00 gasto
            </label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={conversionForm.pointsPerCurrency}
              onChange={(e) =>
                setConversionForm((prev) => ({
                  ...prev,
                  pointsPerCurrency: parseFloat(e.target.value) || 1,
                }))
              }
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Exemplo: 1 ponto = cliente ganha 1 ponto a cada R$ 1,00
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pontos necessários para R$ 1,00 de desconto
            </label>
            <Input
              type="number"
              min="1"
              value={Math.round(1 / conversionForm.currencyPerPoint)}
              onChange={(e) =>
                setConversionForm((prev) => ({
                  ...prev,
                  currencyPerPoint: 1 / (parseInt(e.target.value) || 100),
                }))
              }
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Exemplo: 100 pontos = cliente troca 100 pontos por R$ 1,00 de
              desconto
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mínimo de pontos para resgate
            </label>
            <Input
              type="number"
              min="1"
              value={conversionForm.minPointsToRedeem}
              onChange={(e) =>
                setConversionForm((prev) => ({
                  ...prev,
                  minPointsToRedeem: parseInt(e.target.value) || 100,
                }))
              }
            />
          </div>

          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <h4 className="mb-2 font-medium text-green-800 dark:text-green-300">
              Resumo da Configuração
            </h4>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-400">
              <li>
                Cliente ganha{" "}
                <strong>{conversionForm.pointsPerCurrency} ponto(s)</strong> a
                cada R$ 1,00 gasto
              </li>
              <li>
                Cliente pode trocar{" "}
                <strong>
                  {Math.round(1 / conversionForm.currencyPerPoint)} pontos
                </strong>{" "}
                por R$ 1,00 de desconto
              </li>
              <li>
                Mínimo de{" "}
                <strong>{conversionForm.minPointsToRedeem} pontos</strong> para
                resgate
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConversionModal(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveConversion}>
              Salvar Configuração
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Detalhes do Membro */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title={selectedMember ? `${selectedMember.clientName}` : "Membro"}
        size="lg"
      >
        {selectedMember && (
          <div className="space-y-6">
            {/* Header do Membro */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-2xl font-bold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                {selectedMember.clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedMember.clientName}
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <LevelBadge level={selectedMember.currentLevel} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Membro desde{" "}
                    {new Date(selectedMember.memberSince).toLocaleDateString(
                      "pt-BR"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Estatísticas do Membro */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
                <p className="text-sm text-violet-600 dark:text-violet-400">
                  Saldo Atual
                </p>
                <p className="text-2xl font-bold text-violet-800 dark:text-violet-300">
                  {selectedMember.currentPoints} pts
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Acumulado
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedMember.lifetimePoints} pts
                </p>
              </div>
              {selectedMember.pointsExpiringSoon > 0 && (
                <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Expirando em 30 dias
                  </p>
                  <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                    {selectedMember.pointsExpiringSoon} pts
                  </p>
                </div>
              )}
            </div>

            {/* Progresso do Programa */}
            {selectedMember.programProgress && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
                  {selectedMember.programProgress.programName}
                </h4>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Progresso</span>
                  <span>
                    {selectedMember.programProgress.current}/
                    {selectedMember.programProgress.required}
                  </span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full bg-violet-500 transition-all"
                    style={{
                      width: `${Math.min(
                        (selectedMember.programProgress.current /
                          selectedMember.programProgress.required) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                {selectedMember.programProgress.freeServicesAvailable > 0 && (
                  <div className="mt-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-800 dark:text-green-300">
                        {selectedMember.programProgress.freeServicesAvailable}{" "}
                        serviço(s) grátis disponível(eis)!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Próximo Nível */}
            {selectedMember.nextLevel && selectedMember.pointsToNextLevel && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                  Próximo Nível
                </h4>
                <div className="flex items-center justify-between">
                  <LevelBadge level={selectedMember.nextLevel} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Faltam{" "}
                    <strong>{selectedMember.pointsToNextLevel} pontos</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMemberModal(false)}
              >
                Fechar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setAwardForm({
                    clientId: selectedMember.clientId,
                    points: 0,
                    description: "",
                    reason: "manual",
                  });
                  setShowMemberModal(false);
                  setShowAwardModal(true);
                }}
              >
                <Gift className="mr-2 h-4 w-4" />
                Bonificar Pontos
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Bonificar Pontos */}
      <Modal
        isOpen={showAwardModal}
        onClose={() => setShowAwardModal(false)}
        title="Bonificar Pontos"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cliente *
            </label>
            <select
              value={awardForm.clientId}
              onChange={(e) =>
                setAwardForm((prev) => ({ ...prev, clientId: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Selecione um cliente...</option>
              {members.map((member) => (
                <option key={member.clientId} value={member.clientId}>
                  {member.clientName} ({member.currentPoints} pts)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantidade de Pontos *
            </label>
            <Input
              type="number"
              min="1"
              value={awardForm.points}
              onChange={(e) =>
                setAwardForm((prev) => ({
                  ...prev,
                  points: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Motivo
            </label>
            <select
              value={awardForm.reason}
              onChange={(e) =>
                setAwardForm((prev) => ({
                  ...prev,
                  reason: e.target.value as typeof awardForm.reason,
                }))
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="manual">Bonificação Manual</option>
              <option value="welcome">Bônus de Boas-vindas</option>
              <option value="birthday">Bônus de Aniversário</option>
              <option value="referral">Indicação de Cliente</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <textarea
              value={awardForm.description}
              onChange={(e) =>
                setAwardForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Motivo da bonificação..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAwardModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAwardPoints}
              disabled={!awardForm.clientId || awardForm.points <= 0}
            >
              <Gift className="mr-2 h-4 w-4" />
              Bonificar {awardForm.points} Pontos
            </Button>
          </div>
        </div>
      </Modal>
    </SalonLayout>
  );
}
