// Profissionais e recepcionistas em várias unidades (backend: EquipeUnidadeController).
// Para trocar de unidade: entrarNaUnidade (lib/session-refresh).

import { api } from './api';

const BASE_PATH = '/equipe/unidades';

export interface UnidadeDoMembro {
  id: number;
  nome: string;
  vinculado: boolean;
  atual: boolean;
}

export const equipeUnidadesService = {
  /** Unidades do profissional/recepcionista logado (atual = a da sessão) */
  minhas: (): Promise<{ id: number; nome: string; atual: boolean }[]> => api.get(`${BASE_PATH}/minhas`),

  /** Admin: unidades do estabelecimento e se o membro da equipe está vinculado */
  doMembro: (userId: string): Promise<UnidadeDoMembro[]> =>
    api.get<UnidadeDoMembro[]>(`${BASE_PATH}/membros/${userId}`),

  /** Admin: define as unidades do membro (a atual do admin continua sempre) */
  salvarDoMembro: (userId: string, salonIds: number[]): Promise<UnidadeDoMembro[]> =>
    api.put<UnidadeDoMembro[]>(`${BASE_PATH}/membros/${userId}`, { salonIds }),
};
