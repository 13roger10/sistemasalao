import { api } from "@/lib/api";
import {
  UsuarioListItem,
  UsuarioPageResponse,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  UserRole,
  RoleOption,
} from "@/types";

/** Agendamento na ficha: "com" é o profissional (ficha do cliente) ou o cliente (ficha do profissional). */
export interface ItemAgendaFicha {
  id: number;
  dataHora: string;
  fimPrevisto?: string | null;
  status: string;
  servicos: string[];
  com?: string | null;
  valor?: number | null;
}

/** Ficha do usuário (GET /usuarios/{id}/ficha). agenda = null: sem aba de agenda (recepcionista, admin). */
export interface FichaUsuario {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  /** AAAA-MM-DD */
  dataNascimento?: string | null;
  idade?: number | null;
  role: UserRole;
  ativo: boolean;
  criadoEm?: string;
  ultimoLogin?: string | null;
  cliente?: {
    totalAgendamentos: number;
    totalGasto: number;
    noShows: number;
    ultimaVisita?: string | null;
    observacoes?: string | null;
  };
  profissional?: {
    especialidade?: string | null;
    servicos: string[];
    tipoComissao?: string | null;
    valorComissao?: number | null;
  };
  agenda: { proximos: ItemAgendaFicha[]; anteriores: ItemAgendaFicha[] } | null;
}

export interface ListUsuariosParams {
  role?: UserRole;
  search?: string;
  page?: number;
  size?: number;
}

export const userService = {
  /**
   * Lista usuários com paginação e filtros
   */
  async list(params: ListUsuariosParams = {}): Promise<UsuarioPageResponse> {
    const { role, search, page = 0, size = 10 } = params;
    const queryParams = new URLSearchParams();

    if (role) queryParams.append("role", role);
    if (search) queryParams.append("search", search);
    queryParams.append("page", page.toString());
    queryParams.append("size", size.toString());

    const response = await api.get<UsuarioPageResponse>(
      `/usuarios?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Busca um usuário por ID
   */
  async getById(id: number): Promise<UsuarioListItem> {
    const response = await api.get<UsuarioListItem>(`/usuarios/${id}`);
    return response.data;
  },

  /**
   * Ficha do usuário (admin): dados e, para cliente/profissional, a agenda na unidade atual
   */
  async ficha(id: number): Promise<FichaUsuario> {
    const response = await api.get<FichaUsuario>(`/usuarios/${id}/ficha`);
    return response.data;
  },

  /**
   * Cria um novo usuário
   */
  async create(data: CreateUsuarioRequest): Promise<UsuarioListItem> {
    const response = await api.post<UsuarioListItem>("/usuarios", data);
    return response.data;
  },

  /**
   * Atualiza um usuário existente
   */
  async update(id: number, data: UpdateUsuarioRequest): Promise<UsuarioListItem> {
    const response = await api.put<UsuarioListItem>(`/usuarios/${id}`, data);
    return response.data;
  },

  /**
   * Desativa um usuário (soft delete)
   */
  async deactivate(id: number): Promise<void> {
    await api.delete(`/usuarios/${id}`);
  },

  /**
   * Exclui um usuário definitivamente. O backend recusa (400) usuários com histórico
   * (agendamentos, administração de salão etc.) — esses devem ser desativados.
   */
  async deletePermanently(id: number): Promise<void> {
    await api.delete(`/usuarios/${id}/permanente`);
  },

  /**
   * Reativa um usuário
   */
  async unlockLogin(id: number): Promise<UsuarioListItem> {
    // Libera a conta bloqueada por senhas erradas
    const response = await api.post<UsuarioListItem>(`/usuarios/${id}/desbloquear-login`);
    return response.data;
  },

  async reactivate(id: number): Promise<UsuarioListItem> {
    const response = await api.post<UsuarioListItem>(`/usuarios/${id}/reativar`);
    return response.data;
  },

  /**
   * Busca todas as roles disponíveis
   */
  async getRoles(): Promise<RoleOption[]> {
    const response = await api.get<RoleOption[]>("/usuarios/roles");
    return response.data;
  },
};
