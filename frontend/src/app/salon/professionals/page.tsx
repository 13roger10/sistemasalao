"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Scissors,
  Clock,
  Star,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Check,
  Filter,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { DataTable, ActionMenuItem, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { useUnit } from "@/contexts/UnitContext";
import { professionalService } from "@/services/salon/professionalService";
import { serviceService } from "@/services/salon/serviceService";
import { dashboardService } from "@/services/salon/dashboardService";
import { api } from "@/services/salon/api";
import type { Professional, ProfessionalCreateInput, ProfessionalUpdateInput, Service } from "@/types/salon";

// Tipo para usuário do backend
interface User {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  role: string;
  ativo: boolean;
}

interface UserPageResponse {
  content: User[];
  totalElements: number;
  totalPages: number;
}

interface ProfessionalFormData {
  usuarioId: string;
  specialty: string;
  bio: string;
  acceptsOnlineBooking: boolean;
  serviceIds: string[];
}

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

export default function ProfessionalsPage() {
  const { user } = useSalonAuth();
  const { selectedUnitId } = useUnit();

  // Estados de listagem
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");

  // Estados de modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState<ProfessionalFormData>({
    usuarioId: "",
    specialty: "",
    bio: "",
    acceptsOnlineBooking: true,
    serviceIds: [],
  });

  // Lista de serviços disponíveis
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Lista de usuários disponíveis
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Wizard states
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Filtros avançados
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("");

  // Filtrar usuários pela busca e filtros avançados (em tempo real)
  const filteredUsers = availableUsers.filter(user => {
    // Filtro de busca por texto
    const matchesSearch = !userSearchTerm ||
      user.nome?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.telefone?.includes(userSearchTerm);

    // Filtro por role
    const matchesRole = !roleFilter || user.role === roleFilter;

    // Filtro por status
    const matchesStatus = !userStatusFilter ||
      (userStatusFilter === "active" && user.ativo) ||
      (userStatusFilter === "inactive" && !user.ativo);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Carregar usuários disponíveis
  const loadAvailableUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const response = await api.get<UserPageResponse>("/usuarios", { size: 100 });
      // Filtrar apenas usuários ativos que podem ser profissionais
      const users = response.content?.filter(u => u.ativo) || [];
      setAvailableUsers(users);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      setAvailableUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Carregar serviços disponíveis
  const loadAvailableServices = useCallback(async () => {
    setIsLoadingServices(true);
    try {
      const services = await serviceService.getAll({ salonId: selectedUnitId || "1" });
      // Filtrar apenas serviços ativos
      const activeServices = services.filter(s => s.status === "active");
      setAvailableServices(activeServices);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      setAvailableServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  }, [selectedUnitId]);

  // Carregar profissionais da API
  const loadProfessionals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await professionalService.list({
        page,
        limit: 10,
        salonId: selectedUnitId || "1",
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      });

      setProfessionals(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);

      // Enriquece com faturamento/avaliação reais (vindos de Pagamento/Avaliacao) do mês atual
      try {
        const ranking = await dashboardService.getRankingProfissionais("MENSAL");
        const rankingPorId = new Map(ranking.map((r) => [String(r.profissionalId), r]));
        setProfessionals((current) =>
          current.map((professional) => {
            const dados = rankingPorId.get(String(professional.id));
            if (!dados) return professional;
            return {
              ...professional,
              totalRevenue: dados.faturamento,
              averageRating: dados.avaliacaoMedia > 0 ? dados.avaliacaoMedia : professional.averageRating,
            };
          })
        );
      } catch (rankingError) {
        console.error("Erro ao carregar ranking de faturamento:", rankingError);
      }
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
      setProfessionals([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter, selectedUnitId]);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  // Carregar usuários e serviços quando abrir modal de criação
  useEffect(() => {
    if (isCreateModalOpen) {
      loadAvailableUsers();
      loadAvailableServices();
    }
  }, [isCreateModalOpen, loadAvailableUsers, loadAvailableServices]);

  // Carregar serviços quando abrir modal de edição
  useEffect(() => {
    if (isEditModalOpen) {
      loadAvailableServices();
    }
  }, [isEditModalOpen, loadAvailableServices]);

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadProfessionals();
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const createData: ProfessionalCreateInput = {
        userId: formData.usuarioId,
        specialties: formData.specialty ? [formData.specialty] : [],
        bio: formData.bio,
        acceptsOnlineBooking: formData.acceptsOnlineBooking,
        serviceIds: formData.serviceIds,
      };
      await professionalService.create(createData);
      setIsCreateModalOpen(false);
      resetForm();
      loadProfessionals();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setFormErrors({
        submit: err.message || "Erro ao criar profissional",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProfessional) return;

    setIsSubmitting(true);
    try {
      const updateData: ProfessionalUpdateInput = {
        userId: formData.usuarioId,
        specialties: formData.specialty ? [formData.specialty] : [],
        bio: formData.bio,
        acceptsOnlineBooking: formData.acceptsOnlineBooking,
        serviceIds: formData.serviceIds,
      };
      await professionalService.update(selectedProfessional.id, updateData);
      setIsEditModalOpen(false);
      resetForm();
      loadProfessionals();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setFormErrors({
        submit: err.message || "Erro ao atualizar profissional",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProfessional) return;

    setIsSubmitting(true);
    try {
      await professionalService.delete(selectedProfessional.id);
      setIsDeleteModalOpen(false);
      setSelectedProfessional(null);
      loadProfessionals();
    } catch (error) {
      console.error("Erro ao desativar profissional:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (professional: Professional) => {
    try {
      await professionalService.reactivate(professional.id);
      loadProfessionals();
    } catch (error) {
      console.error("Erro ao reativar profissional:", error);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.usuarioId) {
      errors.usuarioId = "Selecione um usuário";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Funções do Wizard
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setFormData({ ...formData, usuarioId: user.id.toString() });
  };

  const handleNextStep = () => {
    if (selectedUser) {
      setWizardStep(2);
    }
  };

  const handlePrevStep = () => {
    setWizardStep(1);
  };

  // Helper para obter label da role
  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Administrador",
      PROFISSIONAL: "Profissional",
      CLIENTE: "Cliente",
      RECEPCIONIST: "Recepcionista",
    };
    return labels[role] || role;
  };

  // Helper para obter cor da role
  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      PROFISSIONAL: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      CLIENTE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      RECEPCIONIST: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return colors[role] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const resetForm = () => {
    setFormData({
      usuarioId: "",
      specialty: "",
      bio: "",
      acceptsOnlineBooking: true,
      serviceIds: [],
    });
    setFormErrors({});
    setSelectedProfessional(null);
    setUserSearchTerm("");
    setWizardStep(1);
    setSelectedUser(null);
    setRoleFilter("");
    setUserStatusFilter("");
  };

  const openEditModal = (professional: Professional) => {
    setSelectedProfessional(professional);
    setFormData({
      usuarioId: professional.userId?.toString() || "",
      specialty: professional.specialties?.[0] || "",
      bio: professional.bio || "",
      acceptsOnlineBooking: professional.acceptsOnlineBooking ?? true,
      serviceIds: professional.serviceIds || [],
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (professional: Professional) => {
    setSelectedProfessional(professional);
    setIsDeleteModalOpen(true);
  };

  // Colunas da tabela
  const columns: Column<Professional>[] = [
    {
      key: "name",
      header: "Profissional",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
            {item.avatar ? (
              <img
                src={item.avatar}
                alt={item.name || ""}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold">
                {item.name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.name || "Sem nome"}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.email || "-"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "specialty",
      header: "Especialidade",
      render: (item) => (
        <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
          <Scissors className="h-3 w-3" />
          {item.specialties?.join(", ") || "-"}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Telefone",
      render: (item) => (
        <span className="text-gray-700 dark:text-gray-300">{item.phone || "-"}</span>
      ),
    },
    {
      key: "rating",
      header: "Avaliação",
      render: (item) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="font-medium text-gray-900 dark:text-white">{item.averageRating?.toFixed(1) || "0.0"}</span>
        </div>
      ),
    },
    {
      key: "commission",
      header: "Comissão",
      render: (item) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {item.commissionType === "percentage" ? `${item.commissionValue}%` : `R$ ${item.commissionValue}`}
        </span>
      ),
    },
    {
      key: "totalRevenue",
      header: "Faturamento (mês)",
      render: (item) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {(item.totalRevenue || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
    <SalonLayout requiredRole={["ADMIN"]} pageTitle="Profissionais">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profissionais</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie os profissionais do salão</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Search className="h-4 w-4" />}>
            Buscar Profissional
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<UserCheck className="h-5 w-5 text-green-500" />}
            label="Total de Profissionais"
            value={totalItems}
            color="bg-green-100 dark:bg-green-900/30"
          />
          <StatsCard
            icon={<Scissors className="h-5 w-5 text-violet-500" />}
            label="Atendimentos Hoje"
            value={12}
            color="bg-violet-100 dark:bg-violet-900/30"
          />
          <StatsCard
            icon={<Star className="h-5 w-5 text-yellow-500" />}
            label="Avaliação Média"
            value="4.8"
            color="bg-yellow-100 dark:bg-yellow-900/30"
          />
          <StatsCard
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            label="Disponíveis Agora"
            value={professionals.filter((p) => p.status === "active").length}
            color="bg-blue-100 dark:bg-blue-900/30"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome ou email..."
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
        </div>

        {/* Tabela */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <DataTable
            data={professionals}
            columns={columns}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="Nenhum profissional encontrado"
            emptyAction={{
              label: "Buscar profissional",
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
                  onClick={() => openEditModal(item)}
                  icon={<Edit2 className="h-4 w-4" />}
                >
                  Editar
                </ActionMenuItem>
                {item.status === "active" ? (
                  <ActionMenuItem
                    onClick={() => openDeleteModal(item)}
                    icon={<Trash2 className="h-4 w-4" />}
                    variant="danger"
                  >
                    Desativar
                  </ActionMenuItem>
                ) : (
                  <ActionMenuItem
                    onClick={() => handleReactivate(item)}
                    icon={<RefreshCw className="h-4 w-4" />}
                  >
                    Reativar
                  </ActionMenuItem>
                )}
              </>
            )}
            striped
          />
        </div>
      </div>

      {/* Modal de Buscar Profissional - Wizard */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title={wizardStep === 1 ? "Buscar Profissional" : "Configurar Profissional"}
        size="xl"
        footer={
          <>
            {wizardStep === 1 ? (
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
                <Button
                  onClick={handleNextStep}
                  disabled={!selectedUser}
                  rightIcon={<ChevronRight className="h-4 w-4" />}
                >
                  Próximo
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={handlePrevStep}
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                >
                  Voltar
                </Button>
                <Button onClick={handleCreate} isLoading={isSubmitting}>
                  Vincular Profissional
                </Button>
              </>
            )}
          </>
        }
      >
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                wizardStep >= 1 ? "bg-violet-500 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"
              }`}>
                {wizardStep > 1 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span className={`text-sm font-medium ${wizardStep >= 1 ? "text-violet-600 dark:text-violet-400" : "text-gray-500"}`}>
                Selecionar Usuário
              </span>
            </div>
            <div className="mx-4 h-0.5 flex-1 bg-gray-200 dark:bg-gray-700">
              <div className={`h-full transition-all ${wizardStep >= 2 ? "w-full bg-violet-500" : "w-0"}`} />
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                wizardStep >= 2 ? "bg-violet-500 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${wizardStep >= 2 ? "text-violet-600 dark:text-violet-400" : "text-gray-500"}`}>
                Configurar
              </span>
            </div>
          </div>
        </div>

        {formErrors.submit && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {formErrors.submit}
          </div>
        )}

        {/* Step 1: Selecionar Usuário */}
        {wizardStep === 1 && (
          <div className="space-y-4">
            {/* Busca em tempo real */}
            <Input
              value={userSearchTerm}
              placeholder="Buscar por nome, email ou telefone..."
              onChange={(e) => setUserSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />

            {/* Filtros Avançados */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Filter className="h-4 w-4" />
                <span>Filtros:</span>
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todas as roles</option>
                <option value="ADMIN">Administrador</option>
                <option value="PROFISSIONAL">Profissional</option>
                <option value="CLIENTE">Cliente</option>
                <option value="RECEPCIONIST">Recepcionista</option>
              </select>
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
              {(roleFilter || userStatusFilter || userSearchTerm) && (
                <button
                  onClick={() => {
                    setRoleFilter("");
                    setUserStatusFilter("");
                    setUserSearchTerm("");
                  }}
                  className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Contador de resultados */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoadingUsers ? "Carregando..." : `${filteredUsers.length} usuário(s) encontrado(s)`}
            </p>

            {/* Lista de Cards de Usuários */}
            <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
                  <UserX className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Nenhum usuário encontrado</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Tente ajustar os filtros</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-700 dark:hover:bg-violet-900/20 ${
                      selectedUser?.id === user.id
                        ? "border-violet-500 bg-violet-50 dark:border-violet-500 dark:bg-violet-900/30"
                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${
                        selectedUser?.id === user.id
                          ? "bg-violet-500 text-white"
                          : "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400"
                      }`}>
                        {user.nome?.charAt(0)?.toUpperCase() || "?"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {user.nome || "Sem nome"}
                          </p>
                          {selectedUser?.id === user.id && (
                            <Check className="h-4 w-4 text-violet-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{user.email || "-"}</span>
                          </span>
                          {user.telefone && (
                            <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                              <Phone className="h-3 w-3" />
                              {user.telefone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.ativo
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {user.ativo ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                          {user.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {formErrors.usuarioId && (
              <p className="text-sm text-red-500">{formErrors.usuarioId}</p>
            )}
          </div>
        )}

        {/* Step 2: Configurar Profissional */}
        {wizardStep === 2 && selectedUser && (
          <div className="space-y-4">
            {/* Card do usuário selecionado */}
            <div className="rounded-xl border-2 border-violet-500 bg-violet-50 p-4 dark:border-violet-500 dark:bg-violet-900/20">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500 text-xl font-semibold text-white">
                  {selectedUser.nome?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-violet-900 dark:text-violet-100">
                    {selectedUser.nome}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-violet-700 dark:text-violet-300">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedUser.email}
                    </span>
                    {selectedUser.telefone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedUser.telefone}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                  {getRoleLabel(selectedUser.role)}
                </span>
              </div>
            </div>

            {/* Formulário de configuração */}
            <Input
              label="Especialidade"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              placeholder="Ex: Corte Masculino, Coloração, Barba"
              leftIcon={<Scissors className="h-4 w-4" />}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bio / Descrição
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Descreva a experiência e especialidades do profissional..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.acceptsOnlineBooking}
                  onChange={(e) => setFormData({ ...formData, acceptsOnlineBooking: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Aceita agendamento online
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Permite que clientes agendem horários pela internet
                  </p>
                </div>
              </label>
            </div>

            {/* Seleção de Serviços */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Serviços que o profissional realiza
              </label>
              {isLoadingServices ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-violet-500" />
                  <span className="ml-2 text-sm text-gray-500">Carregando serviços...</span>
                </div>
              ) : availableServices.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center dark:border-gray-600">
                  <Scissors className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Nenhum serviço cadastrado
                  </p>
                </div>
              ) : (
                <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  {availableServices.map((service) => (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-700 dark:hover:bg-violet-900/20 ${
                        formData.serviceIds.includes(service.id)
                          ? "border-violet-500 bg-violet-50 dark:border-violet-500 dark:bg-violet-900/30"
                          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.serviceIds.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              serviceIds: [...formData.serviceIds, service.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              serviceIds: formData.serviceIds.filter((id) => id !== service.id),
                            });
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {service.category?.name} • {service.durationMinutes} min • R$ {service.price?.toFixed(2)}
                        </p>
                      </div>
                      {formData.serviceIds.includes(service.id) && (
                        <Check className="h-5 w-5 text-violet-500" />
                      )}
                    </label>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {formData.serviceIds.length} serviço(s) selecionado(s)
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Editar Profissional */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Editar Profissional"
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

          {selectedProfessional && (
            <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
              <p className="font-medium text-violet-700 dark:text-violet-400">
                {selectedProfessional.name || "Profissional"}
              </p>
              <p className="text-sm text-violet-600 dark:text-violet-300">
                {selectedProfessional.email}
              </p>
            </div>
          )}

          <Input
            label="Especialidade"
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            placeholder="Ex: Corte Masculino, Coloração"
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Descrição do profissional..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.acceptsOnlineBooking}
              onChange={(e) => setFormData({ ...formData, acceptsOnlineBooking: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Aceita agendamento online
            </span>
          </label>

          {/* Seleção de Serviços */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Serviços que o profissional realiza
            </label>
            {isLoadingServices ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-5 w-5 animate-spin text-violet-500" />
                <span className="ml-2 text-sm text-gray-500">Carregando serviços...</span>
              </div>
            ) : availableServices.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center dark:border-gray-600">
                <Scissors className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Nenhum serviço cadastrado
                </p>
              </div>
            ) : (
              <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                {availableServices.map((service) => (
                  <label
                    key={service.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-700 dark:hover:bg-violet-900/20 ${
                      formData.serviceIds.includes(service.id)
                        ? "border-violet-500 bg-violet-50 dark:border-violet-500 dark:bg-violet-900/30"
                        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.serviceIds.includes(service.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            serviceIds: [...formData.serviceIds, service.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            serviceIds: formData.serviceIds.filter((id) => id !== service.id),
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {service.category?.name} • {service.durationMinutes} min • R$ {service.price?.toFixed(2)}
                      </p>
                    </div>
                    {formData.serviceIds.includes(service.id) && (
                      <Check className="h-5 w-5 text-violet-500" />
                    )}
                  </label>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {formData.serviceIds.length} serviço(s) selecionado(s)
            </p>
          </div>

          {selectedProfessional && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Total de atendimentos:</strong> {selectedProfessional.totalAppointments || 0}
                {" | "}
                <strong>Avaliação:</strong> {selectedProfessional.averageRating?.toFixed(1) || "0.0"}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProfessional(null);
        }}
        onConfirm={handleDelete}
        title="Desativar Profissional"
        message={`Tem certeza que deseja desativar o profissional "${selectedProfessional?.name}"? Ele não poderá receber novos agendamentos.`}
        confirmText="Desativar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />
    </SalonLayout>
  );
}
