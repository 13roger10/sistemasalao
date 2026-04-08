// Professional Service - API calls for professional management

import { api } from './api';
import type {
  Professional,
  ProfessionalCreateInput,
  ProfessionalUpdateInput,
  ProfessionalFilters,
  ProfessionalAvailability,
  ProfessionalPerformance,
  ProfessionalRanking,
  ProfessionalCategory,
  ProfessionalLevel,
  CategoryInfo,
  LevelInfo,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams, DateRange } from '@/types/salon/common';

// IMPORTANTE: O backend usa /profissionais (português), não /professionals
const BASE_PATH = '/profissionais';

// Interface para dados do backend
interface ProfissionalBackend {
  id: number;
  usuarioId: number;
  nome: string;
  email: string;
  telefone?: string;
  categoria?: ProfessionalCategory;
  categoriaDescricao?: string;
  nivel?: ProfessionalLevel;
  nivelDescricao?: string;
  especialidade?: string;
  especializacoes?: string;
  bio?: string;
  ativo: boolean;
  aceitaAgendamentoOnline: boolean;
  tipoComissao?: string;
  valorComissao?: number;
  servicos?: { id: number; nome: string; tipo: string }[];
  [key: string]: unknown;
}

// Mapeia dados do backend para o formato do frontend
function mapProfessional(data: ProfissionalBackend): Professional {
  return {
    id: String(data.id),
    userId: String(data.usuarioId),
    name: data.nome || '',
    email: data.email || '',
    phone: data.telefone || '',
    bio: data.bio || '',
    category: data.categoria,
    categoryDescription: data.categoriaDescricao,
    level: data.nivel,
    levelDescription: data.nivelDescricao,
    specialties: data.especialidade ? [data.especialidade] : [],
    specializations: data.especializacoes,
    status: data.ativo ? 'active' : 'inactive',
    acceptsOnlineBooking: data.aceitaAgendamentoOnline ?? true,
    // Campos de comissão
    commissionType: data.tipoComissao === 'VALOR_FIXO' ? 'fixed' : 'percentage',
    commissionValue: data.valorComissao || 0,
    // Serviços
    serviceIds: data.servicos?.map(s => String(s.id)) || [],
    // Defaults para campos não retornados pelo backend
    schedule: { days: [] },
    averageRating: 0,
    totalReviews: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    unitIds: [],
    primaryUnitId: '',
    showInPublicProfile: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export const professionalService = {
  // List professionals with pagination and filters
  // IMPORTANTE: Sempre requer salonId - a rota GET /profissionais não existe no backend
  list: (
    params: PaginationParams & ProfessionalFilters & { salonId?: string | number }
  ): Promise<PaginatedResponse<Professional>> => {
    // Sempre usa o endpoint /profissionais/salon/{salonId}
    const salonId = params.salonId || '1';

    // Converte status do frontend para ativo do backend
    const backendParams: Record<string, unknown> = {};
    if (params.status === 'active') {
      backendParams.ativo = true;
    } else if (params.status === 'inactive') {
      backendParams.ativo = false;
    }
    // Se status for vazio ou undefined, não envia ativo (retorna todos)

    return api.get<ProfissionalBackend[]>(`${BASE_PATH}/salon/${salonId}`, backendParams)
      .then((profissionais) => {
        const professionals = profissionais.map(mapProfessional);
        const page = params.page || 1;
        const limit = params.limit || 10;
        const totalPages = Math.ceil(professionals.length / limit);
        return {
          data: professionals,
          items: professionals,
          meta: {
            total: professionals.length,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };
      });
  },

  // Get all professionals (no pagination, for selects)
  // Usa /profissionais/salon/{salonId} pois não existe /profissionais/all no backend
  getAll: (params?: ProfessionalFilters & { salonId?: string | number }): Promise<Professional[]> => {
    const salonId = params?.salonId || '1';
    return api.get<ProfissionalBackend[]>(`${BASE_PATH}/salon/${salonId}`, params)
      .then((profissionais) => profissionais.map(mapProfessional));
  },

  // List professionals by services (for booking flow)
  // Usa /profissionais/servico/{servicoId}
  listByServices: (serviceIds: string[], unitId?: string): Promise<Professional[]> => {
    // Para múltiplos serviços, busca do primeiro (backend não suporta múltiplos)
    if (serviceIds.length > 0) {
      return api.get<ProfissionalBackend[]>(`${BASE_PATH}/servico/${serviceIds[0]}`)
        .then((profissionais) => profissionais.map(mapProfessional));
    }
    return Promise.resolve([]);
  },

  // Get single professional by ID
  getById: (id: string): Promise<Professional> => {
    return api.get<ProfissionalBackend>(`${BASE_PATH}/${id}`)
      .then(mapProfessional);
  },

  // Create new professional
  // Backend espera: usuarioId, categoria, nivel, especialidade, especializacoes, bio, aceitaAgendamentoOnline, servicoIds
  create: (data: ProfessionalCreateInput): Promise<Professional> => {
    const backendData = {
      usuarioId: data.userId ? Number(data.userId) : undefined,
      categoria: data.category,
      nivel: data.level,
      especialidade: data.specialties?.join(", ") || data.specialty || "",
      especializacoes: data.specializations || "",
      bio: data.bio || "",
      aceitaAgendamentoOnline: data.acceptsOnlineBooking ?? true,
      servicoIds: data.serviceIds?.map(id => Number(id)) || [],
    };
    return api.post<ProfissionalBackend>(BASE_PATH, backendData)
      .then(mapProfessional);
  },

  // Update existing professional
  // Backend usa PUT, não PATCH
  update: (id: string, data: ProfessionalUpdateInput): Promise<Professional> => {
    const backendData = {
      usuarioId: data.userId ? Number(data.userId) : undefined,
      categoria: data.category,
      nivel: data.level,
      especialidade: data.specialties?.join(", ") || data.specialty || "",
      especializacoes: data.specializations || "",
      bio: data.bio || "",
      aceitaAgendamentoOnline: data.acceptsOnlineBooking ?? true,
      servicoIds: data.serviceIds?.map(id => Number(id)) || [],
    };
    return api.put<ProfissionalBackend>(`${BASE_PATH}/${id}`, backendData)
      .then(mapProfessional);
  },

  // Delete professional (soft delete)
  delete: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/${id}`);
  },

  // Reactivate professional
  reactivate: (id: string): Promise<void> => {
    return api.put(`${BASE_PATH}/${id}/reativar`, {});
  },

  // Get professional availability for a date
  getAvailability: (
    id: string,
    date: Date,
    serviceIds: string[]
  ): Promise<ProfessionalAvailability> => {
    return api.get<ProfessionalAvailability>(`${BASE_PATH}/${id}/availability`, {
      date: date.toISOString(),
      serviceIds: serviceIds.join(','),
    });
  },

  // Update professional schedule
  updateSchedule: (
    id: string,
    schedule: Professional['schedule']
  ): Promise<Professional> => {
    return api.patch<Professional>(`${BASE_PATH}/${id}/schedule`, { schedule });
  },

  // Get professional performance metrics
  getPerformance: (
    id: string,
    dateRange: DateRange
  ): Promise<ProfessionalPerformance> => {
    return api.get<ProfessionalPerformance>(`${BASE_PATH}/${id}/performance`, {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    });
  },

  // Get professional ranking
  getRanking: (params: {
    metricType: 'revenue' | 'appointments' | 'rating';
    dateRange?: DateRange;
    unitId?: string;
    limit?: number;
  }): Promise<ProfessionalRanking[]> => {
    return api.get<ProfessionalRanking[]>(`${BASE_PATH}/ranking`, {
      ...params,
      startDate: params.dateRange?.startDate?.toISOString(),
      endDate: params.dateRange?.endDate?.toISOString(),
    });
  },

  // Update services offered by professional
  updateServices: (id: string, serviceIds: string[]): Promise<Professional> => {
    return api.patch<Professional>(`${BASE_PATH}/${id}/services`, { serviceIds });
  },

  // Update commission settings
  updateCommission: (
    id: string,
    data: { commissionType: 'percentage' | 'fixed'; commissionValue: number }
  ): Promise<Professional> => {
    return api.patch<Professional>(`${BASE_PATH}/${id}/commission`, data);
  },

  // Add break time
  addBreak: (
    id: string,
    date: Date,
    startTime: string,
    endTime: string,
    reason?: string
  ): Promise<void> => {
    return api.post(`${BASE_PATH}/${id}/breaks`, {
      date: date.toISOString(),
      startTime,
      endTime,
      reason,
    });
  },

  // Get breaks for a date range
  getBreaks: (
    id: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ date: Date; startTime: string; endTime: string; reason?: string }[]> => {
    return api.get(`${BASE_PATH}/${id}/breaks`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  },

  // Upload avatar
  uploadAvatar: (id: string, file: File): Promise<{ avatarUrl: string }> => {
    return api.upload(`${BASE_PATH}/${id}/avatar`, file);
  },

  // Get all available categories
  getCategories: (): Promise<CategoryInfo[]> => {
    return api.get<CategoryInfo[]>(`${BASE_PATH}/categorias`);
  },

  // Get all available levels
  getLevels: (): Promise<LevelInfo[]> => {
    return api.get<LevelInfo[]>(`${BASE_PATH}/niveis`);
  },

  // Get categories used in a salon
  getCategoriesBySalon: (salonId: string | number): Promise<CategoryInfo[]> => {
    return api.get<CategoryInfo[]>(`${BASE_PATH}/salon/${salonId}/categorias`);
  },

  // List professionals by category
  listByCategory: (
    salonId: string | number,
    category: ProfessionalCategory,
    ativo?: boolean
  ): Promise<Professional[]> => {
    const params: Record<string, unknown> = {};
    if (ativo !== undefined) {
      params.ativo = ativo;
    }
    return api.get<ProfissionalBackend[]>(
      `${BASE_PATH}/salon/${salonId}/categoria/${category}`,
      params
    ).then((profissionais) => profissionais.map(mapProfessional));
  },
};
