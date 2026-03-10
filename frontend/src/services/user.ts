import { api } from "@/lib/api";
import {
  UsuarioListItem,
  UsuarioPageResponse,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  UserRole,
  RoleOption,
} from "@/types";

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
   * Reativa um usuário
   */
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
