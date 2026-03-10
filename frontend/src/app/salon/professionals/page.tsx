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
  Scissors,
  Clock,
  Star,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { DataTable, ActionMenuItem, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useSalonAuth } from "@/contexts/SalonAuthContext";

// Tipos
interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  specialty: string;
  services: string[];
  workingHours: string;
  commission: number;
  rating: number;
  totalServices: number;
  status: "active" | "inactive";
  createdAt: Date;
}

interface ProfessionalFormData {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  commission: number;
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
    name: "",
    email: "",
    phone: "",
    specialty: "",
    commission: 50,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Carregar profissionais (mock)
  const loadProfessionals = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock data
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockProfessionals: Professional[] = [
        {
          id: "1",
          name: "Carlos Silva",
          email: "carlos@salao.com",
          phone: "(11) 99999-1111",
          specialty: "Corte Masculino",
          services: ["Corte", "Barba", "Sobrancelha"],
          workingHours: "09:00 - 18:00",
          commission: 50,
          rating: 4.8,
          totalServices: 156,
          status: "active",
          createdAt: new Date(),
        },
        {
          id: "2",
          name: "Ana Santos",
          email: "ana@salao.com",
          phone: "(11) 99999-2222",
          specialty: "Coloração",
          services: ["Coloração", "Mechas", "Corte Feminino"],
          workingHours: "10:00 - 19:00",
          commission: 45,
          rating: 4.9,
          totalServices: 203,
          status: "active",
          createdAt: new Date(),
        },
        {
          id: "3",
          name: "Pedro Costa",
          email: "pedro@salao.com",
          phone: "(11) 99999-3333",
          specialty: "Manicure",
          services: ["Manicure", "Pedicure", "Unhas em Gel"],
          workingHours: "09:00 - 17:00",
          commission: 40,
          rating: 4.7,
          totalServices: 89,
          status: "inactive",
          createdAt: new Date(),
        },
      ];

      let filtered = mockProfessionals;
      if (searchTerm) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (statusFilter) {
        filtered = filtered.filter((p) => p.status === statusFilter);
      }

      setProfessionals(filtered);
      setTotalPages(1);
      setTotalItems(filtered.length);
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

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
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsCreateModalOpen(false);
      resetForm();
      loadProfessionals();
    } catch (error) {
      console.error("Erro ao criar profissional:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProfessional || !validateForm()) return;

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsEditModalOpen(false);
      resetForm();
      loadProfessionals();
    } catch (error) {
      console.error("Erro ao atualizar profissional:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProfessional) return;

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsDeleteModalOpen(false);
      setSelectedProfessional(null);
      loadProfessionals();
    } catch (error) {
      console.error("Erro ao desativar profissional:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Nome é obrigatório";
    }
    if (!formData.email.trim()) {
      errors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email inválido";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Telefone é obrigatório";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      specialty: "",
      commission: 50,
    });
    setFormErrors({});
    setSelectedProfessional(null);
  };

  const openEditModal = (professional: Professional) => {
    setSelectedProfessional(professional);
    setFormData({
      name: professional.name,
      email: professional.email,
      phone: professional.phone,
      specialty: professional.specialty,
      commission: professional.commission,
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
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.email}</p>
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
          {item.specialty}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Telefone",
      render: (item) => (
        <span className="text-gray-700 dark:text-gray-300">{item.phone}</span>
      ),
    },
    {
      key: "rating",
      header: "Avaliação",
      render: (item) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="font-medium text-gray-900 dark:text-white">{item.rating}</span>
        </div>
      ),
    },
    {
      key: "commission",
      header: "Comissão",
      render: (item) => (
        <span className="font-medium text-gray-900 dark:text-white">{item.commission}%</span>
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
          <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Novo Profissional
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
              label: "Adicionar profissional",
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
                    onClick={() => console.log("Reativar", item.id)}
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

      {/* Modal de Criar Profissional */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Novo Profissional"
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
              Criar Profissional
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
              label="Email *"
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
              label="Telefone *"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={formErrors.phone}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="Especialidade"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              placeholder="Ex: Corte Masculino"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Comissão (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.commission}
                onChange={(e) => setFormData({ ...formData, commission: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
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
              label="Email *"
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
              label="Telefone *"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={formErrors.phone}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="Especialidade"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              placeholder="Ex: Corte Masculino"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Comissão (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.commission}
                onChange={(e) => setFormData({ ...formData, commission: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {selectedProfessional && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Total de atendimentos:</strong> {selectedProfessional.totalServices}
                {" | "}
                <strong>Avaliação:</strong> {selectedProfessional.rating}
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
