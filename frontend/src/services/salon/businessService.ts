// Business Profile Service - Manage salon business data

import { api } from './api';
import type { BusinessProfile, BusinessProfileUpdateInput, BusinessStats } from '@/types/salon/business';

const BASE_PATH = '/salon/business';

export const businessService = {
  // Get business profile
  get: (): Promise<BusinessProfile> => {
    return api.get<BusinessProfile>(`${BASE_PATH}/profile`);
  },

  // Update business profile
  update: (data: BusinessProfileUpdateInput): Promise<BusinessProfile> => {
    return api.put<BusinessProfile>(`${BASE_PATH}/profile`, data);
  },

  // Upload logo
  uploadLogo: (file: File): Promise<{ url: string }> => {
    return api.upload<{ url: string }>(`${BASE_PATH}/logo`, file, 'logo');
  },

  // Upload cover image
  uploadCover: (file: File): Promise<{ url: string }> => {
    return api.upload<{ url: string }>(`${BASE_PATH}/cover`, file, 'cover');
  },

  // Get business stats
  getStats: (): Promise<BusinessStats> => {
    return api.get<BusinessStats>(`${BASE_PATH}/stats`);
  },

  // Search address by CEP (Brazilian postal code)
  searchCep: (cep: string): Promise<Partial<BusinessProfile['address']>> => {
    return api.get<Partial<BusinessProfile['address']>>(`${BASE_PATH}/address/cep/${cep}`);
  },
};
