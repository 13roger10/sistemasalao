// Programa de fidelidade do salão — /api/fidelidade (BUG-012: a tela usava dados fictícios)

import { api } from './api';

export type NivelFidelidade = 'BRONZE' | 'PRATA' | 'OURO';
export type TipoRecompensa = 'SERVICO_GRATIS' | 'DESCONTO_PERCENTUAL' | 'DESCONTO_VALOR';

export interface FidelidadePrograma {
  id: number;
  nome: string;
  descricao?: string;
  visitasNecessarias: number;
  recompensaTipo: TipoRecompensa;
  recompensaValor?: number;
  recompensaValorFormatado?: string;
  servicoRecompensaNome?: string;
  ativo: boolean;
}

export interface FidelidadeProgramaInput {
  nome: string;
  descricao?: string;
  visitasNecessarias: number;
  recompensaTipo: TipoRecompensa;
  recompensaValor?: number;
}

export interface FidelidadeCliente {
  id: number;
  clienteId: number;
  clienteNome: string;
  clienteEmail?: string;
  programaId: number;
  programaNome: string;
  visitasAtuais: number;
  visitasNecessarias: number;
  totalVisitas: number;
  totalResgates: number;
  creditosDisponiveis: number;
  nivel: NivelFidelidade;
  pontosNivel: number;
  pontosParaProximoNivel: number;
  proximoNivel?: NivelFidelidade;
  criadoEm: string;
}

export interface FidelidadeResumo {
  totalClientesInscritos: number;
  totalClientesBronze: number;
  totalClientesPrata: number;
  totalClientesOuro: number;
  totalCreditosDisponiveis: number;
  totalResgatesRealizados: number;
  totalVisitasRegistradas: number;
}

const BASE = '/fidelidade';

export const fidelidadeService = {
  listarProgramas: () => api.get<FidelidadePrograma[]>(`${BASE}/programas`),
  criarPrograma: (data: FidelidadeProgramaInput) => api.post<FidelidadePrograma>(`${BASE}/programas`, data),
  atualizarPrograma: (id: number, data: FidelidadeProgramaInput) =>
    api.put<FidelidadePrograma>(`${BASE}/programas/${id}`, data),
  desativarPrograma: (id: number) => api.delete<void>(`${BASE}/programas/${id}`),

  listarClientes: async (): Promise<FidelidadeCliente[]> => {
    const page = await api.get<{ content: FidelidadeCliente[] }>(`${BASE}/clientes`, { size: 500 });
    return page.content ?? [];
  },
  resumo: () => api.get<FidelidadeResumo>(`${BASE}/resumo`),

  adicionarBonus: (fidelidadeClienteId: number, creditos: number, descricao?: string) => {
    const params = new URLSearchParams({ creditos: String(creditos) });
    if (descricao) params.set('descricao', descricao);
    return api.post<unknown>(`${BASE}/bonus/${fidelidadeClienteId}?${params.toString()}`);
  },
};
