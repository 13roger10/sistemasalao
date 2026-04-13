import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Escopo = "read" | "write";

export interface ApiKeyResponse {
  id: number;
  nome: string;
  keyPrefix: string;   // e.g. "bz_live_ab12••••••••••••••••••••"
  escopos: Escopo[];
  ativo: boolean;
  ultimoUsoEm: string | null;
  expiraEm: string | null;
  criadoEm: string;
}

/** Returned only once on creation — contains the full raw key. */
export interface ApiKeyCreatedResponse {
  id: number;
  nome: string;
  rawKey: string;      // show once, never retrievable again
  keyPrefix: string;
  escopos: Escopo[];
  expiraEm: string | null;
  criadoEm: string;
}

export interface ApiKeyRequest {
  nome: string;
  escopos: Escopo[];
  expiraEm?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const apiKeysService = {
  async listar(salonId: number): Promise<ApiKeyResponse[]> {
    const r = await api.get<ApiKeyResponse[]>(`/api/salons/${salonId}/api-keys`);
    return r.data;
  },

  async criar(salonId: number, req: ApiKeyRequest): Promise<ApiKeyCreatedResponse> {
    const r = await api.post<ApiKeyCreatedResponse>(`/api/salons/${salonId}/api-keys`, req);
    return r.data;
  },

  async revogar(salonId: number, keyId: number): Promise<void> {
    await api.delete(`/api/salons/${salonId}/api-keys/${keyId}/revogar`);
  },

  async excluir(salonId: number, keyId: number): Promise<void> {
    await api.delete(`/api/salons/${salonId}/api-keys/${keyId}`);
  },
};
