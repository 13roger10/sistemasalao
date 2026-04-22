// Commission Service - API calls for commission management

import { api } from './api';
import type {
  Commission,
  CommissionFilters,
  CommissionPayment,
  CommissionPaymentInput,
  ProfessionalCommissionSummary,
  CommissionStats,
  CommissionRule,
  CommissionRuleCreateInput,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams, DateRange } from '@/types/salon/common';

const BASE_PATH = '/salon/commissions';

// Mapeia response do backend Java (/api/comissoes) para o tipo Commission do frontend
const mapComissaoToFrontend = (c: Record<string, unknown>): Commission => ({
  id: String(c.id),
  professionalId: String(c.profissionalId),
  professionalName: (c.profissionalNome as string) || '',
  appointmentId: String(c.agendamentoId),
  serviceId: c.servicoId ? String(c.servicoId) : '',
  serviceName: (c.servicoNome as string) || '',
  clientId: c.clienteId ? String(c.clienteId) : '',
  clientName: (c.clienteNome as string) || '',
  servicePrice: Number(c.valorServico) || 0,
  commissionType: (c.tipoComissao as string) === 'PORCENTAGEM' ? 'percentage' : 'fixed',
  commissionRate: Number(c.taxaComissao) || 0,
  commissionValue: Number(c.valorComissao) || 0,
  status: (c.status as string) === 'PAGA' ? 'paid' : (c.status as string) === 'CANCELADA' ? 'canceled' : 'pending',
  appointmentDate: c.dataAgendamento ? new Date(c.dataAgendamento as string) : new Date(),
  unitId: String(c.salonId),
  createdAt: c.criadoEm ? new Date(c.criadoEm as string) : new Date(),
  updatedAt: c.criadoEm ? new Date(c.criadoEm as string) : new Date(),
});

