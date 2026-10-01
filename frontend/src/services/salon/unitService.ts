// Unit Service - unidades do administrador (backend: UnidadeController, /api/salon/units).
// Cada unidade é um salão independente (equipe, serviços, clientes, agenda e caixa próprios);
// para trocar de unidade, entrarNaUnidade (lib/session-refresh).

import { api } from './api';

const BASE_PATH = '/salon/units';

export interface Unidade {
  id: number;
  nome: string;
  telefone?: string | null;
  cnpj?: string | null;
  descricao?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  ativo: boolean;
  /** Primeira unidade criada */
  sede: boolean;
  /** Unidade em que o admin está trabalhando agora */
  atual: boolean;
  totalProfissionais: number;
  totalClientes: number;
  totalServicos: number;
  /** Últimos 30 dias */
  faturamentoMes: number;
  criadoEm?: string;
}

export interface UnidadeInput {
  nome: string;
  telefone?: string;
  cnpj?: string;
  descricao?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export const unitService = {
  list: (): Promise<Unidade[]> => api.get<Unidade[]>(BASE_PATH),

  create: (data: UnidadeInput): Promise<Unidade> => api.post<Unidade>(BASE_PATH, data),

  update: (id: number, data: UnidadeInput): Promise<Unidade> => api.put<Unidade>(`${BASE_PATH}/${id}`, data),

  activate: (id: number): Promise<Unidade> => api.post<Unidade>(`${BASE_PATH}/${id}/ativar`),

  deactivate: (id: number): Promise<Unidade> => api.post<Unidade>(`${BASE_PATH}/${id}/desativar`),
};
