"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Filter,
  Play,
  XCircle,
  RefreshCw,
  ListTodo,
  ClipboardList,
  MapPin,
  Tag,
  Repeat,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { DataTable, ActionMenuItem, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { taskService } from "@/services/salon/taskService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type {
  Task,
  TaskCreateInput,
  TaskStatus,
  TaskPriority,
  TaskRecurrence,
  TaskStatusLabels,
  TaskPriorityLabels,
  TaskRecurrenceLabels,
  TaskPriorityColors,
  TaskStatusColors,
} from "@/types/salon/task";

// Status Badge
const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const colors: Record<TaskStatus, { bg: string; text: string }> = {
    PENDENTE: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-300" },
    EM_ANDAMENTO: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
    CONCLUIDA: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
    CANCELADA: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
  };
  const labels: Record<TaskStatus, string> = {
    PENDENTE: "Pendente",
    EM_ANDAMENTO: "Em Andamento",
    CONCLUIDA: "Concluída",
    CANCELADA: "Cancelada",
  };
  const icons: Record<TaskStatus, React.ReactNode> = {
    PENDENTE: <Clock className="h-3 w-3" />,
    EM_ANDAMENTO: <Play className="h-3 w-3" />,
    CONCLUIDA: <CheckCircle className="h-3 w-3" />,
    CANCELADA: <XCircle className="h-3 w-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status].bg} ${colors[status].text}`}>
      {icons[status]}
      {labels[status]}
    </span>
  );
};