export const commissionService = {
  // Commissions
  list: (
    params: PaginationParams & CommissionFilters
  ): Promise<PaginatedResponse<Commission>> => {
    return api.get<PaginatedResponse<Commission>>(BASE_PATH, {
      ...params,
      startDate: params.dateRange?.startDate?.toISOString(),
      endDate: params.dateRange?.endDate?.toISOString(),
    });
  },

  getById: (id: string): Promise<Commission> => {
    return api.get<Commission>(`${BASE_PATH}/${id}`);
  },

  // Get commissions for a specific professional
  getByProfessional: (
    professionalId: string,
    params: PaginationParams & Omit<CommissionFilters, 'professionalId'>
  ): Promise<PaginatedResponse<Commission>> => {
    return api.get<PaginatedResponse<Commission>>(
      `${BASE_PATH}/professional/${professionalId}`,
      {
        ...params,
        startDate: params.dateRange?.startDate?.toISOString(),
        endDate: params.dateRange?.endDate?.toISOString(),
      }
    );
  },

  // Mark commission as paid
  markAsPaid: (id: string): Promise<Commission> => {
    return api.post<Commission>(`${BASE_PATH}/${id}/pay`);
  },

  // Mark multiple commissions as paid
  markMultipleAsPaid: (ids: string[]): Promise<Commission[]> => {
    return api.post<Commission[]>(`${BASE_PATH}/pay-multiple`, { ids });
  },

  // Cancel commission
  cancel: (id: string, reason?: string): Promise<Commission> => {
    return api.post<Commission>(`${BASE_PATH}/${id}/cancel`, { reason });
  },

  // Payments
  payments: {
    list: (
      params: PaginationParams & { professionalId?: string; dateRange?: DateRange }
    ): Promise<PaginatedResponse<CommissionPayment>> => {
      return api.get<PaginatedResponse<CommissionPayment>>(`${BASE_PATH}/payments`, {
        ...params,
        startDate: params.dateRange?.startDate?.toISOString(),
        endDate: params.dateRange?.endDate?.toISOString(),
      });
    },

    getById: (id: string): Promise<CommissionPayment> => {
      return api.get<CommissionPayment>(`${BASE_PATH}/payments/${id}`);
    },

    create: (data: CommissionPaymentInput): Promise<CommissionPayment> => {
      return api.post<CommissionPayment>(`${BASE_PATH}/payments`, {
        ...data,
        periodStart: data.periodStart.toISOString(),
        periodEnd: data.periodEnd.toISOString(),
      });
    },

    // Get payment preview (calculate totals before confirming)
    preview: (data: Omit<CommissionPaymentInput, 'paymentMethod'>): Promise<{
      totalServices: number;
      totalCommission: number;
      deductions: number;
      bonuses: number;
      netAmount: number;
      commissions: Commission[];
    }> => {
      return api.post(`${BASE_PATH}/payments/preview`, {
        ...data,
        periodStart: data.periodStart.toISOString(),
        periodEnd: data.periodEnd.toISOString(),
      });
    },
  },

  // Summaries
  getSummary: (
    professionalId: string,
    dateRange: DateRange
  ): Promise<ProfessionalCommissionSummary> => {
    return api.get<ProfessionalCommissionSummary>(
      `${BASE_PATH}/summary/${professionalId}`,
      {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      }
    );
  },

  // Get summary for all professionals
  getAllSummaries: (
    dateRange: DateRange,
    unitId?: string
  ): Promise<ProfessionalCommissionSummary[]> => {
    return api.get<ProfessionalCommissionSummary[]>(`${BASE_PATH}/summary`, {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      unitId,
    });
  },

  // Stats
  getStats: (unitId?: string): Promise<CommissionStats> => {
    return api.get<CommissionStats>(`${BASE_PATH}/stats`, { unitId });
  },

  // Commission Rules
  rules: {
    list: (unitId?: string): Promise<CommissionRule[]> => {
      return api.get<CommissionRule[]>(`${BASE_PATH}/rules`, { unitId });
    },

    getById: (id: string): Promise<CommissionRule> => {
      return api.get<CommissionRule>(`${BASE_PATH}/rules/${id}`);
    },

    create: (data: CommissionRuleCreateInput): Promise<CommissionRule> => {
      return api.post<CommissionRule>(`${BASE_PATH}/rules`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    update: (
      id: string,
      data: Partial<CommissionRuleCreateInput>
    ): Promise<CommissionRule> => {
      return api.patch<CommissionRule>(`${BASE_PATH}/rules/${id}`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/rules/${id}`);
    },

    toggleActive: (id: string): Promise<CommissionRule> => {
      return api.post<CommissionRule>(`${BASE_PATH}/rules/${id}/toggle`);
    },
  },

  // Reports
  reports: {
    // Get commission report by period
    byPeriod: (
      dateRange: DateRange,
      groupBy: 'day' | 'week' | 'month',
      unitId?: string
    ): Promise<{
      period: string;
      totalCommission: number;
      paidCommission: number;
      pendingCommission: number;
      count: number;
    }[]> => {
      return api.get(`${BASE_PATH}/reports/period`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        groupBy,
        unitId,
      });
    },

    // Get commission report by professional
    byProfessional: (
      dateRange: DateRange,
      unitId?: string
    ): Promise<{
      professionalId: string;
      professionalName: string;
      totalServices: number;
      totalRevenue: number;
      totalCommission: number;
      paidCommission: number;
      pendingCommission: number;
    }[]> => {
      return api.get(`${BASE_PATH}/reports/professional`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Export report
    export: (
      dateRange: DateRange,
      format: 'pdf' | 'xlsx',
      unitId?: string
    ): Promise<Blob> => {
      return api.get<Blob>(`${BASE_PATH}/reports/export`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format,
        unitId,
      });
    },
  },

  // === ENDPOINTS DIRETOS DO BACKEND JAVA (/api/comissoes) ===

  // GET /api/comissoes/profissional/{id} — isolamento garantido no backend
  listByProfessional: async (
    professionalId: string,
    params: { page?: number; size?: number } = {}
  ): Promise<PaginatedResponse<Commission>> => {
    const response = await api.get<{ content: Record<string, unknown>[], totalElements: number, totalPages: number, number: number }>(
      `/comissoes/profissional/${professionalId}`,
      { page: (params.page || 1) - 1, size: params.size || 100 }
    );
    const commissions = (response.content || []).map(mapComissaoToFrontend);
    return {
      data: commissions,
      items: commissions,
      meta: { total: response.totalElements || commissions.length, page: (response.number || 0) + 1, limit: params.size || 100, totalPages: response.totalPages || 1, hasNextPage: false, hasPrevPage: false },
    };
  },

  // GET /api/comissoes/salon/{id} — listagem geral para ADMIN/RECEPCIONIST
  listBySalon: async (
    salonId: string,
    params: { page?: number; size?: number } = {}
  ): Promise<PaginatedResponse<Commission>> => {
    const response = await api.get<{ content: Record<string, unknown>[], totalElements: number, totalPages: number, number: number }>(
      `/comissoes/salon/${salonId}`,
      { page: (params.page || 1) - 1, size: params.size || 100 }
    );
    const commissions = (response.content || []).map(mapComissaoToFrontend);
    return {
      data: commissions,
      items: commissions,
      meta: { total: response.totalElements || commissions.length, page: (response.number || 0) + 1, limit: params.size || 100, totalPages: response.totalPages || 1, hasNextPage: false, hasPrevPage: false },
    };
  },

  // Calculate commission for a service
  calculate: (
    professionalId: string,
    serviceId: string,
    servicePrice: number
  ): Promise<{
    commissionType: 'percentage' | 'fixed';
    commissionRate: number;
    commissionValue: number;
    appliedRule?: CommissionRule;
  }> => {
    return api.post(`${BASE_PATH}/calculate`, {
      professionalId,
      serviceId,
      servicePrice,
    });
  },
};
