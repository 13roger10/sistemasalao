// Unit Service - API calls for multi-unit management

import { api } from './api';
import type {
  Unit,
  UnitCreateInput,
  UnitUpdateInput,
  UnitFilters,
  UnitSettings,
  UnitComparison,
  UnitDashboard,
  UnitReport,
  UnitStats,
  UnitTransfer,
} from '@/types/salon/unit';
import type { PaginatedResponse, PaginationParams, DateRange } from '@/types/salon/common';

const BASE_PATH = '/salon/units';

export const unitService = {
  // ===== CRUD Operations =====
  list: (
    params?: PaginationParams & UnitFilters
  ): Promise<PaginatedResponse<Unit>> => {
    return api.get<PaginatedResponse<Unit>>(BASE_PATH, params);
  },

  getAll: (params?: UnitFilters): Promise<Unit[]> => {
    return api.get<Unit[]>(`${BASE_PATH}/all`, params);
  },

  getById: (id: string): Promise<Unit> => {
    return api.get<Unit>(`${BASE_PATH}/${id}`);
  },

  create: (data: UnitCreateInput): Promise<Unit> => {
    return api.post<Unit>(BASE_PATH, data);
  },

  update: (id: string, data: UnitUpdateInput): Promise<Unit> => {
    return api.patch<Unit>(`${BASE_PATH}/${id}`, data);
  },

  delete: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/${id}`);
  },

  // ===== Status Management =====
  activate: (id: string): Promise<Unit> => {
    return api.post<Unit>(`${BASE_PATH}/${id}/activate`);
  },

  deactivate: (id: string): Promise<Unit> => {
    return api.post<Unit>(`${BASE_PATH}/${id}/deactivate`);
  },

  setAsHeadquarters: (id: string): Promise<Unit> => {
    return api.post<Unit>(`${BASE_PATH}/${id}/set-headquarters`);
  },

  // ===== Settings =====
  settings: {
    get: (unitId: string): Promise<UnitSettings> => {
      return api.get<UnitSettings>(`${BASE_PATH}/${unitId}/settings`);
    },

    update: (unitId: string, data: Partial<UnitSettings>): Promise<UnitSettings> => {
      return api.patch<UnitSettings>(`${BASE_PATH}/${unitId}/settings`, data);
    },
  },

  // ===== Schedule =====
  schedule: {
    get: (unitId: string): Promise<Unit['schedule']> => {
      return api.get(`${BASE_PATH}/${unitId}/schedule`);
    },

    update: (unitId: string, schedule: Unit['schedule']): Promise<Unit> => {
      return api.patch<Unit>(`${BASE_PATH}/${unitId}/schedule`, { schedule });
    },

    addHoliday: (unitId: string, holiday: {
      date: Date;
      name: string;
      isOpen: boolean;
    }): Promise<Unit> => {
      return api.post<Unit>(`${BASE_PATH}/${unitId}/holidays`, {
        ...holiday,
        date: holiday.date.toISOString(),
      });
    },

    removeHoliday: (unitId: string, date: Date): Promise<Unit> => {
      return api.delete(`${BASE_PATH}/${unitId}/holidays/${date.toISOString()}`);
    },
  },

  // ===== Dashboard =====
  getDashboard: (unitId: string, date?: Date): Promise<UnitDashboard> => {
    return api.get<UnitDashboard>(`${BASE_PATH}/${unitId}/dashboard`, {
      date: date?.toISOString(),
    });
  },

  // ===== Comparison =====
  compare: (
    unitIds: string[],
    dateRange: DateRange
  ): Promise<UnitComparison> => {
    return api.post<UnitComparison>(`${BASE_PATH}/compare`, {
      unitIds,
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    });
  },

  // ===== Reports =====
  reports: {
    getReport: (
      unitId: string,
      dateRange: DateRange
    ): Promise<UnitReport> => {
      return api.get<UnitReport>(`${BASE_PATH}/${unitId}/report`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      });
    },

    getConsolidated: (
      unitIds: string[],
      dateRange: DateRange
    ): Promise<UnitReport> => {
      return api.post<UnitReport>(`${BASE_PATH}/reports/consolidated`, {
        unitIds,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      });
    },

    export: (
      unitId: string,
      dateRange: DateRange,
      format: 'pdf' | 'xlsx'
    ): Promise<Blob> => {
      return api.get<Blob>(`${BASE_PATH}/${unitId}/report/export`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format,
      });
    },
  },

  // ===== Stats =====
  getStats: (): Promise<UnitStats> => {
    return api.get<UnitStats>(`${BASE_PATH}/stats`);
  },

  // ===== Transfers =====
  transfers: {
    list: (
      params: PaginationParams & {
        type?: 'stock' | 'professional' | 'client';
        status?: UnitTransfer['status'];
        fromUnitId?: string;
        toUnitId?: string;
      }
    ): Promise<PaginatedResponse<UnitTransfer>> => {
      return api.get<PaginatedResponse<UnitTransfer>>(`${BASE_PATH}/transfers`, params);
    },

    getById: (id: string): Promise<UnitTransfer> => {
      return api.get<UnitTransfer>(`${BASE_PATH}/transfers/${id}`);
    },

    // Stock transfer
    requestStockTransfer: (data: {
      fromUnitId: string;
      toUnitId: string;
      productId: string;
      quantity: number;
      notes?: string;
    }): Promise<UnitTransfer> => {
      return api.post<UnitTransfer>(`${BASE_PATH}/transfers/stock`, data);
    },

    // Professional transfer
    requestProfessionalTransfer: (data: {
      fromUnitId: string;
      toUnitId: string;
      professionalId: string;
      notes?: string;
    }): Promise<UnitTransfer> => {
      return api.post<UnitTransfer>(`${BASE_PATH}/transfers/professional`, data);
    },

    // Client transfer
    requestClientTransfer: (data: {
      fromUnitId: string;
      toUnitId: string;
      clientId: string;
      notes?: string;
    }): Promise<UnitTransfer> => {
      return api.post<UnitTransfer>(`${BASE_PATH}/transfers/client`, data);
    },

    // Approve/reject
    approve: (id: string): Promise<UnitTransfer> => {
      return api.post<UnitTransfer>(`${BASE_PATH}/transfers/${id}/approve`);
    },

    reject: (id: string, reason?: string): Promise<UnitTransfer> => {
      return api.post<UnitTransfer>(`${BASE_PATH}/transfers/${id}/reject`, { reason });
    },

    complete: (id: string): Promise<UnitTransfer> => {
      return api.post<UnitTransfer>(`${BASE_PATH}/transfers/${id}/complete`);
    },
  },

  // ===== Professionals per Unit =====
  professionals: {
    list: (unitId: string): Promise<{
      professionalId: string;
      professionalName: string;
      avatar?: string;
      specialties: string[];
      isActive: boolean;
    }[]> => {
      return api.get(`${BASE_PATH}/${unitId}/professionals`);
    },

    assign: (unitId: string, professionalId: string): Promise<void> => {
      return api.post(`${BASE_PATH}/${unitId}/professionals/${professionalId}`);
    },

    remove: (unitId: string, professionalId: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/${unitId}/professionals/${professionalId}`);
    },
  },

  // ===== Services per Unit =====
  services: {
    list: (unitId: string): Promise<{
      serviceId: string;
      serviceName: string;
      price: number;
      duration: number;
      isActive: boolean;
    }[]> => {
      return api.get(`${BASE_PATH}/${unitId}/services`);
    },

    updatePrice: (
      unitId: string,
      serviceId: string,
      price: number
    ): Promise<void> => {
      return api.patch(`${BASE_PATH}/${unitId}/services/${serviceId}`, { price });
    },

    toggleActive: (unitId: string, serviceId: string): Promise<void> => {
      return api.post(`${BASE_PATH}/${unitId}/services/${serviceId}/toggle`);
    },
  },

  // ===== User Access per Unit =====
  access: {
    // Get users with access to a unit
    getUsers: (unitId: string): Promise<{
      userId: string;
      userName: string;
      email: string;
      role: string;
      addedAt: Date;
    }[]> => {
      return api.get(`${BASE_PATH}/${unitId}/access`);
    },

    // Grant user access to unit
    grant: (unitId: string, userId: string): Promise<void> => {
      return api.post(`${BASE_PATH}/${unitId}/access/${userId}`);
    },

    // Revoke user access from unit
    revoke: (unitId: string, userId: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/${unitId}/access/${userId}`);
    },

    // Get units a user has access to
    getUserUnits: (userId: string): Promise<Unit[]> => {
      return api.get<Unit[]>(`${BASE_PATH}/user/${userId}/units`);
    },
  },
};
