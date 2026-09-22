// Dashboard Service - API calls for the real (Pagamento-backed) dashboard metrics

import { api } from './api';
import type { DashboardData, RankingProfissional } from '@/types/salon/dashboard';

const BASE_PATH = '/dashboard';

export const dashboardService = {
  getDiario: (): Promise<DashboardData> => {
    return api.get<DashboardData>(`${BASE_PATH}/diario`);
  },

  getSemanal: (): Promise<DashboardData> => {
    return api.get<DashboardData>(`${BASE_PATH}/semanal`);
  },

  getMensal: (): Promise<DashboardData> => {
    return api.get<DashboardData>(`${BASE_PATH}/mensal`);
  },

  getPeriodo: (dataInicio: string, dataFim: string): Promise<DashboardData> => {
    return api.get<DashboardData>(`${BASE_PATH}/periodo`, { dataInicio, dataFim });
  },

  getRankingProfissionais: (periodo: "DIARIO" | "SEMANAL" | "MENSAL" = "MENSAL"): Promise<RankingProfissional[]> => {
    return api.get<RankingProfissional[]>(`${BASE_PATH}/ranking/profissionais`, { periodo });
  },
};
