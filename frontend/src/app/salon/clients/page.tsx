"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  History,
  Star,
  Award,
  Gift,
  DollarSign,
  Scissors,
  MessageCircle,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { DataTable, ActionMenuItem, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { clientService } from "@/services/salon/clientService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { useUnit } from "@/contexts/UnitContext";
import type {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  ClientFilters,
  ClientHistory,
  LoyaltyLevel,
} from "@/types/salon";
import type { PaginatedResponse } from "@/types/salon/common";

// Badge de Nível de Fidelidade
const LoyaltyBadge = ({ level }: { level: LoyaltyLevel }) => {
  const config = {
    bronze: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      icon: <Award className="h-3 w-3" />,
      label: "Bronze",
    },
    silver: {
      bg: "bg-gray-200 dark:bg-gray-600",
      text: "text-gray-700 dark:text-gray-200",
      icon: <Award className="h-3 w-3" />,
      label: "Prata",
    },
    gold: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-400",
      icon: <Star className="h-3 w-3" />,
      label: "Ouro",
    },
  };

  const { bg, text, icon, label } = config[level];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
};

// Badge de Status
const StatusBadge = ({ status }: { status: "active" | "inactive" }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "active"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {status === "active" ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
      {status === "active" ? "Ativo" : "Inativo"}
    </span>
  );
};

// Card de Estatísticas
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