// Priority Badge
const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  const colors: Record<TaskPriority, { bg: string; text: string }> = {
    BAIXA: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-300" },
    MEDIA: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
    ALTA: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
    URGENTE: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
  };
  const labels: Record<TaskPriority, string> = {
    BAIXA: "Baixa",
    MEDIA: "Média",
    ALTA: "Alta",
    URGENTE: "Urgente",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[priority].bg} ${colors[priority].text}`}>
      {priority === "URGENTE" && <AlertTriangle className="h-3 w-3" />}
      {labels[priority]}
    </span>
  );
};

// Stats Card
const StatsCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-3">
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

export default function TasksPage() {
  const { user } = useSalonAuth();

  // List states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [categories, setCategories] = useState<string[]>([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<TaskCreateInput>({
    titulo: "",
    descricao: "",
    prioridade: "MEDIA",
    recorrencia: "NENHUMA",
    dataPrevista: new Date().toISOString().split("T")[0],
    tempoEstimadoMinutos: 30,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Stats
  const [stats, setStats] = useState({
    pendentes: 0,
    emAndamento: 0,
    concluidas: 0,
    atrasadas: 0,
  });

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Load tasks
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await taskService.list({
        page,
        limit: 10,
        status: statusFilter || undefined,
        prioridade: priorityFilter || undefined,
        search: searchTerm || undefined,
      });

      setTasks(response.data || response.items || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);

      // Calculate stats
      const allTasks = response.data || response.items || [];
      setStats({
        pendentes: allTasks.filter((t) => t.status === "PENDENTE").length,
        emAndamento: allTasks.filter((t) => t.status === "EM_ANDAMENTO").length,
        concluidas: allTasks.filter((t) => t.status === "CONCLUIDA").length,
        atrasadas: allTasks.filter((t) => t.atrasada).length,
      });
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      // Mock data for development
      const mockTasks: Task[] = [
        {
          id: "1",
          titulo: "Limpar área de espera",
          descricao: "Limpar sofás, mesa de centro e organizar revistas",
          status: "PENDENTE",
          statusDescricao: "Pendente",
          prioridade: "ALTA",
          prioridadeDescricao: "Alta",
          recorrencia: "DIARIA",
          recorrenciaDescricao: "Diária",
          salonId: "1",
          criadoPorId: "1",
          criadoPorNome: "Admin",
          atribuidoAId: "2",
          atribuidoANome: "Maria Santos",
          dataPrevista: new Date().toISOString(),
          horaPrevista: "08:00",
          tempoEstimadoMinutos: 30,
          atrasada: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          titulo: "Organizar estoque de produtos",
          descricao: "Verificar validades e organizar prateleiras",
          status: "EM_ANDAMENTO",
          statusDescricao: "Em Andamento",
          prioridade: "MEDIA",
          prioridadeDescricao: "Média",
          recorrencia: "SEMANAL",
          recorrenciaDescricao: "Semanal",
          salonId: "1",
          criadoPorId: "1",
          criadoPorNome: "Admin",
          atribuidoAId: "2",
          atribuidoANome: "Maria Santos",
          dataPrevista: new Date().toISOString(),
          dataInicio: new Date().toISOString(),
          tempoEstimadoMinutos: 60,
          atrasada: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          titulo: "Higienizar equipamentos",
          descricao: "Esterilizar tesouras, pentes e outros equipamentos",
          status: "PENDENTE",
          statusDescricao: "Pendente",
          prioridade: "URGENTE",
          prioridadeDescricao: "Urgente",
          recorrencia: "DIARIA",
          recorrenciaDescricao: "Diária",
          salonId: "1",
          criadoPorId: "1",
          criadoPorNome: "Admin",
          dataPrevista: new Date(Date.now() - 86400000).toISOString(),
          tempoEstimadoMinutos: 45,
          atrasada: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      setTasks(mockTasks);
      setTotalPages(1);
      setTotalItems(mockTasks.length);
      setStats({
        pendentes: 2,
        emAndamento: 1,
        concluidas: 0,
        atrasadas: 1,
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, priorityFilter, searchTerm]);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const data = await taskService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      setCategories(["Limpeza", "Organização", "Manutenção", "Estoque"]);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadCategories();
  }, [loadTasks, loadCategories]);

  // Search handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTasks();
  };

  // Create task
  const handleCreateTask = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await taskService.create(formData);
      setIsCreateModalOpen(false);
      resetForm();
      loadTasks();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({ submit: err.response?.data?.message || "Erro ao criar tarefa" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update task
  const handleUpdateTask = async () => {
    if (!selectedTask || !validateForm()) return;

    setIsSubmitting(true);
    try {
      await taskService.update(selectedTask.id, formData);
      setIsEditModalOpen(false);
      resetForm();
      loadTasks();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({ submit: err.response?.data?.message || "Erro ao atualizar tarefa" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    setIsSubmitting(true);
    try {
      await taskService.delete(selectedTask.id);
      setIsDeleteModalOpen(false);
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change status
  const handleChangeStatus = async (task: Task, newStatus: TaskStatus) => {
    try {
      await taskService.changeStatus(task.id, { status: newStatus });
      loadTasks();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  // Complete task
  const handleCompleteTask = async (task: Task) => {
    try {
      await taskService.complete(task.id);
      loadTasks();
    } catch (error) {
      console.error("Erro ao concluir tarefa:", error);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.titulo.trim()) {
      errors.titulo = "Título é obrigatório";
    }

    if (!formData.dataPrevista) {
      errors.dataPrevista = "Data prevista é obrigatória";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      titulo: "",
      descricao: "",
      prioridade: "MEDIA",
      recorrencia: "NENHUMA",
      dataPrevista: new Date().toISOString().split("T")[0],
      tempoEstimadoMinutos: 30,
    });
    setFormErrors({});
    setSelectedTask(null);
  };

  // Open edit modal
  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      titulo: task.titulo,
      descricao: task.descricao || "",
      prioridade: task.prioridade,
      recorrencia: task.recorrencia,
      atribuidoAId: task.atribuidoAId,
      dataPrevista: task.dataPrevista.split("T")[0],
      horaPrevista: task.horaPrevista,
      observacoes: task.observacoes,
      categoria: task.categoria,
      local: task.local,
      tempoEstimadoMinutos: task.tempoEstimadoMinutos,
    });
    setIsEditModalOpen(true);
  };

  // Table columns
  const columns: Column<Task>[] = [
    {
      key: "titulo",
      header: "Tarefa",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            item.atrasada ? "bg-red-100 dark:bg-red-900/30" : "bg-violet-100 dark:bg-violet-900/30"
          }`}>
            {item.atrasada ? (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            ) : (
              <ListTodo className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.titulo}</p>
            {item.descricao && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{item.descricao}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "prioridade",
      header: "Prioridade",
      render: (item) => <PriorityBadge priority={item.prioridade} />,
    },
    {
      key: "atribuidoA",
      header: "Responsável",
      render: (item) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">
            {item.atribuidoANome || "Não atribuído"}
          </span>
        </div>
      ),
    },
    {
      key: "dataPrevista",
      header: "Data",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className={`${item.atrasada ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-700 dark:text-gray-300"}`}>
            {formatDate(item.dataPrevista)}
            {item.horaPrevista && ` ${item.horaPrevista}`}
          </span>
        </div>
      ),
    },
    {
      key: "tempoEstimado",
      header: "Tempo",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          <Clock className="h-4 w-4 text-gray-400" />
          {formatDuration(item.tempoEstimadoMinutos)}
        </div>
      ),
    },
  ];

  return (
    <SalonLayout requiredRole={["ADMIN", "RECEPCIONIST"]} pageTitle="Tarefas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tarefas</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie as tarefas do salão</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Nova Tarefa
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<Clock className="h-5 w-5 text-gray-500" />}
            label="Pendentes"
            value={stats.pendentes}
            color="bg-gray-100 dark:bg-gray-700"
          />
          <StatsCard
            icon={<Play className="h-5 w-5 text-blue-500" />}
            label="Em Andamento"
            value={stats.emAndamento}
            color="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatsCard
            icon={<CheckCircle className="h-5 w-5 text-green-500" />}
            label="Concluídas"
            value={stats.concluidas}
            color="bg-green-100 dark:bg-green-900/30"
          />
          <StatsCard
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
            label="Atrasadas"
            value={stats.atrasadas}
            color="bg-red-100 dark:bg-red-900/30"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar tarefa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TaskStatus | "");
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as TaskPriority | "");
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todas as prioridades</option>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <DataTable
            data={tasks}
            columns={columns}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="Nenhuma tarefa encontrada"
            emptyAction={{
              label: "Adicionar tarefa",
              onClick: () => setIsCreateModalOpen(true),
            }}
            pagination={{
              currentPage: page,
              totalPages,
              totalItems,
              itemsPerPage: 10,
              onPageChange: setPage,
            }}
            rowActions={(item) => (
              <>
                {item.status === "PENDENTE" && (
                  <ActionMenuItem
                    onClick={() => handleChangeStatus(item, "EM_ANDAMENTO")}
                    icon={<Play className="h-4 w-4" />}
                  >
                    Iniciar
                  </ActionMenuItem>
                )}
                {item.status === "EM_ANDAMENTO" && (
                  <ActionMenuItem
                    onClick={() => handleCompleteTask(item)}
                    icon={<CheckCircle className="h-4 w-4" />}
                  >
                    Concluir
                  </ActionMenuItem>
                )}
                <ActionMenuItem
                  onClick={() => openEditModal(item)}
                  icon={<Edit2 className="h-4 w-4" />}
                >
                  Editar
                </ActionMenuItem>
                <ActionMenuItem
                  onClick={() => {
                    setSelectedTask(item);
                    setIsDeleteModalOpen(true);
                  }}
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
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={isEditModalOpen ? "Editar Tarefa" : "Nova Tarefa"}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={isEditModalOpen ? handleUpdateTask : handleCreateTask}
              isLoading={isSubmitting}
            >
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
            label="Título *"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            error={formErrors.titulo}
            placeholder="Ex: Limpar área de espera"
            leftIcon={<ClipboardList className="h-4 w-4" />}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Detalhes da tarefa..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prioridade
              </label>
              <select
                value={formData.prioridade}
                onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as TaskPriority })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Recorrência
              </label>
              <select
                value={formData.recorrencia}
                onChange={(e) => setFormData({ ...formData, recorrencia: e.target.value as TaskRecurrence })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="NENHUMA">Sem recorrência</option>
                <option value="DIARIA">Diária</option>
                <option value="SEMANAL">Semanal</option>
                <option value="QUINZENAL">Quinzenal</option>
                <option value="MENSAL">Mensal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="date"
              label="Data Prevista *"
              value={formData.dataPrevista}
              onChange={(e) => setFormData({ ...formData, dataPrevista: e.target.value })}
              error={formErrors.dataPrevista}
              leftIcon={<Calendar className="h-4 w-4" />}
            />

            <Input
              type="time"
              label="Hora Prevista"
              value={formData.horaPrevista || ""}
              onChange={(e) => setFormData({ ...formData, horaPrevista: e.target.value })}
              leftIcon={<Clock className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Categoria"
              value={formData.categoria || ""}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              placeholder="Ex: Limpeza"
              leftIcon={<Tag className="h-4 w-4" />}
            />

            <Input
              label="Local"
              value={formData.local || ""}
              onChange={(e) => setFormData({ ...formData, local: e.target.value })}
              placeholder="Ex: Sala de espera"
              leftIcon={<MapPin className="h-4 w-4" />}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tempo Estimado (minutos)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={formData.tempoEstimadoMinutos}
                onChange={(e) => setFormData({ ...formData, tempoEstimadoMinutos: parseInt(e.target.value) })}
                className="flex-1 accent-violet-500"
              />
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-700">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDuration(formData.tempoEstimadoMinutos || 30)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações
            </label>
            <textarea
              value={formData.observacoes || ""}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTask(null);
        }}
        onConfirm={handleDeleteTask}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${selectedTask?.titulo}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />
    </SalonLayout>
  );
}
