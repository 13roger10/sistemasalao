// Goal types for the salon system

import { ID, Timestamps } from './common';

export type GoalType = 'FATURAMENTO' | 'ATENDIMENTOS' | 'NOVOS_CLIENTES' | 'TICKET_MEDIO' | 'SERVICOS_TIPO';
export type GoalPeriod = 'DIARIO' | 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';

export interface Goal extends Timestamps {
  id: ID;
  nome: string;
  descricao?: string;
  tipo: GoalType;
  tipoDescricao: string;
  tipoUnidade: string;
  periodo: GoalPeriod;
  periodoDescricao: string;
  valorMeta: number;
  valorAtual: number;
  percentualProgresso: number;
  dataInicio: string;
  dataFim: string;
  salonId: ID;
  profissionalId?: ID;
  profissionalNome?: string;
  criadoPorId: ID;
  criadoPorNome: string;
  notificarProgresso: boolean;
  notificarAoAtingir: number;
  atingida: boolean;
  dentroDoPeriodo: boolean;
}

export interface GoalCreateInput {
  nome: string;
  descricao?: string;
  tipo: GoalType;
  periodo: GoalPeriod;
  valorMeta: number;
  dataInicio: string;
  dataFim: string;
  profissionalId?: ID;
  notificarProgresso?: boolean;
  notificarAoAtingir?: number;
}

export interface GoalUpdateInput extends GoalCreateInput {}

export interface GoalHistory {
  id: ID;
  metaId: ID;
  dataRegistro: string;
  valorAnterior: number;
  valorNovo: number;
  variacao: number;
  percentualProgresso: number;
  criadoEm: string;
}

export interface GoalDashboard {
  totalMetas: number;
  metasAtingidas: number;
  metasEmAndamento: number;
  percentualGeralProgresso: number;
  metasAtuais: Goal[];
  resumoPorTipo: GoalTypeSummary[];
}

export interface GoalTypeSummary {
  tipo: GoalType;
  tipoDescricao: string;
  quantidade: number;
  atingidas: number;
  percentualMedio: number;
}

export const GoalTypeLabels: Record<GoalType, string> = {
  FATURAMENTO: 'Faturamento',
  ATENDIMENTOS: 'Atendimentos',
  NOVOS_CLIENTES: 'Novos Clientes',
  TICKET_MEDIO: 'Ticket Médio',
  SERVICOS_TIPO: 'Serviços por Tipo',
};

export const GoalTypeUnits: Record<GoalType, string> = {
  FATURAMENTO: 'R$',
  ATENDIMENTOS: 'un',
  NOVOS_CLIENTES: 'un',
  TICKET_MEDIO: 'R$',
  SERVICOS_TIPO: 'un',
};

export const GoalPeriodLabels: Record<GoalPeriod, string> = {
  DIARIO: 'Diário',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  ANUAL: 'Anual',
};

export const GoalTypeColors: Record<GoalType, { bg: string; text: string }> = {
  FATURAMENTO: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  ATENDIMENTOS: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  NOVOS_CLIENTES: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  TICKET_MEDIO: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  SERVICOS_TIPO: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' },
};
