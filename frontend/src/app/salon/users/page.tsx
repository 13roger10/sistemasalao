"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Shield,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { DataTable, ActionMenuItem, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { userService } from "@/services/user";
import { serviceService } from "@/services/salon/serviceService";
import { professionalService } from "@/services/salon/professionalService";
import {
  workScheduleService,
  diasSemana,
  diasSemanaShort,
  type DiaSemana,
  type WorkScheduleRequest,
} from "@/services/salon/workScheduleService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import {
  UsuarioListItem,
  UserRole,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  RoleOption,
} from "@/types";
import type { Service } from "@/types/salon";
import { Clock } from "lucide-react";

// Componente de Badge para Role
const RoleBadge = ({ role }: { role: UserRole }) => {
  const colors = {
    ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    PROFISSIONAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    CLIENTE: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    RECEPCIONISTA: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  };

  const icons = {
    ADMIN: <Shield className="h-3 w-3" />,
    PROFISSIONAL: <Building2 className="h-3 w-3" />,
    CLIENTE: <UserIcon className="h-3 w-3" />,
    RECEPCIONISTA: <UserIcon className="h-3 w-3" />,
  };

  const labels = {
    ADMIN: "Admin",
    PROFISSIONAL: "Profissional",
    CLIENTE: "Cliente",
    RECEPCIONISTA: "Recepcionista",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[role]}`}
    >
      {icons[role]}
      {labels[role]}
    </span>
  );
};

// Componente de Badge para Status
const StatusBadge = ({ ativo }: { ativo: boolean }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ativo
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {ativo ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
};

export default function SalonUsersPage() {
  const router = useRouter();
  const { user } = useSalonAuth();

  // Estados de listagem
  const [usuarios, setUsuarios] = useState<UsuarioListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Roles padrão como fallback
  const DEFAULT_ROLES: RoleOption[] = [
    { value: "ADMIN", label: "Administrador do Salão", authority: "ROLE_ADMIN" },
    { value: "PROFISSIONAL", label: "Profissional/Funcionário", authority: "ROLE_PROFISSIONAL" },
    { value: "CLIENTE", label: "Cliente", authority: "ROLE_CLIENTE" },
  ];

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [roles, setRoles] = useState<RoleOption[]>(DEFAULT_ROLES);

  // Estados de modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para modal de erro de configuração do profissional
  const [configErrorModal, setConfigErrorModal] = useState<{
    open: boolean;
    userId: number | null;
    profissionalId: number | null;
    errors: string[];
  }>({ open: false, userId: null, profissionalId: null, errors: [] });

  // Estados do formulário
  const [formData, setFormData] = useState<CreateUsuarioRequest>({
    nome: "",
    email: "",
    password: "",
    telefone: "",
    role: "PROFISSIONAL",
    plano: "FREE",
    salonId: 1, // ID do salão padrão
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Estados para serviços (profissionais)
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Estados para horários de trabalho (profissionais)
  const [workSchedules, setWorkSchedules] = useState<WorkScheduleRequest[]>(
    workScheduleService.getDefaultSchedule()
  );
  const [showScheduleSection, setShowScheduleSection] = useState(false);

  // Carregar roles disponíveis
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesData = await userService.getRoles();
        if (rolesData && rolesData.length > 0) {
          setRoles(rolesData);
        }
        // Se rolesData estiver vazio, mantém os DEFAULT_ROLES
      } catch (error) {
        console.error("Erro ao carregar roles:", error);
        // Em caso de erro, mantém os DEFAULT_ROLES
      }
    };
    loadRoles();
  }, []);

  // Carregar usuários
  const loadUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await userService.list({
        page,
        size: 10,
        role: roleFilter || undefined,
        search: searchTerm || undefined,
      });
      setUsuarios(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, searchTerm]);

  useEffect(() => {
    loadUsuarios();
  }, [loadUsuarios]);

  // Carregar serviços quando modal estiver aberto e role for PROFISSIONAL
  useEffect(() => {
    const loadServices = async () => {
      if ((isCreateModalOpen || isEditModalOpen) && formData.role === "PROFISSIONAL") {
        setIsLoadingServices(true);
        // Expandir seção de horários automaticamente para novos profissionais
        if (isCreateModalOpen) {
          setShowScheduleSection(true);
        }
        try {
          const services = await serviceService.getAll({ salonId: "1", status: "active" });
          setAvailableServices(services);
        } catch (error) {
          console.error("Erro ao carregar serviços:", error);
        } finally {
          setIsLoadingServices(false);
        }
      }
    };
    loadServices();
  }, [isCreateModalOpen, isEditModalOpen, formData.role]);

  // Handlers de busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadUsuarios();
  };

  // Handlers de CRUD
  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      console.log("[handleCreate] Criando usuário com dados:", formData);
      const createdUser = await userService.create(formData);
      console.log("[handleCreate] Usuário criado:", createdUser);
      console.log("[handleCreate] profissionalId:", createdUser.profissionalId);

      // Se for profissional, configurar serviços e horários AUTOMATICAMENTE
      if (formData.role === "PROFISSIONAL") {
        if (!createdUser.profissionalId) {
          console.error("[handleCreate] ERRO: profissionalId não foi retornado pelo backend!");
          alert("Erro: O profissional foi criado mas o ID não foi retornado. Edite o profissional para configurar serviços e horários.");
        } else {
          const errors: string[] = [];
          const successItems: string[] = [];

          // Determinar quais serviços vincular:
          // Se o usuário selecionou serviços, usar esses
          // Senão, usar TODOS os serviços disponíveis (padrão automático)
          const servicesToLink = selectedServiceIds.length > 0
            ? selectedServiceIds
            : availableServices.map(s => String(s.id));

          if (servicesToLink.length > 0) {
            try {
              console.log("[handleCreate] Vinculando serviços:", servicesToLink, "ao profissional:", createdUser.profissionalId);
              await professionalService.update(String(createdUser.profissionalId), {
                userId: String(createdUser.id),
                serviceIds: servicesToLink,
                acceptsOnlineBooking: true,
              });
              console.log("[handleCreate] Serviços vinculados com sucesso!");
              successItems.push(`${servicesToLink.length} serviços`);
            } catch (serviceError) {
              console.error("[handleCreate] Erro ao vincular serviços:", serviceError);
              errors.push("serviços");
            }
          } else {
            console.warn("[handleCreate] Nenhum serviço disponível para vincular");
          }

          // Determinar quais horários configurar:
          // Usar os horários configurados pelo usuário OU o padrão (Seg-Sáb 09:00-18:00)
          const schedulesToSave = workSchedules.some(s => s.ativo)
            ? workSchedules
            : workScheduleService.getDefaultSchedule();

          const activeSchedules = schedulesToSave.filter(s => s.ativo);
          if (activeSchedules.length > 0) {
            try {
              console.log("[handleCreate] Salvando horários:", activeSchedules.map(s => s.diaSemana), "para profissional:", createdUser.profissionalId);
              await workScheduleService.saveAll(createdUser.profissionalId, schedulesToSave);
              console.log("[handleCreate] Horários salvos com sucesso!");
              successItems.push(`horários (${activeSchedules.length} dias)`);
            } catch (scheduleError) {
              console.error("[handleCreate] Erro ao salvar horários:", scheduleError);
              errors.push("horários");
            }
          }

          // Mostrar resultado
          if (errors.length > 0) {
            setConfigErrorModal({
              open: true,
              userId: createdUser.id,
              profissionalId: createdUser.profissionalId,
              errors,
            });
          } else if (successItems.length > 0) {
            console.log("[handleCreate] Profissional criado e configurado automaticamente:", successItems.join(", "));
          }
        }
      }

      setIsCreateModalOpen(false);
      resetForm();
      loadUsuarios();
    } catch (error: unknown) {
      console.error("[handleCreate] Erro ao criar usuário:", error);
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({
        submit: err.response?.data?.message || "Erro ao criar usuário",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser || !validateForm(true)) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateUsuarioRequest = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        role: formData.role,
        plano: formData.plano,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }

      await userService.update(selectedUser.id, updateData);

      // Se for profissional, atualizar serviços e horários
      if (formData.role === "PROFISSIONAL" && selectedUser.profissionalId) {
        // Atualizar serviços vinculados
        try {
          await professionalService.update(String(selectedUser.profissionalId), {
            userId: String(selectedUser.id),
            serviceIds: selectedServiceIds,
            acceptsOnlineBooking: true,
          });
        } catch (serviceError) {
          console.error("Erro ao atualizar serviços do profissional:", serviceError);
        }

        // Atualizar horários de trabalho
        try {
          await workScheduleService.saveAll(selectedUser.profissionalId, workSchedules);
        } catch (scheduleError) {
          console.error("Erro ao atualizar horários de trabalho:", scheduleError);
        }
      }

      setIsEditModalOpen(false);
      resetForm();
      loadUsuarios();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({
        submit: err.response?.data?.message || "Erro ao atualizar usuário",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await userService.deactivate(selectedUser.id);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      loadUsuarios();
    } catch (error) {
      console.error("Erro ao desativar usuário:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (usuario: UsuarioListItem) => {
    try {
      await userService.reactivate(usuario.id);
      loadUsuarios();
    } catch (error) {
      console.error("Erro ao reativar usuário:", error);
    }
  };

  // Handlers para modal de erro de configuração
  const handleConfigErrorEdit = async () => {
    if (!configErrorModal.userId) return;
    setConfigErrorModal({ open: false, userId: null, profissionalId: null, errors: [] });
    // Recarregar e abrir modal de edição
    await loadUsuarios();
    const usuario = usuarios.find(u => u.id === configErrorModal.userId);
    if (usuario) {
      openEditModal(usuario);
    }
  };

  const handleConfigErrorDelete = async () => {
    if (!configErrorModal.userId) return;
    setIsSubmitting(true);
    try {
      await userService.deactivate(configErrorModal.userId);
      setConfigErrorModal({ open: false, userId: null, profissionalId: null, errors: [] });
      loadUsuarios();
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validação do formulário
  const validateForm = (isEdit = false) => {
    const errors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      errors.nome = "Nome é obrigatório";
    }

    if (!formData.email.trim()) {
      errors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email inválido";
    }

    if (!isEdit && !formData.password) {
      errors.password = "Senha é obrigatória";
    } else if (formData.password && formData.password.length < 6) {
      errors.password = "Senha deve ter no mínimo 6 caracteres";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Reset do formulário
  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      password: "",
      telefone: "",
      role: "PROFISSIONAL",
      plano: "FREE",
      salonId: 1, // ID do salão padrão
    });
    setFormErrors({});
    setSelectedUser(null);
    setSelectedServiceIds([]);
    setWorkSchedules(workScheduleService.getDefaultSchedule());
    setShowScheduleSection(false);
  };

  // Abrir modal de edição
  const openEditModal = async (usuario: UsuarioListItem) => {
    setSelectedUser(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      password: "",
      telefone: usuario.telefone || "",
      role: usuario.role,
      plano: usuario.plano,
    });

    // Se for profissional, carregar os serviços e horários vinculados
    if (usuario.role === "PROFISSIONAL" && usuario.profissionalId) {
      // Carregar serviços
      try {
        const professional = await professionalService.getById(String(usuario.profissionalId));
        setSelectedServiceIds(professional.serviceIds || []);
      } catch (error) {
        console.error("Erro ao carregar serviços do profissional:", error);
        setSelectedServiceIds([]);
      }

      // Carregar horários de trabalho
      try {
        const existingSchedules = await workScheduleService.list(usuario.profissionalId);
        const defaultSchedules = workScheduleService.getDefaultSchedule();

        // Merge existing schedules with defaults
        const mergedSchedules = defaultSchedules.map(defaultSched => {
          const existing = existingSchedules.find(e => e.diaSemana === defaultSched.diaSemana);
          if (existing) {
            return {
              diaSemana: existing.diaSemana,
              horaInicio: existing.horaInicio.substring(0, 5), // Remove seconds
              horaFim: existing.horaFim.substring(0, 5),
              intervaloInicio: existing.intervaloInicio?.substring(0, 5),
              intervaloFim: existing.intervaloFim?.substring(0, 5),
              ativo: existing.ativo,
            };
          }
          return defaultSched;
        });
        setWorkSchedules(mergedSchedules);
      } catch (error) {
        console.error("Erro ao carregar horários do profissional:", error);
        setWorkSchedules(workScheduleService.getDefaultSchedule());
      }
    } else {
      setSelectedServiceIds([]);
      setWorkSchedules(workScheduleService.getDefaultSchedule());
    }

    setIsEditModalOpen(true);
  };

  // Abrir modal de exclusão
  const openDeleteModal = (usuario: UsuarioListItem) => {
    setSelectedUser(usuario);
    setIsDeleteModalOpen(true);
  };

  // Colunas da tabela
  const columns: Column<UsuarioListItem>[] = [
    {
      key: "nome",
      header: "Usuário",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
            {item.avatarUrl ? (
              <img
                src={item.avatarUrl}
                alt={item.nome}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold">
                {item.nome.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.nome}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Perfil",
      render: (item) => <RoleBadge role={item.role} />,
    },
    {
      key: "salonNome",
      header: "Unidade",
      render: (item) =>
        item.salonNome ? (
          <span className="text-gray-700 dark:text-gray-300">{item.salonNome}</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">-</span>
        ),
    },
    {
      key: "ativo",
      header: "Status",
      render: (item) => <StatusBadge ativo={item.ativo} />,
    },
    {
      key: "criadoEm",
      header: "Criado em",
      render: (item) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
  ];

  return (
    <SalonLayout requiredRole="ADMIN" pageTitle="Usuários">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Gestão de Usuários
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Gerencie os usuários do sistema
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Novo Usuário
          </Button>
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as UserRole | "");
              setPage(0);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos os perfis</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <DataTable
            data={usuarios}
            columns={columns}
            keyExtractor={(item) => item.id.toString()}
            isLoading={isLoading}
            emptyMessage="Nenhum usuário encontrado"
            emptyAction={{
              label: "Criar usuário",
              onClick: () => setIsCreateModalOpen(true),
            }}
            pagination={{
              currentPage: page + 1,
              totalPages,
              totalItems: totalElements,
              itemsPerPage: 10,
              onPageChange: (newPage) => setPage(newPage - 1),
            }}
            rowActions={(item) => (
              <>
                <ActionMenuItem
                  onClick={() => openEditModal(item)}
                  icon={<Edit2 className="h-4 w-4" />}
                >
                  Editar
                </ActionMenuItem>
                {item.ativo ? (
                  <ActionMenuItem
                    onClick={() => openDeleteModal(item)}
                    icon={<UserX className="h-4 w-4" />}
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

      {/* Modal de Criar Usuário */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Novo Usuário"
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
              Criar Usuário
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
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              error={formErrors.nome}
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
              label="Senha *"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={formErrors.password}
              placeholder="Mínimo 6 caracteres"
              showPasswordToggle
              autoComplete="new-password"
            />
            <Input
              label="Telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Perfil *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Plano
              </label>
              <select
                value={formData.plano}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    plano: e.target.value as "FREE" | "PRO" | "PREMIUM",
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
          </div>

          {/* Seleção de Serviços para Profissionais */}
          {formData.role === "PROFISSIONAL" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Serviços que realiza
              </label>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Selecione os serviços que este profissional pode realizar
              </p>
              {isLoadingServices ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                </div>
              ) : availableServices.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300 p-2 dark:border-gray-600">
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {availableServices.map((service) => (
                      <label
                        key={service.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                          selectedServiceIds.includes(service.id)
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.includes(service.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServiceIds([...selectedServiceIds, service.id]);
                            } else {
                              setSelectedServiceIds(selectedServiceIds.filter((id) => id !== service.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-gray-900 dark:text-white">{service.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhum serviço disponível
                </p>
              )}
              {selectedServiceIds.length > 0 && (
                <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                  {selectedServiceIds.length} serviço(s) selecionado(s)
                </p>
              )}
            </div>
          )}

          {/* Horários de Trabalho para Profissionais */}
          {formData.role === "PROFISSIONAL" && (
            <div>
              <button
                type="button"
                onClick={() => setShowScheduleSection(!showScheduleSection)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-violet-500" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Horários de Trabalho
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {workSchedules.filter(s => s.ativo).length} dia(s) configurado(s)
                    </p>
                  </div>
                </div>
                <span className="text-sm text-violet-600 dark:text-violet-400">
                  {showScheduleSection ? "Ocultar" : "Configurar"}
                </span>
              </button>

              {showScheduleSection && (
                <div className="mt-3 space-y-2 rounded-lg border border-gray-300 p-3 dark:border-gray-600">
                  {diasSemana.map((dia, idx) => {
                    const schedule = workSchedules[idx];
                    if (!schedule) return null;

                    return (
                      <div
                        key={dia}
                        className={`flex items-center gap-3 rounded-lg p-2 ${
                          schedule.ativo
                            ? "bg-green-50 dark:bg-green-900/20"
                            : "bg-gray-50 dark:bg-gray-800"
                        }`}
                      >
                        <label className="flex w-20 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={schedule.ativo}
                            onChange={(e) => {
                              const newSchedules = [...workSchedules];
                              newSchedules[idx] = {
                                ...newSchedules[idx],
                                ativo: e.target.checked,
                              };
                              setWorkSchedules(newSchedules);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {diasSemanaShort[dia]}
                          </span>
                        </label>

                        {schedule.ativo && (
                          <>
                            <input
                              type="time"
                              value={schedule.horaInicio}
                              onChange={(e) => {
                                const newSchedules = [...workSchedules];
                                newSchedules[idx] = {
                                  ...newSchedules[idx],
                                  horaInicio: e.target.value,
                                };
                                setWorkSchedules(newSchedules);
                              }}
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-gray-500">às</span>
                            <input
                              type="time"
                              value={schedule.horaFim}
                              onChange={(e) => {
                                const newSchedules = [...workSchedules];
                                newSchedules[idx] = {
                                  ...newSchedules[idx],
                                  horaFim: e.target.value,
                                };
                                setWorkSchedules(newSchedules);
                              }}
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Almoço: {schedule.intervaloInicio}-{schedule.intervaloFim}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Intervalo de almoço padrão: 12:00-13:00
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de Editar Usuário */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Editar Usuário"
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
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              error={formErrors.nome}
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
              label="Nova Senha"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={formErrors.password}
              placeholder="Deixe em branco para manter"
              hint="Preencha apenas se quiser alterar"
              showPasswordToggle
              autoComplete="new-password"
            />
            <Input
              label="Telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Perfil *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Plano
              </label>
              <select
                value={formData.plano}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    plano: e.target.value as "FREE" | "PRO" | "PREMIUM",
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
          </div>

          {/* Seleção de Serviços para Profissionais */}
          {formData.role === "PROFISSIONAL" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Serviços que realiza
              </label>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Selecione os serviços que este profissional pode realizar
              </p>
              {isLoadingServices ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                </div>
              ) : availableServices.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300 p-2 dark:border-gray-600">
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {availableServices.map((service) => (
                      <label
                        key={service.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                          selectedServiceIds.includes(service.id)
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.includes(service.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServiceIds([...selectedServiceIds, service.id]);
                            } else {
                              setSelectedServiceIds(selectedServiceIds.filter((id) => id !== service.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-gray-900 dark:text-white">{service.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhum serviço disponível
                </p>
              )}
              {selectedServiceIds.length > 0 && (
                <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
                  {selectedServiceIds.length} serviço(s) selecionado(s)
                </p>
              )}
            </div>
          )}

          {/* Horários de Trabalho para Profissionais */}
          {formData.role === "PROFISSIONAL" && (
            <div>
              <button
                type="button"
                onClick={() => setShowScheduleSection(!showScheduleSection)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-violet-500" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Horários de Trabalho
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {workSchedules.filter(s => s.ativo).length} dia(s) configurado(s)
                    </p>
                  </div>
                </div>
                <span className="text-sm text-violet-600 dark:text-violet-400">
                  {showScheduleSection ? "Ocultar" : "Configurar"}
                </span>
              </button>

              {showScheduleSection && (
                <div className="mt-3 space-y-2 rounded-lg border border-gray-300 p-3 dark:border-gray-600">
                  {diasSemana.map((dia, idx) => {
                    const schedule = workSchedules[idx];
                    if (!schedule) return null;

                    return (
                      <div
                        key={dia}
                        className={`flex items-center gap-3 rounded-lg p-2 ${
                          schedule.ativo
                            ? "bg-green-50 dark:bg-green-900/20"
                            : "bg-gray-50 dark:bg-gray-800"
                        }`}
                      >
                        <label className="flex w-20 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={schedule.ativo}
                            onChange={(e) => {
                              const newSchedules = [...workSchedules];
                              newSchedules[idx] = {
                                ...newSchedules[idx],
                                ativo: e.target.checked,
                              };
                              setWorkSchedules(newSchedules);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {diasSemanaShort[dia]}
                          </span>
                        </label>

                        {schedule.ativo && (
                          <>
                            <input
                              type="time"
                              value={schedule.horaInicio}
                              onChange={(e) => {
                                const newSchedules = [...workSchedules];
                                newSchedules[idx] = {
                                  ...newSchedules[idx],
                                  horaInicio: e.target.value,
                                };
                                setWorkSchedules(newSchedules);
                              }}
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-gray-500">às</span>
                            <input
                              type="time"
                              value={schedule.horaFim}
                              onChange={(e) => {
                                const newSchedules = [...workSchedules];
                                newSchedules[idx] = {
                                  ...newSchedules[idx],
                                  horaFim: e.target.value,
                                };
                                setWorkSchedules(newSchedules);
                              }}
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Almoço: {schedule.intervaloInicio}-{schedule.intervaloFim}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Intervalo de almoço padrão: 12:00-13:00
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedUser && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>Criado em:</strong>{" "}
                {new Date(selectedUser.criadoEm).toLocaleDateString("pt-BR")}
                {selectedUser.ultimoLogin && (
                  <>
                    {" "}| <strong>Último login:</strong>{" "}
                    {new Date(selectedUser.ultimoLogin).toLocaleDateString("pt-BR")}
                  </>
                )}
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
          setSelectedUser(null);
        }}
        onConfirm={handleDelete}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir o usuário "${selectedUser?.nome}"? O usuário será desativado e não poderá mais acessar o sistema.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Modal de Erro de Configuração do Profissional */}
      <Modal
        isOpen={configErrorModal.open}
        onClose={() => setConfigErrorModal({ open: false, userId: null, profissionalId: null, errors: [] })}
        title="Atenção"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                O profissional foi criado, mas houve erro ao configurar: <strong>{configErrorModal.errors.join(", ")}</strong>.
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Você pode editar o profissional para corrigir ou excluí-lo.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfigErrorModal({ open: false, userId: null, profissionalId: null, errors: [] })}
            >
              Fechar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfigErrorDelete}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <Button
              variant="primary"
              onClick={handleConfigErrorEdit}
              disabled={isSubmitting}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>
      </Modal>
    </SalonLayout>
  );
}
