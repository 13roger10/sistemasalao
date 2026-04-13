import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FuncaoStudio = "PROPRIETARIO" | "GESTOR" | "EDITOR" | "VISUALIZADOR";

export interface MembroStudio {
  id: number;
  usuarioId: number;
  nome: string;
  email: string;
  avatarUrl?: string;
  funcao: FuncaoStudio;
  funcaoLabel: string;
  criadoEm: string;
}

export interface MinhaFuncaoResponse {
  funcao: FuncaoStudio | null;
}

// ─── Labels & helpers ─────────────────────────────────────────────────────────

export const FUNCAO_LABELS: Record<FuncaoStudio, string> = {
  PROPRIETARIO: "Proprietário",
  GESTOR: "Gestor",
  EDITOR: "Editor",
  VISUALIZADOR: "Visualizador",
};

export const FUNCAO_COLORS: Record<FuncaoStudio, string> = {
  PROPRIETARIO:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  GESTOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EDITOR:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  VISUALIZADOR:
    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

/** Ordered list for role selector (PROPRIETARIO cannot be assigned, so excluded). */
export const FUNCOES_ASSIGNING: FuncaoStudio[] = [
  "GESTOR",
  "EDITOR",
  "VISUALIZADOR",
];

// ─── Service ──────────────────────────────────────────────────────────────────

export const equipeStudioService = {
  async listar(salonId: number): Promise<MembroStudio[]> {
    const response = await api.get<MembroStudio[]>(
      `/api/salons/${salonId}/equipe`
    );
    return response.data;
  },

  async adicionar(
    salonId: number,
    email: string,
    funcao: FuncaoStudio
  ): Promise<MembroStudio> {
    const response = await api.post<MembroStudio>(
      `/api/salons/${salonId}/equipe`,
      { email, funcao }
    );
    return response.data;
  },

  async alterarFuncao(
    salonId: number,
    membroId: number,
    funcao: FuncaoStudio
  ): Promise<MembroStudio> {
    const response = await api.patch<MembroStudio>(
      `/api/salons/${salonId}/equipe/${membroId}/funcao`,
      { funcao }
    );
    return response.data;
  },

  async remover(salonId: number, membroId: number): Promise<void> {
    await api.delete(`/api/salons/${salonId}/equipe/${membroId}`);
  },

  async minhaFuncao(salonId: number): Promise<FuncaoStudio | null> {
    const response = await api.get<MinhaFuncaoResponse>(
      `/api/salons/${salonId}/equipe/minha-funcao`
    );
    return response.data.funcao;
  },
};
