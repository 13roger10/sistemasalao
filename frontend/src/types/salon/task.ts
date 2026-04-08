// Task types for the salon system

import { ID, Timestamps } from './common';

export type TaskStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
export type TaskPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type TaskRecurrence = 'NENHUMA' | 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL';

export interface Task extends Timestamps {
  id: ID;
  titulo: string;
  descricao?: string;
  status: TaskStatus;
  statusDescricao: string;
  prioridade: TaskPriority;
  prioridadeDescricao: string;
  recorrencia: TaskRecurrence;
  recorrenciaDescricao: string;
  salonId: ID;
  criadoPorId: ID;
  criadoPorNome: string;
  atribuidoAId?: ID;
  atribuidoANome?: string;
  dataPrevista: string; // ISO date
  horaPrevista?: string; // HH:mm
  dataInicio?: string;
  dataConclusao?: string;
  observacoes?: string;
  categoria?: string;
  local?: string;
  tempoEstimadoMinutos: number;
  tempoRealMinutos?: number;
  atrasada: boolean;
}

export interface TaskCreateInput {
  titulo: string;
  descricao?: string;
  prioridade?: TaskPriority;
  recorrencia?: TaskRecurrence;
  atribuidoAId?: ID;
  dataPrevista: string;
  horaPrevista?: string;
  observacoes?: string;
  categoria?: string;
  local?: string;
  tempoEstimadoMinutos?: number;
}

export interface TaskUpdateInput extends TaskCreateInput {}

export interface TaskStatusInput {
  status: TaskStatus;
  observacao?: string;
  tempoRealMinutos?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  prioridade?: TaskPriority;
  atribuidoAId?: ID;
  categoria?: string;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
}

export interface TaskStats {
  pendentes: number;
  emAndamento: number;
  concluidas: number;
  atrasadas: number;
}

export const TaskStatusLabels: Record<TaskStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export const TaskPriorityLabels: Record<TaskPriority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const TaskRecurrenceLabels: Record<TaskRecurrence, string> = {
  NENHUMA: 'Sem recorrência',
  DIARIA: 'Diária',
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
};

export const TaskPriorityColors: Record<TaskPriority, { bg: string; text: string }> = {
  BAIXA: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  MEDIA: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  ALTA: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  URGENTE: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
};

export const TaskStatusColors: Record<TaskStatus, { bg: string; text: string }> = {
  PENDENTE: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  EM_ANDAMENTO: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  CONCLUIDA: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  CANCELADA: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
};
