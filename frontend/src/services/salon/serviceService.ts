// Service Service - API calls for salon services management

import { api } from './api';
import type {
  Service,
  ServiceCreateInput,
  ServiceUpdateInput,
  ServiceFilters,
  ServiceCategory,
  CategoryCreateInput,
  ServiceCombo,
  ServiceComboCreateInput,
  ServiceStats,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams } from '@/types/salon/common';

const BASE_PATH = '/salon/services';

export const serviceService = {
  // ===== PUBLIC/CLIENT ENDPOINTS =====

  // List services for public booking (no auth required)
  listPublic: (unitId?: string): Promise<Service[]> => {
    return api.get<Service[]>(`${BASE_PATH}/public`, { unitId });
  },

  // List services for authenticated client
  listForClient: (unitId?: string): Promise<Service[]> => {
    return api.get<Service[]>(`${BASE_PATH}/client`, { unitId });
  },

  // ===== ADMIN/STAFF ENDPOINTS =====

  // List services with pagination and filters
  list: (
    params: PaginationParams & ServiceFilters
  ): Promise<PaginatedResponse<Service>> => {
    return api.get<PaginatedResponse<Service>>(BASE_PATH, params);
  },

  // Get all services (no pagination, for selects)
  getAll: (params?: ServiceFilters): Promise<Service[]> => {
    return api.get<Service[]>(`${BASE_PATH}/all`, params);
  },

  // Get single service by ID
  getById: (id: string): Promise<Service> => {
    return api.get<Service>(`${BASE_PATH}/${id}`);
  },

  // Create new service
  create: (data: ServiceCreateInput): Promise<Service> => {
    return api.post<Service>(BASE_PATH, data);
  },

  // Update existing service
  update: (id: string, data: ServiceUpdateInput): Promise<Service> => {
    return api.patch<Service>(`${BASE_PATH}/${id}`, data);
  },

  // Delete service (soft delete)
  delete: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/${id}`);
  },

  // Get service statistics
  getStats: (unitId?: string): Promise<ServiceStats> => {
    return api.get<ServiceStats>(`${BASE_PATH}/stats`, { unitId });
  },

  // Update service price
  updatePrice: (
    id: string,
    price: number,
    promotionalPrice?: number,
    validUntil?: Date
  ): Promise<Service> => {
    return api.patch<Service>(`${BASE_PATH}/${id}/price`, {
      price,
      promotionalPrice,
      promotionalPriceValidUntil: validUntil?.toISOString(),
    });
  },

  // Link products to service (for stock deduction)
  linkProducts: (
    id: string,
    products: { productId: string; quantity: number }[]
  ): Promise<Service> => {
    return api.patch<Service>(`${BASE_PATH}/${id}/products`, { products });
  },

  // Upload service image
  uploadImage: (id: string, file: File): Promise<{ imageUrl: string }> => {
    return api.upload(`${BASE_PATH}/${id}/image`, file);
  },

  // Categories
  categories: {
    list: (unitId?: string): Promise<ServiceCategory[]> => {
      return api.get<ServiceCategory[]>(`${BASE_PATH}/categories`, { unitId });
    },

    getById: (id: string): Promise<ServiceCategory> => {
      return api.get<ServiceCategory>(`${BASE_PATH}/categories/${id}`);
    },

    create: (data: CategoryCreateInput): Promise<ServiceCategory> => {
      return api.post<ServiceCategory>(`${BASE_PATH}/categories`, data);
    },

    update: (
      id: string,
      data: Partial<CategoryCreateInput>
    ): Promise<ServiceCategory> => {
      return api.patch<ServiceCategory>(`${BASE_PATH}/categories/${id}`, data);
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/categories/${id}`);
    },

    reorder: (orderedIds: string[]): Promise<void> => {
      return api.post(`${BASE_PATH}/categories/reorder`, { orderedIds });
    },
  },

  // Service Combos
  combos: {
    list: (params?: { unitId?: string; status?: string }): Promise<ServiceCombo[]> => {
      return api.get<ServiceCombo[]>(`${BASE_PATH}/combos`, params);
    },

    getById: (id: string): Promise<ServiceCombo> => {
      return api.get<ServiceCombo>(`${BASE_PATH}/combos/${id}`);
    },

    create: (data: ServiceComboCreateInput): Promise<ServiceCombo> => {
      return api.post<ServiceCombo>(`${BASE_PATH}/combos`, data);
    },

    update: (
      id: string,
      data: Partial<ServiceComboCreateInput>
    ): Promise<ServiceCombo> => {
      return api.patch<ServiceCombo>(`${BASE_PATH}/combos/${id}`, data);
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/combos/${id}`);
    },
  },

  // Get popular services
  getPopular: (params: {
    limit?: number;
    unitId?: string;
    period?: 'week' | 'month' | 'year';
  }): Promise<{ serviceId: string; serviceName: string; bookings: number }[]> => {
    return api.get(`${BASE_PATH}/popular`, params);
  },

  // Duplicate service
  duplicate: (id: string): Promise<Service> => {
    return api.post<Service>(`${BASE_PATH}/${id}/duplicate`);
  },

  // Bulk update status
  bulkUpdateStatus: (ids: string[], status: 'active' | 'inactive'): Promise<void> => {
    return api.post(`${BASE_PATH}/bulk/status`, { ids, status });
  },
};
