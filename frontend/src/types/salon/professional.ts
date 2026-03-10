// Professional types for the salon system

import { ID, Timestamps, Status, WeekSchedule, SoftDelete } from './common';

export type CommissionType = 'percentage' | 'fixed';

export interface Professional extends Timestamps, SoftDelete {
  id: ID;
  userId: ID;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  bio?: string;
  role?: string; // e.g., "Cabeleireiro", "Manicure"
  status: Status;

  // Services
  serviceIds: ID[];
  specialties: string[];

  // Commission
  commissionType: CommissionType;
  commissionValue: number; // percentage (0-100) or fixed value

  // Schedule
  schedule: WeekSchedule;
  breakTime?: {
    start: string;
    end: string;
  };

  // Performance
  averageRating: number;
  totalReviews: number;
  totalAppointments: number;
  totalRevenue: number;

  // Multi-unit
  unitIds: ID[];
  primaryUnitId: ID;

  // Settings
  acceptsOnlineBooking: boolean;
  showInPublicProfile: boolean;
  color?: string; // Calendar color
}

export interface ProfessionalCreateInput {
  userId?: ID;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  bio?: string;
  serviceIds?: ID[];
  specialties?: string[];
  commissionType: CommissionType;
  commissionValue: number;
  schedule?: WeekSchedule;
  unitIds: ID[];
  primaryUnitId: ID;
  acceptsOnlineBooking?: boolean;
  color?: string;
}

export interface ProfessionalUpdateInput extends Partial<ProfessionalCreateInput> {
  status?: Status;
  showInPublicProfile?: boolean;
}

export interface ProfessionalFilters {
  search?: string;
  status?: Status;
  serviceId?: ID;
  unitId?: ID;
  specialty?: string;
  minRating?: number;
  acceptsOnlineBooking?: boolean;
}

export interface ProfessionalAvailability {
  professionalId: ID;
  date: Date;
  availableSlots: {
    start: string;
    end: string;
    available: boolean;
    reason?: string;
  }[];
}

export interface ProfessionalPerformance {
  professionalId: ID;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalAppointments: number;
    completedAppointments: number;
    canceledAppointments: number;
    noShowAppointments: number;
    revenue: number;
    commission: number;
    averageTicket: number;
    averageRating: number;
    occupancyRate: number;
  };
  serviceBreakdown: {
    serviceId: ID;
    serviceName: string;
    count: number;
    revenue: number;
  }[];
  dailyMetrics: {
    date: Date;
    appointments: number;
    revenue: number;
  }[];
}

export interface ProfessionalRanking {
  professionalId: ID;
  professionalName: string;
  avatar?: string;
  position: number;
  metric: number;
  metricType: 'revenue' | 'appointments' | 'rating';
  trend: 'up' | 'down' | 'stable';
}
