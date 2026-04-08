// Goal Service - API calls for goal management

import { api } from './api';
import type {
  Goal,
  GoalCreateInput,
  GoalUpdateInput,
  GoalHistory,
  GoalDashboard,
} from '@/types/salon/goal';
import type { PaginatedResponse, PaginationParams } from '@/types/salon/common';

const BASE_PATH = '/metas';

export const goalService = {
  // List all goals with pagination
  list: (params: PaginationParams): Promise<PaginatedResponse<Goal>> => {
    return api.get<PaginatedResponse<Goal>>(BASE_PATH, params);
  },

  // Get goal by ID
  getById: (id: string): Promise<Goal> => {
    return api.get<Goal>(`${BASE_PATH}/${id}`);
  },

  // Create new goal
  create: (data: GoalCreateInput): Promise<Goal> => {
    return api.post<Goal>(BASE_PATH, data);
  },

  // Update goal
  update: (id: string, data: GoalUpdateInput): Promise<Goal> => {
    return api.put<Goal>(`${BASE_PATH}/${id}`, data);
  },

  // Delete goal
  delete: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/${id}`);
  },

  // Get dashboard
  getDashboard: (): Promise<GoalDashboard> => {
    return api.get<GoalDashboard>(`${BASE_PATH}/dashboard`);
  },

  // Get goal history
  getHistory: (id: string): Promise<GoalHistory[]> => {
    return api.get<GoalHistory[]>(`${BASE_PATH}/${id}/historico`);
  },
};
