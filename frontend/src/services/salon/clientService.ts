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

  // Unblock client (e.g. blocked after too many no-shows) — admin only
  unblock: (id: string): Promise<void> => {
    return api.post(`${BASE_PATH}/${id}/desbloquear`);
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

  // Check if phone already exists
  checkPhoneExists: async (phone: string, salonId: string, excludeClientId?: string): Promise<boolean> => {
    try {
      const clients = await api.get<Client[]>(`${BASE_PATH}/salon/${salonId}`);
      const normalizedPhone = phone.replace(/\D/g, ''); // Remove non-digits
      return clients.some(client => {
        if (excludeClientId && client.id === excludeClientId) return false;
        const clientPhone = client.phone?.replace(/\D/g, '') || '';
        return clientPhone === normalizedPhone;
      });
    } catch {
      return false;
    }
  },

  // Check if WhatsApp already exists
  checkWhatsAppExists: async (whatsapp: string, salonId: string, excludeClientId?: string): Promise<boolean> => {
    try {
      if (!whatsapp) return false;
      const clients = await api.get<Client[]>(`${BASE_PATH}/salon/${salonId}`);
      const normalizedWhatsApp = whatsapp.replace(/\D/g, ''); // Remove non-digits
      return clients.some(client => {
        if (excludeClientId && client.id === excludeClientId) return false;
        const clientWhatsApp = client.whatsapp?.replace(/\D/g, '') || '';
        return clientWhatsApp === normalizedWhatsApp;
      });
    } catch {
      return false;
    }
  },

  // Check if email already exists
  checkEmailExists: async (email: string, salonId: string, excludeClientId?: string): Promise<boolean> => {
    try {
      if (!email) return false;
      const clients = await api.get<Client[]>(`${BASE_PATH}/salon/${salonId}`);
      const normalizedEmail = email.toLowerCase().trim();
      return clients.some(client => {
        if (excludeClientId && client.id === excludeClientId) return false;
        const clientEmail = client.email?.toLowerCase().trim() || '';
        return clientEmail === normalizedEmail;
      });
    } catch {
      return false;
    }
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
