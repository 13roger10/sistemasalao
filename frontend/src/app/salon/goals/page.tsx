"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Edit2,
  Trash2,
  Award,
  BarChart3,
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { DataTable, ActionMenuItem, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { goalService } from "@/services/salon/goalService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type {
  Goal,
  GoalCreateInput,
  GoalType,
  GoalPeriod,
  GoalDashboard,
  GoalTypeLabels,
  GoalPeriodLabels,
  GoalTypeColors,
} from "@/types/salon/goal";

// Progress Bar Component
const ProgressBar = ({ value, max, color = "violet" }: { value: number; max: number; color?: string }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorMap: Record<string, string> = {
    violet: "bg-violet-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400">{percentage.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${colorMap[color] || colorMap.violet}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Goal Type Badge
const GoalTypeBadge = ({ type }: { type: GoalType }) => {
  const colors: Record<GoalType, { bg: string; text: string }> = {
    FATURAMENTO: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
    ATENDIMENTOS: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
    NOVOS_CLIENTES: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
    TICKET_MEDIO: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
    SERVICOS_TIPO: { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-600 dark:text-pink-400" },
  };
  const labels: Record<GoalType, string> = {
    FATURAMENTO: "Faturamento",
    ATENDIMENTOS: "Atendimentos",
    NOVOS_CLIENTES: "Novos Clientes",
    TICKET_MEDIO: "Ticket Médio",
    SERVICOS_TIPO: "Serviços",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[type].bg} ${colors[type].text}`}>
      {labels[type]}
    </span>
  );
};

// Stats Card
const StatsCard = ({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-3">
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
        {subValue && <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>}
      </div>
    </div>
  </div>
);

// Goal Card for Dashboard
const GoalCard = ({ goal, onClick }: { goal: Goal; onClick: () => void }) => {
  const getProgressColor = () => {
    if (goal.atingida) return "green";
    if (goal.percentualProgresso >= 80) return "blue";
    if (goal.percentualProgresso >= 50) return "amber";
    return "violet";
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "R$") {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    }
    return value.toString();
  };

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{goal.nome}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{goal.periodoDescricao}</p>
        </div>
        <GoalTypeBadge type={goal.tipo} />
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatValue(goal.valorAtual, goal.tipoUnidade)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            / {formatValue(goal.valorMeta, goal.tipoUnidade)}
          </span>
        </div>
        <ProgressBar value={goal.valorAtual} max={goal.valorMeta} color={getProgressColor()} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={`flex items-center gap-1 ${goal.atingida ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
          {goal.atingida ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          {goal.atingida ? "Atingida" : `${goal.percentualProgresso.toFixed(0)}% concluído`}
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
};

export default function GoalsPage() {
  const { user } = useSalonAuth();

  // States
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dashboard, setDashboard] = useState<GoalDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // View state
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<GoalCreateInput>({
    nome: "",
    tipo: "FATURAMENTO",
    periodo: "MENSAL",
    valorMeta: 0,
    dataInicio: new Date().toISOString().split("T")[0],
    dataFim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notificarProgresso: true,
    notificarAoAtingir: 80,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [goalsResponse, dashboardResponse] = await Promise.all([
        goalService.list({ page, limit: 10 }),
        goalService.getDashboard(),
      ]);

      setGoals(goalsResponse.data || goalsResponse.items || []);
      setTotalPages(goalsResponse.meta?.totalPages || 1);
      setTotalItems(goalsResponse.meta?.total || 0);
      setDashboard(dashboardResponse);
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
      // Mock data
      const mockGoals: Goal[] = [
        {
          id: "1",
          nome: "Faturamento Mensal",
          descricao: "Meta de faturamento para o mês",
          tipo: "FATURAMENTO",
          tipoDescricao: "Faturamento",
          tipoUnidade: "R$",
          periodo: "MENSAL",
          periodoDescricao: "Mensal",
          valorMeta: 50000,
          valorAtual: 35000,
          percentualProgresso: 70,
          dataInicio: "2026-03-01",
          dataFim: "2026-03-31",
          salonId: "1",
          criadoPorId: "1",
          criadoPorNome: "Admin",
          notificarProgresso: true,
          notificarAoAtingir: 80,
          atingida: false,
          dentroDoPeriodo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          nome: "Atendimentos Semanais",
          tipo: "ATENDIMENTOS",
          tipoDescricao: "Atendimentos",
          tipoUnidade: "un",
          periodo: "SEMANAL",
          periodoDescricao: "Semanal",
          valorMeta: 100,
          valorAtual: 95,
          percentualProgresso: 95,
          dataInicio: "2026-03-25",
          dataFim: "2026-03-31",
          salonId: "1",
          criadoPorId: "1",
          criadoPorNome: "Admin",
          notificarProgresso: true,
          notificarAoAtingir: 80,
          atingida: false,
          dentroDoPeriodo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          nome: "Novos Clientes",
          tipo: "NOVOS_CLIENTES",
          tipoDescricao: "Novos Clientes",
          tipoUnidade: "un",
          periodo: "MENSAL",
          periodoDescricao: "Mensal",
          valorMeta: 30,
          valorAtual: 32,
          percentualProgresso: 106.67,
          dataInicio: "2026-03-01",
          dataFim: "2026-03-31",
          salonId: "1",
          criadoPorId: "1",
          criadoPorNome: "Admin",
          notificarProgresso: true,
          notificarAoAtingir: 80,
          atingida: true,
          dentroDoPeriodo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      setGoals(mockGoals);
      setDashboard({
        totalMetas: 3,
        metasAtingidas: 1,
        metasEmAndamento: 2,
        percentualGeralProgresso: 90.56,
        metasAtuais: mockGoals,
        resumoPorTipo: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CRUD handlers
  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await goalService.create(formData);
      setIsCreateModalOpen(false);
      resetForm();
      loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({ submit: err.response?.data?.message || "Erro ao criar meta" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedGoal || !validateForm()) return;

    setIsSubmitting(true);
    try {
      await goalService.update(selectedGoal.id, formData);
      setIsEditModalOpen(false);
      resetForm();
      loadData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({ submit: err.response?.data?.message || "Erro ao atualizar meta" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;

    setIsSubmitting(true);
    try {
      await goalService.delete(selectedGoal.id);
      setIsDeleteModalOpen(false);
      setSelectedGoal(null);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir meta:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.nome.trim()) errors.nome = "Nome é obrigatório";
    if (formData.valorMeta <= 0) errors.valorMeta = "Valor deve ser maior que zero";
    if (!formData.dataInicio) errors.dataInicio = "Data de início é obrigatória";
    if (!formData.dataFim) errors.dataFim = "Data de fim é obrigatória";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      nome: "",
      tipo: "FATURAMENTO",
      periodo: "MENSAL",
      valorMeta: 0,
      dataInicio: new Date().toISOString().split("T")[0],
      dataFim: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notificarProgresso: true,
      notificarAoAtingir: 80,
    });
    setFormErrors({});
    setSelectedGoal(null);
  };

  // Open edit modal
  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormData({
      nome: goal.nome,
      descricao: goal.descricao,
      tipo: goal.tipo,
      periodo: goal.periodo,
      valorMeta: goal.valorMeta,
      dataInicio: goal.dataInicio,
      dataFim: goal.dataFim,
      profissionalId: goal.profissionalId,
      notificarProgresso: goal.notificarProgresso,
      notificarAoAtingir: goal.notificarAoAtingir,
    });
    setIsEditModalOpen(true);
  };

  // Table columns
  const columns: Column<Goal>[] = [
    {
      key: "nome",
      header: "Meta",
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{item.nome}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{item.periodoDescricao}</p>
        </div>
      ),
    },
    { key: "tipo", header: "Tipo", render: (item) => <GoalTypeBadge type={item.tipo} /> },
    {
      key: "progresso",
      header: "Progresso",
      render: (item) => (
        <div className="w-32">
          <ProgressBar value={item.valorAtual} max={item.valorMeta} />
        </div>
      ),
    },
    {
      key: "valores",
      header: "Valores",
      render: (item) => (
        <div className="text-sm">
          <span className="font-medium text-gray-900 dark:text-white">
            {item.tipoUnidade === "R$" ? formatCurrency(item.valorAtual) : item.valorAtual}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {" "}/ {item.tipoUnidade === "R$" ? formatCurrency(item.valorMeta) : item.valorMeta}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          item.atingida
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        }`}>
          {item.atingida ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {item.atingida ? "Atingida" : "Em Andamento"}
        </span>
      ),
    },
  ];

  return (
    <SalonLayout requiredRole={["ADMIN"]} pageTitle="Metas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metas</h1>
            <p className="text-gray-500 dark:text-gray-400">Acompanhe o progresso das metas do salão</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "cards" ? "primary" : "secondary"}
              onClick={() => setViewMode("cards")}
              size="sm"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Nova Meta
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {dashboard && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              icon={<Target className="h-5 w-5 text-violet-500" />}
              label="Total de Metas"
              value={dashboard.totalMetas}
              color="bg-violet-100 dark:bg-violet-900/30"
            />
            <StatsCard
              icon={<Award className="h-5 w-5 text-green-500" />}
              label="Metas Atingidas"
              value={dashboard.metasAtingidas}
              color="bg-green-100 dark:bg-green-900/30"
            />
            <StatsCard
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
              label="Em Andamento"
              value={dashboard.metasEmAndamento}
              color="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatsCard
              icon={<BarChart3 className="h-5 w-5 text-amber-500" />}
              label="Progresso Geral"
              value={`${dashboard.percentualGeralProgresso.toFixed(0)}%`}
              color="bg-amber-100 dark:bg-amber-900/30"
            />
          </div>
        )}

        {/* Content */}
        {viewMode === "cards" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onClick={() => openEditModal(goal)} />
            ))}
            {goals.length === 0 && !isLoading && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-gray-700 dark:bg-gray-800/50">
                <Target className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma meta cadastrada</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Crie sua primeira meta para acompanhar o progresso</p>
                <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                  Criar Meta
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <DataTable
              data={goals}
              columns={columns}
              keyExtractor={(item) => item.id}
              isLoading={isLoading}
              emptyMessage="Nenhuma meta encontrada"
              emptyAction={{ label: "Criar meta", onClick: () => setIsCreateModalOpen(true) }}
              pagination={{ currentPage: page, totalPages, totalItems, itemsPerPage: 10, onPageChange: setPage }}
              rowActions={(item) => (
                <>
                  <ActionMenuItem onClick={() => openEditModal(item)} icon={<Edit2 className="h-4 w-4" />}>
                    Editar
                  </ActionMenuItem>
                  <ActionMenuItem
                    onClick={() => { setSelectedGoal(item); setIsDeleteModalOpen(true); }}
                    icon={<Trash2 className="h-4 w-4" />}
                    variant="danger"
                  >
                    Excluir
                  </ActionMenuItem>
                </>
              )}
              striped
            />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
        title={isEditModalOpen ? "Editar Meta" : "Nova Meta"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={isEditModalOpen ? handleUpdate : handleCreate} isLoading={isSubmitting}>
              {isEditModalOpen ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        {formErrors.submit && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {formErrors.submit}
          </div>
        )}
        <div className="space-y-4">
          <Input
            label="Nome da Meta *"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            error={formErrors.nome}
            placeholder="Ex: Faturamento Mensal"
            leftIcon={<Target className="h-4 w-4" />}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo *</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as GoalType })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="FATURAMENTO">Faturamento</option>
                <option value="ATENDIMENTOS">Atendimentos</option>
                <option value="NOVOS_CLIENTES">Novos Clientes</option>
                <option value="TICKET_MEDIO">Ticket Médio</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Período *</label>
              <select
                value={formData.periodo}
                onChange={(e) => setFormData({ ...formData, periodo: e.target.value as GoalPeriod })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="DIARIO">Diário</option>
                <option value="SEMANAL">Semanal</option>
                <option value="MENSAL">Mensal</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
          </div>

          <Input
            type="number"
            label="Valor da Meta *"
            value={formData.valorMeta || ""}
            onChange={(e) => setFormData({ ...formData, valorMeta: parseFloat(e.target.value) || 0 })}
            error={formErrors.valorMeta}
            placeholder="0"
            leftIcon={<DollarSign className="h-4 w-4" />}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="date"
              label="Data de Início *"
              value={formData.dataInicio}
              onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
              error={formErrors.dataInicio}
              leftIcon={<Calendar className="h-4 w-4" />}
            />
            <Input
              type="date"
              label="Data de Fim *"
              value={formData.dataFim}
              onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
              error={formErrors.dataFim}
              leftIcon={<Calendar className="h-4 w-4" />}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea
              value={formData.descricao || ""}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição da meta..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.notificarProgresso}
              onChange={(e) => setFormData({ ...formData, notificarProgresso: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Notificar sobre progresso</span>
          </label>
        </div>
      </Modal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedGoal(null); }}
        onConfirm={handleDelete}
        title="Excluir Meta"
        message={`Tem certeza que deseja excluir a meta "${selectedGoal?.nome}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />
    </SalonLayout>
  );
}
