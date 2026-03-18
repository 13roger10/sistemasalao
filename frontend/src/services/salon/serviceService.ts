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

// IMPORTANTE: O backend usa /servicos (português), não /services
const BASE_PATH = '/servicos';
const PUBLIC_PATH = '/public/servicos';

// Mapeamento de categoria para TipoServico do backend
const categoryToTipoServico: Record<string, string> = {
  '1': 'CABELO',
  '2': 'BARBA',
  '3': 'ESTETICA',
  'Cabelo': 'CABELO',
  'Barba': 'BARBA',
  'Estética': 'ESTETICA',
  'Unha': 'UNHA',
  'Maquiagem': 'MAQUIAGEM',
  'Depilação': 'DEPILACAO',
  'Sobrancelha': 'SOBRANCELHA',
  'Massagem': 'MASSAGEM',
  'Outro': 'OUTRO',
};

// Mapeamento de TipoServico para categoryId
const tipoServicoToCategoryId: Record<string, string> = {
  'CABELO': '1',
  'BARBA': '2',
  'ESTETICA': '3',
  'UNHA': '4',
  'MAQUIAGEM': '5',
  'DEPILACAO': '6',
  'SOBRANCELHA': '7',
  'MASSAGEM': '8',
  'OUTRO': '9',
};

// Interface para resposta do backend
interface ServicoBackendResponse {
  id: number;
  nome: string;
  descricao?: string;
  preco: number;
  duracaoMinutos: number;
  tipo: string;
  tipoDescricao?: string;
  imagemUrl?: string;
  ativo: boolean;
  salonId?: number;
  criadoEm?: string;
}

// Função para mapear resposta do backend para o formato do frontend
const mapBackendToFrontend = (servico: ServicoBackendResponse): Service => {
  const categoryId = tipoServicoToCategoryId[servico.tipo] || '9';
  return {
    id: String(servico.id),
    name: servico.nome,
    description: servico.descricao || '',
    categoryId: categoryId,
    category: {
      id: categoryId,
      name: servico.tipoDescricao || servico.tipo,
      order: parseInt(categoryId),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    price: Number(servico.preco) || 0,
    durationMinutes: servico.duracaoMinutos || 0,
    commissionPercentage: 50, // default
    usesStock: false,
    loyaltyPointsEarned: 10, // default
    status: servico.ativo ? 'active' : 'inactive',
    showInOnlineBooking: true,
    requiresConfirmation: false,
    unitIds: [],
    totalBookings: 0,
    averageRating: 0,
    createdAt: servico.criadoEm ? new Date(servico.criadoEm) : new Date(),
    updatedAt: new Date(),
    image: servico.imagemUrl,
  };
};

export const serviceService = {
  // ===== PUBLIC/CLIENT ENDPOINTS =====

  // List services for public booking (no auth required)
  // Usa endpoint público do backend em português
  listPublic: (unitId?: string): Promise<Service[]> => {
    return api.get<Service[]>(PUBLIC_PATH, { unitId, salonId: unitId || '1' });
  },

  // List services for authenticated client
  listForClient: (unitId?: string): Promise<Service[]> => {
    // Tenta endpoint de cliente, fallback para público
    return api.get<Service[]>(`${BASE_PATH}/client`, { unitId })
      .catch(() => api.get<Service[]>(PUBLIC_PATH, { unitId, salonId: unitId || '1' }));
  },

  // ===== ADMIN/STAFF ENDPOINTS =====

  // List services with pagination and filters
  // IMPORTANTE: Backend usa /servicos/salon/{salonId}
  list: (
    params: PaginationParams & ServiceFilters & { salonId?: string | number }
  ): Promise<PaginatedResponse<Service>> => {
    const salonId = params.salonId || '1';
    return api.get<ServicoBackendResponse[]>(`${BASE_PATH}/salon/${salonId}`, params)
      .then((backendServices) => {
        const services = backendServices.map(mapBackendToFrontend);
        const page = params.page || 1;
        const limit = params.limit || 10;
        const totalPages = Math.ceil(services.length / limit);
        return {
          data: services,
          items: services,
          meta: {
            total: services.length,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };
      });
  },

  // Get all services (no pagination, for selects)
  getAll: (params?: ServiceFilters & { salonId?: string | number }): Promise<Service[]> => {
    const salonId = params?.salonId || '1';
    return api.get<ServicoBackendResponse[]>(`${BASE_PATH}/salon/${salonId}`, params)
      .then((backendServices) => backendServices.map(mapBackendToFrontend));
  },

  // Get single service by ID
  getById: (id: string): Promise<Service> => {
    return api.get<ServicoBackendResponse>(`${BASE_PATH}/${id}`)
      .then(mapBackendToFrontend);
  },

  // Create new service
  // Backend espera: nome, descricao, preco, duracaoMinutos, tipo
  create: (data: ServiceCreateInput): Promise<Service> => {
    const backendData = {
      nome: data.name,
      descricao: data.description || '',
      preco: data.price,
      duracaoMinutos: data.durationMinutes,
      tipo: categoryToTipoServico[data.categoryId || ''] || 'OUTRO',
    };
    return api.post<ServicoBackendResponse>(BASE_PATH, backendData)
      .then(mapBackendToFrontend);
  },

  // Update existing service
  // Backend usa PUT, não PATCH
  update: (id: string, data: ServiceUpdateInput): Promise<Service> => {
    const backendData = {
      nome: data.name,
      descricao: data.description || '',
      preco: data.price,
      duracaoMinutos: data.durationMinutes,
      tipo: categoryToTipoServico[data.categoryId || ''] || 'OUTRO',
    };
    return api.put<ServicoBackendResponse>(`${BASE_PATH}/${id}`, backendData)
      .then(mapBackendToFrontend);
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
