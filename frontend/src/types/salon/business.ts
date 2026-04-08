// Business profile types for the salon system

import { Address, WeekSchedule, Timestamps } from './common';

export interface BusinessProfile extends Timestamps {
  id: string;

  // Basic Info
  name: string;
  tradeName?: string;
  cnpj?: string;

  // Contact
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;

  // Location
  address: Address;
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  // Schedule
  schedule: WeekSchedule;
  timezone: string;

  // Branding
  logo?: string;
  coverImage?: string;
  primaryColor?: string;
  description?: string;

  // Social Media
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
  };

  // Status
  isVerified: boolean;
  status: 'active' | 'inactive' | 'pending';
}

export interface BusinessProfileUpdateInput {
  name?: string;
  tradeName?: string;
  cnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: Address;
  coordinates?: BusinessProfile['coordinates'];
  schedule?: WeekSchedule;
  timezone?: string;
  logo?: string;
  coverImage?: string;
  primaryColor?: string;
  description?: string;
  socialMedia?: BusinessProfile['socialMedia'];
}

export interface BusinessStats {
  totalClients: number;
  totalProfessionals: number;
  totalServices: number;
  monthlyAppointments: number;
  monthlyRevenue: number;
  averageRating: number;
  totalReviews: number;
}
