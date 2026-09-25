// Client types for the salon system

import { ID, Timestamps, Address, ContactInfo, Status, SoftDelete } from './common';

export type LoyaltyLevel = 'bronze' | 'silver' | 'gold';

/** active | inactive (cadastro desativado) | blocked (bloqueado para agendar, ex.: excesso de no-shows) */
export type ClientStatus = Status | 'blocked';

export interface Client extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  cpf?: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_say';
  avatar?: string;
  address?: Address;
  notes?: string;
  status: ClientStatus;
  noShows?: number;

  // Loyalty
  loyaltyLevel: LoyaltyLevel;
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;

  // Preferences
  preferredProfessionalId?: ID;
  preferredServices?: ID[];
  allergies?: string;
  observations?: string;

  // Marketing
  acceptsMarketing: boolean;
  acceptsWhatsApp: boolean;
  acceptsEmail: boolean;

  // Analytics
  lastVisitAt?: Date;
  firstVisitAt?: Date;
  averageTicket: number;

  // Multi-unit
  unitId?: ID;
  registeredUnitId?: ID;
}

export interface ClientCreateInput {
  name: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  cpf?: string;
  birthDate?: Date;
  gender?: Client['gender'];
  address?: Address;
  notes?: string;
  acceptsMarketing?: boolean;
  acceptsWhatsApp?: boolean;
  acceptsEmail?: boolean;
  preferredProfessionalId?: ID;
  unitId?: ID;
  salonId?: ID;
}

export interface ClientUpdateInput extends Partial<ClientCreateInput> {
  status?: Status;
  loyaltyPoints?: number;
  allergies?: string;
  observations?: string;
}

export interface ClientFilters {
  search?: string;
  status?: ClientStatus;
  loyaltyLevel?: LoyaltyLevel;
  hasVisitedInDays?: number;
  notVisitedInDays?: number;
  birthdayMonth?: number;
  minTotalSpent?: number;
  maxTotalSpent?: number;
  minVisits?: number;
  unitId?: ID;
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  inactiveClients: number; // 60+ days without visit
  birthdaysToday: number;
  birthdaysThisMonth: number;
  byLoyaltyLevel: {
    bronze: number;
    silver: number;
    gold: number;
  };
}

export interface ClientHistory {
  appointments: {
    id: ID;
    date: Date;
    services: string[];
    professional: string;
    total: number;
    status: string;
  }[];
  totalAppointments: number;
  totalSpent: number;
  favoriteServices: {
    serviceId: ID;
    serviceName: string;
    count: number;
  }[];
  favoriteProfessional?: {
    professionalId: ID;
    professionalName: string;
    count: number;
  };
}

export interface ClientBirthday {
  client: Client;
  daysUntil: number;
  age?: number;
}