// Componente de Progresso de Fidelidade (10 cortes = 1 grátis)
const LoyaltyProgress = ({ current, total = 10 }: { current: number; total?: number }) => {
  const progress = Math.min((current / total) * 100, 100);
  const completed = current >= total;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {completed ? "Corte grátis disponível!" : `${current}/${total} cortes`}
        </span>
        {completed && <Gift className="h-4 w-4 text-green-500" />}
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${
            completed ? "bg-green-500" : "bg-violet-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default function ClientsPage() {
  const { user } = useSalonAuth();
  const { selectedUnitId } = useUnit();

  // Estados de listagem
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [loyaltyFilter, setLoyaltyFilter] = useState<"" | LoyaltyLevel>("");

  // Estados de modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<ClientHistory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState<ClientCreateInput>({
    name: "",
    phone: "",
    email: "",
    whatsapp: "",
    birthDate: undefined,
    notes: "",
    acceptsMarketing: true,
    acceptsWhatsApp: true,
    acceptsEmail: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Carregar clientes
  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ClientFilters = {};
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;
      if (loyaltyFilter) filters.loyaltyLevel = loyaltyFilter;

      const response = await clientService.list({
        page,
        limit: 10,
        salonId: selectedUnitId || "1", // Default to salon 1 if no unit selected
        ...filters,
      });

      setClients(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      // Mock data para desenvolvimento
      setClients([
        {
          id: "1",
          name: "João Silva",
          email: "joao@email.com",
          phone: "(11) 99999-1111",
          whatsapp: "(11) 99999-1111",
          birthDate: new Date("1990-05-15"),
          status: "active",
          loyaltyLevel: "gold",
          loyaltyPoints: 150,
          totalVisits: 25,
          totalSpent: 2500,
          averageTicket: 100,
          acceptsMarketing: true,
          acceptsWhatsApp: true,
          acceptsEmail: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Maria Santos",
          email: "maria@email.com",
          phone: "(11) 99999-2222",
          whatsapp: "(11) 99999-2222",
          birthDate: new Date("1985-08-20"),
          status: "active",
          loyaltyLevel: "silver",
          loyaltyPoints: 80,
          totalVisits: 12,
          totalSpent: 1200,
          averageTicket: 100,
          acceptsMarketing: true,
          acceptsWhatsApp: true,
          acceptsEmail: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          name: "Pedro Costa",
          email: "pedro@email.com",
          phone: "(11) 99999-3333",
          status: "active",
          loyaltyLevel: "bronze",
          loyaltyPoints: 30,
          totalVisits: 5,
          totalSpent: 500,
          averageTicket: 100,
          acceptsMarketing: false,
          acceptsWhatsApp: true,
          acceptsEmail: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as Client[]);
      setTotalPages(1);
      setTotalItems(3);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter, loyaltyFilter, selectedUnitId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Handlers de busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadClients();
  };

  // Handlers de CRUD
  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Incluir salonId no request
      const createData = {
        ...formData,
        salonId: selectedUnitId || "1",
      };
      await clientService.create(createData);
      setIsCreateModalOpen(false);
      resetForm();
      loadClients();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({
        submit: err.response?.data?.message || "Erro ao criar cliente",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedClient || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updateData: ClientUpdateInput = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        whatsapp: formData.whatsapp,
        birthDate: formData.birthDate,
        notes: formData.notes,
        acceptsMarketing: formData.acceptsMarketing,
        acceptsWhatsApp: formData.acceptsWhatsApp,
        acceptsEmail: formData.acceptsEmail,
      };

      await clientService.update(selectedClient.id, updateData);
      setIsEditModalOpen(false);
      resetForm();
      loadClients();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({
        submit: err.response?.data?.message || "Erro ao atualizar cliente",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;

    setIsSubmitting(true);
    try {
      await clientService.delete(selectedClient.id);
      setIsDeleteModalOpen(false);
      setSelectedClient(null);
      loadClients();
    } catch (error) {
      console.error("Erro ao desativar cliente:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Carregar histórico do cliente
  const loadClientHistory = async (client: Client) => {
    setSelectedClient(client);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);

    try {
      const history = await clientService.getHistory(client.id);
      setClientHistory(history);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      // Mock data
      setClientHistory({
        appointments: [
          {
            id: "1",
            date: new Date(),
            services: ["Corte Masculino", "Barba"],
            professional: "Carlos",
            total: 80,
            status: "completed",
          },
          {
            id: "2",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            services: ["Corte Masculino"],
            professional: "Carlos",
            total: 50,
            status: "completed",
          },
        ],
        totalAppointments: 25,
        totalSpent: 2500,
        favoriteServices: [
          { serviceId: "1", serviceName: "Corte Masculino", count: 20 },
          { serviceId: "2", serviceName: "Barba", count: 10 },
        ],
        favoriteProfessional: {
          professionalId: "1",
          professionalName: "Carlos",
          count: 18,
        },
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Validação do formulário
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Nome é obrigatório";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Telefone é obrigatório";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email inválido";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Reset do formulário
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      whatsapp: "",
      birthDate: undefined,
      notes: "",
      acceptsMarketing: true,
      acceptsWhatsApp: true,
      acceptsEmail: true,
    });
    setFormErrors({});
    setSelectedClient(null);
  };

  // Abrir modal de edição
  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || "",
      whatsapp: client.whatsapp || "",
      birthDate: client.birthDate,
      notes: client.notes || "",
      acceptsMarketing: client.acceptsMarketing,
      acceptsWhatsApp: client.acceptsWhatsApp,
      acceptsEmail: client.acceptsEmail,
    });
    setIsEditModalOpen(true);
  };

  // Abrir modal de exclusão
  const openDeleteModal = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteModalOpen(true);
  };

  // Formatar data
  const formatDate = (date: Date | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Colunas da tabela
  const columns: Column<Client>[] = [
    {
      key: "name",
      header: "Cliente",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
            {item.avatar ? (
              <img
                src={item.avatar}
                alt={item.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold">
                {item.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Phone className="h-3 w-3" />
              {item.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (item) => (
        <div className="space-y-1 text-sm">
          {item.email && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Mail className="h-3 w-3" />
              {item.email}
            </div>
          )}
          {item.whatsapp && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <MessageCircle className="h-3 w-3" />
              {item.whatsapp}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "loyalty",
      header: "Fidelidade",
      render: (item) => (
        <div className="space-y-1">
          <LoyaltyBadge level={item.loyaltyLevel} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {item.loyaltyPoints} pontos
          </p>
        </div>
      ),
    },
    {
      key: "visits",
      header: "Visitas",
      render: (item) => (
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white">{item.totalVisits}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">visitas</p>
        </div>
      ),
    },
    {
      key: "spent",
      header: "Total Gasto",
      render: (item) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {formatCurrency(item.totalSpent)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];


  return (
    <SalonLayout requiredRole={["ADMIN", "RECEPCIONIST", "PROFESSIONAL"]} pageTitle="Clientes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie os clientes do salão</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Novo Cliente
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<UserCheck className="h-5 w-5 text-green-500" />}
            label="Total de Clientes"
            value={totalItems}
            color="bg-green-100 dark:bg-green-900/30"
          />
          <StatsCard
            icon={<Star className="h-5 w-5 text-yellow-500" />}
            label="Clientes Ouro"
            value={clients.filter((c) => c.loyaltyLevel === "gold").length}
            color="bg-yellow-100 dark:bg-yellow-900/30"
          />
          <StatsCard
            icon={<Calendar className="h-5 w-5 text-blue-500" />}
            label="Aniversariantes Hoje"
            value={0}
            color="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatsCard
            icon={<DollarSign className="h-5 w-5 text-violet-500" />}
            label="Ticket Médio"
            value={formatCurrency(
              clients.length > 0
                ? clients.reduce((acc, c) => acc + c.averageTicket, 0) / clients.length
                : 0
            )}
            color="bg-violet-100 dark:bg-violet-900/30"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, telefone ou email..."
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
              setStatusFilter(e.target.value as "" | "active" | "inactive");
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

          <select
            value={loyaltyFilter}
            onChange={(e) => {
              setLoyaltyFilter(e.target.value as "" | LoyaltyLevel);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos os níveis</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Prata</option>
            <option value="gold">Ouro</option>
          </select>
        </div>

        {/* Tabela */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <DataTable
            data={clients}
            columns={columns}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="Nenhum cliente encontrado"
            emptyAction={{
              label: "Adicionar cliente",
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
                <ActionMenuItem
                  onClick={() => loadClientHistory(item)}
                  icon={<History className="h-4 w-4" />}
                >
                  Ver Histórico
                </ActionMenuItem>
                <ActionMenuItem
                  onClick={() => openEditModal(item)}
                  icon={<Edit2 className="h-4 w-4" />}
                >
                  Editar
                </ActionMenuItem>
                <ActionMenuItem
                  onClick={() => openDeleteModal(item)}
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

      {/* Modal de Criar Cliente */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Novo Cliente"
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} isLoading={isSubmitting}>
              Criar Cliente
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formErrors.submit && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {formErrors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nome *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              placeholder="Nome completo"
              autoComplete="off"
            />
            <Input
              label="Telefone *"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={formErrors.phone}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="WhatsApp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              placeholder="email@exemplo.com"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Data de Nascimento"
              type="date"
              value={formData.birthDate ? new Date(formData.birthDate).toISOString().split("T")[0] : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  birthDate: e.target.value ? new Date(e.target.value) : undefined,
                })
              }
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Preferências, alergias..."
                rows={1}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preferências de Comunicação
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.acceptsWhatsApp}
                  onChange={(e) => setFormData({ ...formData, acceptsWhatsApp: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">WhatsApp</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.acceptsEmail}
                  onChange={(e) => setFormData({ ...formData, acceptsEmail: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.acceptsMarketing}
                  onChange={(e) => setFormData({ ...formData, acceptsMarketing: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Marketing</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de Editar Cliente */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Editar Cliente"
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdate} isLoading={isSubmitting}>
              Salvar Alterações
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formErrors.submit && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {formErrors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nome *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              placeholder="Nome completo"
              autoComplete="off"
            />
            <Input
              label="Telefone *"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={formErrors.phone}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="WhatsApp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              placeholder="email@exemplo.com"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Data de Nascimento"
              type="date"
              value={formData.birthDate ? new Date(formData.birthDate).toISOString().split("T")[0] : ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  birthDate: e.target.value ? new Date(e.target.value) : undefined,
                })
              }
            />
            {selectedClient && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nível de Fidelidade
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 dark:border-gray-600 dark:bg-gray-700">
                  <LoyaltyBadge level={selectedClient.loyaltyLevel} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({selectedClient.loyaltyPoints} pontos)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Preferências, alergias, observações gerais..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preferências de Comunicação
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.acceptsWhatsApp}
                  onChange={(e) => setFormData({ ...formData, acceptsWhatsApp: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">WhatsApp</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.acceptsEmail}
                  onChange={(e) => setFormData({ ...formData, acceptsEmail: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.acceptsMarketing}
                  onChange={(e) => setFormData({ ...formData, acceptsMarketing: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Marketing</span>
              </label>
            </div>
          </div>

          {selectedClient && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Total de visitas:</strong> {selectedClient.totalVisits}
                {" | "}
                <strong>Total gasto:</strong> {formatCurrency(selectedClient.totalSpent)}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de Histórico */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedClient(null);
          setClientHistory(null);
        }}
        title={`Histórico - ${selectedClient?.name}`}
        size="xl"
      >
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : clientHistory ? (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Visitas</p>
                <p className="text-xl font-bold text-violet-600 dark:text-violet-400">
                  {clientHistory.totalAppointments}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Gasto</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(clientHistory.totalSpent)}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <p className="text-sm text-gray-500 dark:text-gray-400">Serviço Favorito</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {clientHistory.favoriteServices[0]?.serviceName || "-"}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                <p className="text-sm text-gray-500 dark:text-gray-400">Profissional Favorito</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {clientHistory.favoriteProfessional?.professionalName || "-"}
                </p>
              </div>
            </div>

            {/* Progresso Fidelidade */}
            {selectedClient && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                  <Gift className="h-4 w-4 text-violet-500" />
                  Programa de Fidelidade
                </h4>
                <LoyaltyProgress current={selectedClient.totalVisits % 10} />
                <div className="mt-3 grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Nível</p>
                    <LoyaltyBadge level={selectedClient.loyaltyLevel} />
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Pontos</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedClient.loyaltyPoints}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Cortes Grátis</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {Math.floor(selectedClient.totalVisits / 10)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Histórico de Agendamentos */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                <Calendar className="h-4 w-4 text-violet-500" />
                Últimos Agendamentos
              </h4>
              <div className="space-y-2">
                {clientHistory.appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                        <Scissors className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {apt.services.join(", ")}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {apt.professional} • {formatDate(apt.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(apt.total)}
                      </p>
                      <span
                        className={`text-xs ${
                          apt.status === "completed"
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-500"
                        }`}
                      >
                        {apt.status === "completed" ? "Concluído" : apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Serviços Mais Utilizados */}
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                <Star className="h-4 w-4 text-violet-500" />
                Serviços Mais Utilizados
              </h4>
              <div className="space-y-2">
                {clientHistory.favoriteServices.map((service) => (
                  <div
                    key={service.serviceId}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                  >
                    <span className="text-gray-900 dark:text-white">{service.serviceName}</span>
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-sm font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                      {service.count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedClient(null);
        }}
        onConfirm={handleDelete}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir o cliente "${selectedClient?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />
    </SalonLayout>
  );
}
