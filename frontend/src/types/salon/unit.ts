// Multi-unit types for the salon system

import { ID, Timestamps, Status, Address, WeekSchedule, SoftDelete, DateRange } from './common';

export interface Unit extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  tradeName?: string;
  cnpj?: string;

  // Contact
  phone: string;
  whatsapp?: string;
  email?: string;

  // Location
  address: Address;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  timezone: string;

  // Schedule
  schedule: WeekSchedule;
  holidays?: {
    date: Date;
    name: string;
    isOpen: boolean;
  }[];

  // Manager
  managerId?: ID;
  managerName?: string;

  // Status
  status: Status;
  isHeadquarters: boolean;

  // Branding
  logo?: string;
  coverImage?: string;
  color?: string;
  description?: string;

  // Settings
  settings?: UnitSettings;

  // Stats
  totalProfessionals: number;
  totalClients: number;
  monthlyRevenue?: number;
}

export interface UnitSettings {
  // Booking
  onlineBookingEnabled: boolean;
  advanceBookingDays: number;
  minBookingNotice: number; // hours
  cancellationNotice: number; // hours
  autoConfirmBookings: boolean;

  // Notifications
  appointmentReminderHours: number;
  reviewRequestHours: number;

  // Payment
  acceptedPaymentMethods: string[];

  // Display
  showOnPublicSite: boolean;
  showPricesOnline: boolean;
}

export interface UnitCreateInput {
  name: string;
  tradeName?: string;
  cnpj?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: Address;
  coordinates?: Unit['coordinates'];
  timezone?: string;
  schedule?: WeekSchedule;
  managerId?: ID;
  isHeadquarters?: boolean;
  logo?: string;
  color?: string;
  description?: string;
}

export interface UnitUpdateInput extends Partial<UnitCreateInput> {
  status?: Status;
  settings?: Partial<UnitSettings>;
}

export interface UnitFilters {
  search?: string;
  status?: Status;
  city?: string;
  state?: string;
  managerId?: ID;
}

// Unit Comparison
export interface UnitComparison {
  period: DateRange;

  units: {
    unitId: ID;
    unitName: string;

    metrics: {
      revenue: number;
      revenueChange: number;
      appointments: number;
      appointmentsChange: number;
      newClients: number;
      occupancyRate: number;
      averageTicket: number;
      cancellationRate: number;
      averageRating: number;
    };

    ranking: {
      revenue: number;
      appointments: number;
      rating: number;
    };
  }[];

  totals: {
    revenue: number;
    appointments: number;
    newClients: number;
    averageOccupancy: number;
    averageTicket: number;
  };

  bestPerformers: {
    revenue: { unitId: ID; unitName: string; value: number };
    appointments: { unitId: ID; unitName: string; value: number };
    rating: { unitId: ID; unitName: string; value: number };
    growth: { unitId: ID; unitName: string; value: number };
  };
}

// Unit Dashboard
export interface UnitDashboard {
  unitId: ID;
  unitName: string;
  date: Date;

  // Today
  today: {
    revenue: number;
    appointments: {
      total: number;
      completed: number;
      pending: number;
      canceled: number;
    };
    occupancyRate: number;
    availableSlots: number;
  };

  // Week
  week: {
    revenue: number;
    appointments: number;
    averageDaily: number;
  };

  // Month
  month: {
    revenue: number;
    revenueTarget?: number;
    appointments: number;
    newClients: number;
    averageTicket: number;
  };

  // Top performers
  topProfessionals: {
    professionalId: ID;
    professionalName: string;
    revenue: number;
    appointments: number;
  }[];

  topServices: {
    serviceId: ID;
    serviceName: string;
    bookings: number;
    revenue: number;
  }[];

  // Alerts
  alerts: {
    type: 'stock' | 'appointment' | 'review' | 'payment';
    message: string;
    severity: 'info' | 'warning' | 'critical';
    link?: string;
  }[];
}

// Unit Reports
export interface UnitReport {
  unitId: ID;
  unitName: string;
  period: DateRange;

  // Financial
  financial: {
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;

    revenueByDay: { date: string; amount: number }[];
    revenueByService: { serviceId: ID; serviceName: string; amount: number }[];
    revenueByProfessional: { professionalId: ID; professionalName: string; amount: number }[];
    revenueByPaymentMethod: Record<string, number>;

    comparison: {
      previousPeriod: {
        revenue: number;
        expenses: number;
        profit: number;
      };
      percentageChange: {
        revenue: number;
        expenses: number;
        profit: number;
      };
    };
  };

  // Operational
  operational: {
    totalAppointments: number;
    completedAppointments: number;
    canceledAppointments: number;
    noShowAppointments: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;

    averageOccupancy: number;
    peakHours: { hour: number; count: number }[];
    peakDays: { day: number; count: number }[];

    averageServiceTime: number;
    averageWaitTime?: number;
  };

  // Clients
  clients: {
    totalClients: number;
    newClients: number;
    returningClients: number;
    retentionRate: number;
    averageVisitsPerClient: number;
    averageTicket: number;

    topClients: {
      clientId: ID;
      clientName: string;
      visits: number;
      spent: number;
    }[];
  };

  // Team
  team: {
    totalProfessionals: number;
    performance: {
      professionalId: ID;
      professionalName: string;
      appointments: number;
      revenue: number;
      averageRating: number;
      occupancy: number;
    }[];
    commissionsPaid: number;
    commissionsPending: number;
  };
}

// Unit Stats
export interface UnitStats {
  totalUnits: number;
  activeUnits: number;
  totalRevenue: number;
  totalAppointments: number;
  totalClients: number;
  totalProfessionals: number;
  bestUnit?: {
    unitId: ID;
    unitName: string;
    revenue: number;
  };
}

// Transfer (between units)
export interface UnitTransfer extends Timestamps {
  id: ID;
  type: 'stock' | 'professional' | 'client';

  fromUnitId: ID;
  fromUnitName: string;
  toUnitId: ID;
  toUnitName: string;

  // For stock
  productId?: ID;
  productName?: string;
  quantity?: number;

  // For professional
  professionalId?: ID;
  professionalName?: string;

  // For client
  clientId?: ID;
  clientName?: string;

  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedById: ID;
  requestedByName: string;
  approvedById?: ID;
  approvedByName?: string;
  approvedAt?: Date;
  completedAt?: Date;

  notes?: string;
}
