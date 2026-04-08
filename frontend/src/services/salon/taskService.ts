// Task Service - API calls for task management

import { api } from './api';
import type {
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskStatusInput,
  TaskFilters,
} from '@/types/salon/task';
import type { PaginatedResponse, PaginationParams } from '@/types/salon/common';

const BASE_PATH = '/tarefas';

export const taskService = {
  // List all tasks with pagination
  list: (params: PaginationParams & TaskFilters): Promise<PaginatedResponse<Task>> => {
    return api.get<PaginatedResponse<Task>>(BASE_PATH, params);
  },

  // Get task by ID
  getById: (id: string): Promise<Task> => {
    return api.get<Task>(`${BASE_PATH}/${id}`);
  },

  // Create new task
  create: (data: TaskCreateInput): Promise<Task> => {
    return api.post<Task>(BASE_PATH, data);
  },

  // Update task
  update: (id: string, data: TaskUpdateInput): Promise<Task> => {
    return api.put<Task>(`${BASE_PATH}/${id}`, data);
  },

  // Delete task
  delete: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/${id}`);
  },

  // Change task status
  changeStatus: (id: string, data: TaskStatusInput): Promise<Task> => {
    return api.patch<Task>(`${BASE_PATH}/${id}/status`, data);
  },

  // Mark task as completed
  complete: (id: string): Promise<Task> => {
    return api.patch<Task>(`${BASE_PATH}/${id}/concluir`);
  },

  // Get my tasks (assigned to current user)
  getMyTasks: (): Promise<Task[]> => {
    return api.get<Task[]>(`${BASE_PATH}/minhas`);
  },

  // Get today's tasks
  getTodayTasks: (): Promise<Task[]> => {
    return api.get<Task[]>(`${BASE_PATH}/hoje`);
  },

  // Get overdue tasks
  getOverdueTasks: (): Promise<Task[]> => {
    return api.get<Task[]>(`${BASE_PATH}/atrasadas`);
  },

  // Get tasks by status
  getByStatus: (status: string): Promise<Task[]> => {
    return api.get<Task[]>(`${BASE_PATH}/status/${status}`);
  },

  // Get available categories
  getCategories: (): Promise<string[]> => {
    return api.get<string[]>(`${BASE_PATH}/categorias`);
  },
};
