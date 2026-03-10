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
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, ActionMenuItem, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { userService } from "@/services/user";
import { useAuth } from "@/contexts/AuthContext";
import {
  UsuarioListItem,
  UserRole,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  RoleOption,
} from "@/types";

// Componente de Badge para Role
const RoleBadge = ({ role }: { role: UserRole }) => {
  const colors = {
    ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    PROFISSIONAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    CLIENTE: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };

  const icons = {
    ADMIN: <Shield className="h-3 w-3" />,
    PROFISSIONAL: <Building2 className="h-3 w-3" />,
    CLIENTE: <UserIcon className="h-3 w-3" />,
  };

  const labels = {
    ADMIN: "Admin",
    PROFISSIONAL: "Profissional",
    CLIENTE: "Cliente",
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

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Estados de listagem
  const [usuarios, setUsuarios] = useState<UsuarioListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [roles, setRoles] = useState<RoleOption[]>([]);

  // Estados de modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioListItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState<CreateUsuarioRequest>({
    nome: "",
    email: "",
    password: "",
    telefone: "",
    role: "PROFISSIONAL",
    plano: "FREE",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Carregar roles disponíveis
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesData = await userService.getRoles();
        setRoles(rolesData);
      } catch (error) {
        console.error("Erro ao carregar roles:", error);
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
      await userService.create(formData);
      setIsCreateModalOpen(false);
      resetForm();
      loadUsuarios();
    } catch (error: unknown) {
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
    });
    setFormErrors({});
    setSelectedUser(null);
  };

  // Abrir modal de edição
  const openEditModal = (usuario: UsuarioListItem) => {
    setSelectedUser(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      password: "",
      telefone: usuario.telefone || "",
      role: usuario.role,
      plano: usuario.plano,
    });
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
    <AdminLayout title="Usuários">
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
            />
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              placeholder="email@exemplo.com"
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
            />
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              placeholder="email@exemplo.com"
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
        title="Desativar Usuário"
        message={`Tem certeza que deseja desativar o usuário "${selectedUser?.nome}"? O usuário não poderá mais acessar o sistema.`}
        confirmText="Desativar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />
    </AdminLayout>
  );
}
