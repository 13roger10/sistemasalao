// Coloring Service - API calls for coloring consultation

import { api } from './api';
import type {
  ColoringProfile,
  ColoringProfileCreateInput,
  ColoringHistory,
  ColoringHistoryCreateInput,
  TonalitySuggestion,
  ColoringEnums,
  SkinTone,
  SkinUndertone,
} from '@/types/salon/coloring';

const BASE_PATH = '/coloracao';

export const coloringService = {
  // ===== PROFILE (FICHA) =====
  profile: {
    // Get profile by client ID
    getByClientId: (clientId: string): Promise<ColoringProfile> => {
      return api.get<ColoringProfile>(`${BASE_PATH}/ficha/cliente/${clientId}`);
    },

    // Create profile
    create: (data: ColoringProfileCreateInput): Promise<ColoringProfile> => {
      return api.post<ColoringProfile>(`${BASE_PATH}/ficha`, data);
    },

    // Update profile
    update: (id: string, data: ColoringProfileCreateInput): Promise<ColoringProfile> => {
      return api.put<ColoringProfile>(`${BASE_PATH}/ficha/${id}`, data);
    },
  },

  // ===== HISTORY =====
  history: {
    // Get history by client ID
    getByClientId: (clientId: string): Promise<ColoringHistory[]> => {
      return api.get<ColoringHistory[]>(`${BASE_PATH}/historico/cliente/${clientId}`);
    },

    // Get history by ID
    getById: (id: string): Promise<ColoringHistory> => {
      return api.get<ColoringHistory>(`${BASE_PATH}/historico/${id}`);
    },

    // Create history record
    create: (data: ColoringHistoryCreateInput): Promise<ColoringHistory> => {
      return api.post<ColoringHistory>(`${BASE_PATH}/historico`, data);
    },
  },

  // ===== SUGGESTIONS =====
  // Get tonality suggestions
  getSuggestions: (tomPele: SkinTone, subtomPele: SkinUndertone): Promise<TonalitySuggestion> => {
    return api.post<TonalitySuggestion>(`${BASE_PATH}/sugestao`, null, {
      params: { tomPele, subtomPele },
    });
  },

  // ===== ENUMS =====
  // Get all enums
  getEnums: (): Promise<ColoringEnums> => {
    return api.get<ColoringEnums>(`${BASE_PATH}/enums`);
  },
};
