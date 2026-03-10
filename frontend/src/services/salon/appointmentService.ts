// Appointment Service - API calls for appointment management

import { api } from './api';
import type {
  Appointment,
  AppointmentCreateInput,
  AppointmentUpdateInput,
  AppointmentFilters,
  AppointmentStats,
  AppointmentStatus,
  AvailabilityRequest,
  AvailabilityResponse,
  WaitlistEntry,
  WaitlistCreateInput,
  CalendarEvent,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams, DateRange } from '@/types/salon/common';

const BASE_PATH = '/salon/appointments';

export const appointmentService = {
  // List appointments with pagination and filters (admin endpoint)
  list: (
    params: PaginationParams & AppointmentFilters
  ): Promise<PaginatedResponse<Appointment>> => {
    return api.get<PaginatedResponse<Appointment>>(BASE_PATH, params);
  },

  // List appointments for the authenticated client
  getMyAppointments: (
    params?: PaginationParams & { status?: string }
  ): Promise<PaginatedResponse<Appointment>> => {
    return api.get<PaginatedResponse<Appointment>>(`${BASE_PATH}/my`, params);
  },

  // Get single appointment for the authenticated client
  getMyAppointmentById: (id: string): Promise<Appointment> => {
    return api.get<Appointment>(`${BASE_PATH}/my/${id}`);
  },

  // Create new appointment for the authenticated client
  createMyAppointment: (data: {
    professionalId: string;
    serviceIds: string[];
    date: string;
    startTime: string;
    unitId: string;
    notes?: string;
  }): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/my`, data);
  },

  // Confirm appointment for the authenticated client
  confirmMyAppointment: (id: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/my/${id}/confirm`);
  },

  // Cancel appointment for the authenticated client
  cancelMyAppointment: (id: string, reason?: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/my/${id}/cancel`, { reason });
  },

  // Reschedule appointment for the authenticated client
  rescheduleMyAppointment: (
    id: string,
    newDate: string,
    newTime: string
  ): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/my/${id}/reschedule`, {
      date: newDate,
      startTime: newTime,
    });
  },

  // Get single appointment by ID
  getById: (id: string): Promise<Appointment> => {
    return api.get<Appointment>(`${BASE_PATH}/${id}`);
  },

  // Create new appointment
  create: (data: AppointmentCreateInput): Promise<Appointment> => {
    return api.post<Appointment>(BASE_PATH, data);
  },

  // Update existing appointment
  update: (id: string, data: AppointmentUpdateInput): Promise<Appointment> => {
    return api.patch<Appointment>(`${BASE_PATH}/${id}`, data);
  },

  // Cancel appointment
  cancel: (id: string, reason?: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/cancel`, { reason });
  },

  // Confirm appointment
  confirm: (id: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/confirm`);
  },

  // Start appointment (in progress)
  start: (id: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/start`);
  },

  // Complete appointment
  complete: (
    id: string,
    paymentData?: { method: string; amount: number }
  ): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/complete`, paymentData);
  },

  // Mark as no-show
  noShow: (id: string): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/no-show`);
  },

  // Get appointments for calendar view
  getCalendarEvents: (
    params: {
      startDate: Date;
      endDate: Date;
      professionalId?: string;
      unitId?: string;
    }
  ): Promise<CalendarEvent[]> => {
    return api.get<CalendarEvent[]>(`${BASE_PATH}/calendar`, {
      startDate: params.startDate.toISOString(),
      endDate: params.endDate.toISOString(),
      professionalId: params.professionalId,
      unitId: params.unitId,
    });
  },

  // Get today's appointments
  getToday: (unitId?: string): Promise<Appointment[]> => {
    return api.get<Appointment[]>(`${BASE_PATH}/today`, { unitId });
  },

  // Get appointment statistics
  getStats: (
    params: { dateRange?: DateRange; unitId?: string }
  ): Promise<AppointmentStats> => {
    return api.get<AppointmentStats>(`${BASE_PATH}/stats`, {
      startDate: params.dateRange?.startDate?.toISOString(),
      endDate: params.dateRange?.endDate?.toISOString(),
      unitId: params.unitId,
    });
  },

  // Check availability
  checkAvailability: (data: AvailabilityRequest): Promise<AvailabilityResponse> => {
    return api.post<AvailabilityResponse>(`${BASE_PATH}/availability`, {
      ...data,
      date: data.date.toISOString(),
    });
  },

  // Get availability (alias for MobileBooking compatibility)
  getAvailability: (data: AvailabilityRequest): Promise<AvailabilityResponse> => {
    return api.post<AvailabilityResponse>(`${BASE_PATH}/availability`, {
      ...data,
      date: data.date.toISOString(),
    });
  },

  // Apply coupon to appointment
  applyCoupon: (
    id: string,
    couponCode: string
  ): Promise<{ discount: number; finalPrice: number }> => {
    return api.post<{ discount: number; finalPrice: number }>(
      `${BASE_PATH}/${id}/apply-coupon`,
      { couponCode }
    );
  },

  // Send reminder
  sendReminder: (id: string): Promise<void> => {
    return api.post(`${BASE_PATH}/${id}/send-reminder`);
  },

  // Reschedule appointment
  reschedule: (
    id: string,
    newDate: Date,
    newTime: string
  ): Promise<Appointment> => {
    return api.post<Appointment>(`${BASE_PATH}/${id}/reschedule`, {
      date: newDate.toISOString(),
      startTime: newTime,
    });
  },

  // Waitlist
  waitlist: {
    list: (unitId?: string): Promise<WaitlistEntry[]> => {
      return api.get<WaitlistEntry[]>(`${BASE_PATH}/waitlist`, { unitId });
    },

    add: (data: WaitlistCreateInput): Promise<WaitlistEntry> => {
      return api.post<WaitlistEntry>(`${BASE_PATH}/waitlist`, data);
    },

    remove: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/waitlist/${id}`);
    },

    notify: (id: string, slotDetails: string): Promise<void> => {
      return api.post(`${BASE_PATH}/waitlist/${id}/notify`, { slotDetails });
    },
  },

  // Bulk operations
  bulkConfirm: (ids: string[]): Promise<void> => {
    return api.post(`${BASE_PATH}/bulk/confirm`, { ids });
  },

  bulkCancel: (ids: string[], reason?: string): Promise<void> => {
    return api.post(`${BASE_PATH}/bulk/cancel`, { ids, reason });
  },

  // Export appointments
  export: (
    filters: AppointmentFilters,
    format: 'csv' | 'xlsx'
  ): Promise<Blob> => {
    return api.get<Blob>(`${BASE_PATH}/export`, { ...filters, format });
  },
};
