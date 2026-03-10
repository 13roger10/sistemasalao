// Client Service - API calls for client management

import { api } from './api';
import type {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  ClientFilters,
  ClientStats,
  ClientHistory,
  ClientBirthday,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams } from '@/types/salon/common';

const BASE_PATH = '/clientes';

export const clientService = {
  // List clients with pagination and filters
  // IMPORTANTE: Sempre requer salonId - a rota GET /clientes não existe no backend
  list: (
    params: PaginationParams & ClientFilters & { salonId?: string | number }
  ): Promise<PaginatedResponse<Client>> => {
    // Sempre usa o endpoint /clientes/salon/{salonId} - o backend não tem GET /clientes
    const salonId = params.salonId || '1'; // Default para salão 1 se não especificado
    return api.get<Client[]>(`${BASE_PATH}/salon/${salonId}`, params)
      .then((clients) => {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const totalPages = Math.ceil(clients.length / limit);
        return {
          data: clients,
          items: clients,
          meta: {
            total: clients.length,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };
      });
  },

  // Get single client by ID
  getById: (id: string): Promise<Client> => {
    return api.get<Client>(`${BASE_PATH}/${id}`);
  },

  // Create new client
  create: (data: ClientCreateInput): Promise<Client> => {
    return api.post<Client>(BASE_PATH, data);
  },

  // Update existing client
  update: (id: string, data: ClientUpdateInput): Promise<Client> => {
    return api.patch<Client>(`${BASE_PATH}/${id}`, data);
  },

  // Delete client (soft delete)
  delete: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/${id}`);
  },

  // Get client statistics
  getStats: (unitId?: string): Promise<ClientStats> => {
    return api.get<ClientStats>(`${BASE_PATH}/stats`, { unitId });
  },

  // Get client history (appointments, spending, etc.)
  getHistory: (id: string): Promise<ClientHistory> => {
    return api.get<ClientHistory>(`${BASE_PATH}/${id}/history`);
  },

  // Get birthdays
  getBirthdays: (params: {
    month?: number;
    days?: number;
    unitId?: string;
  }): Promise<ClientBirthday[]> => {
    return api.get<ClientBirthday[]>(`${BASE_PATH}/birthdays`, params);
  },

  // Get inactive clients (60+ days without visit)
  getInactive: (
    params: PaginationParams & { days?: number; unitId?: string }
  ): Promise<PaginatedResponse<Client>> => {
    return api.get<PaginatedResponse<Client>>(`${BASE_PATH}/inactive`, params);
  },

  // Search clients (quick search by name, phone, email)
  search: (query: string, limit?: number): Promise<Client[]> => {
    return api.get<Client[]>(`${BASE_PATH}/search`, { q: query, limit });
  },

  // Update client loyalty points
  updateLoyaltyPoints: (
    id: string,
    points: number,
    reason: string
  ): Promise<Client> => {
    return api.post<Client>(`${BASE_PATH}/${id}/loyalty-points`, {
      points,
      reason,
    });
  },

  // Merge duplicate clients
  merge: (
    primaryId: string,
    duplicateIds: string[]
  ): Promise<Client> => {
    return api.post<Client>(`${BASE_PATH}/merge`, {
      primaryId,
      duplicateIds,
    });
  },

  // Export clients to Excel/CSV
  export: (
    filters: ClientFilters,
    format: 'csv' | 'xlsx'
  ): Promise<Blob> => {
    return api.get<Blob>(`${BASE_PATH}/export`, { ...filters, format });
  },

  // Import clients from Excel/CSV
  import: (file: File): Promise<{ imported: number; errors: string[] }> => {
    return api.upload(`${BASE_PATH}/import`, file);
  },
};
