// Appointment types for the salon system

import { ID, Timestamps, PaymentMethod, SoftDelete } from './common';
import { Client } from './client';
import { Professional } from './professional';
import { Service } from './service';

export type AppointmentStatus =
  | 'pending' // Awaiting confirmation
  | 'confirmed' // Confirmed
  | 'in_progress' // Currently being served
  | 'completed' // Finished
  | 'canceled' // Canceled by client or salon
  | 'no_show'; // Client didn't show up

export type AppointmentSource =
  | 'online' // Client booked online (PWA)
  | 'phone' // Booked by phone
  | 'walk_in' // Walk-in client
  | 'admin'; // Created by admin/receptionist

export interface AppointmentService {
  serviceId: ID;
  service?: Service;
  price: number;
  durationMinutes: number;
  commissionValue?: number;
}

export interface Appointment extends Timestamps, SoftDelete {
  id: ID;

  // Who
  clientId: ID;
  client?: Client;
  professionalId: ID;
  professional?: Professional;

  // What
  services: AppointmentService[];
  totalPrice: number;
  totalDurationMinutes: number;

  // When
  date: Date;
  startTime: string; // HH:mm
  endTime: string; // HH:mm

  // Status
  status: AppointmentStatus;
  source: AppointmentSource;

  // Payment
  isPaid: boolean;
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  discountAmount?: number;
  discountReason?: string;
  couponId?: ID;
  couponCode?: string;
  finalPrice: number;

  // Commission
  commissionTotal: number;
  commissionPaid: boolean;
  commissionPaidAt?: Date;

  // Notes
  clientNotes?: string; // Notes from client
  internalNotes?: string; // Internal notes
  cancellationReason?: string;

  // Confirmation
  confirmedAt?: Date;
  confirmedBy?: 'client' | 'admin' | 'auto';
  reminderSentAt?: Date;
  reviewRequestSentAt?: Date;

  // Multi-unit
  unitId: ID;

  // Analytics
  checkedInAt?: Date;
  completedAt?: Date;
}

export interface AppointmentCreateInput {
  clientId: ID;
  professionalId: ID;
  serviceIds: ID[];
  date: Date;
  startTime: string;
  source?: AppointmentSource;
  clientNotes?: string;
  internalNotes?: string;
  couponCode?: string;
  unitId: ID;
}

export interface AppointmentUpdateInput {
  professionalId?: ID;
  serviceIds?: ID[];
  date?: Date;
  startTime?: string;
  status?: AppointmentStatus;
  clientNotes?: string;
  internalNotes?: string;
  paymentMethod?: PaymentMethod;
  discountAmount?: number;
  discountReason?: string;
}

export interface AppointmentFilters {
  search?: string;
  clientId?: ID;
  professionalId?: ID;
  serviceId?: ID;
  status?: AppointmentStatus | AppointmentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  source?: AppointmentSource;
  isPaid?: boolean;
  unitId?: ID;
}

// Available time slots
export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
  reason?: string; // Why unavailable
}

export interface AvailabilityRequest {
  professionalId?: ID;
  serviceIds: ID[];
  date: Date;
  unitId: ID;
}

export interface AvailabilityResponse {
  date: Date;
  professionals: {
    professionalId: ID;
    professionalName: string;
    slots: TimeSlot[];
  }[];
}

// Waitlist
export interface WaitlistEntry extends Timestamps {
  id: ID;
  clientId: ID;
  client?: Client;
  serviceIds: ID[];
  preferredProfessionalId?: ID;
  preferredDate?: Date;
  preferredTimeRange?: {
    start: string;
    end: string;
  };
  status: 'waiting' | 'notified' | 'booked' | 'expired';
  notifiedAt?: Date;
  expiresAt?: Date;
  notes?: string;
  unitId: ID;
}

export interface WaitlistCreateInput {
  clientId: ID;
  serviceIds: ID[];
  preferredProfessionalId?: ID;
  preferredDate?: Date;
  preferredTimeRange?: {
    start: string;
    end: string;
  };
  notes?: string;
  unitId: ID;
}

// Appointment Stats
export interface AppointmentStats {
  today: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    canceled: number;
    noShow: number;
    revenue: number;
  };
  week: {
    total: number;
    revenue: number;
    averagePerDay: number;
  };
  month: {
    total: number;
    revenue: number;
    completionRate: number;
    cancelationRate: number;
    noShowRate: number;
  };
  peakHours: {
    hour: number;
    count: number;
  }[];
  peakDays: {
    dayOfWeek: number;
    count: number;
  }[];
}

// Calendar view types
export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: ID;
  title: string;
  start: Date;
  end: Date;
  professionalId: ID;
  clientName: string;
  services: string[];
  status: AppointmentStatus;
  color?: string;
}
