// Schedule Service - Manage business hours and special dates

import { api } from './api';
import type { WeekSchedule } from '@/types/salon/common';

const BASE_PATH = '/salon/schedule';

export interface ScheduleSettings {
  schedule: WeekSchedule;
  timezone: string;
  slotDuration: number; // minutes
  minAdvanceBooking: number; // hours
  maxAdvanceBooking: number; // days
  allowSameDayBooking: boolean;
  bufferBetweenAppointments: number; // minutes
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  isOpen: boolean;
  schedule?: {
    start: string;
    end: string;
  };
  recurring: boolean;
}

export interface SpecialDate {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'closed' | 'special_hours' | 'extended';
  schedule?: {
    start: string;
    end: string;
  };
}

export const scheduleService = {
  // Get schedule settings
  get: (): Promise<ScheduleSettings> => {
    return api.get<ScheduleSettings>(`${BASE_PATH}`);
  },

  // Update schedule settings
  update: (data: Partial<ScheduleSettings>): Promise<ScheduleSettings> => {
    return api.put<ScheduleSettings>(`${BASE_PATH}`, data);
  },

  // Get holidays
  getHolidays: (): Promise<Holiday[]> => {
    return api.get<Holiday[]>(`${BASE_PATH}/holidays`);
  },

  // Add holiday
  addHoliday: (data: Omit<Holiday, 'id'>): Promise<Holiday> => {
    return api.post<Holiday>(`${BASE_PATH}/holidays`, data);
  },

  // Update holiday
  updateHoliday: (id: string, data: Partial<Holiday>): Promise<Holiday> => {
    return api.put<Holiday>(`${BASE_PATH}/holidays/${id}`, data);
  },

  // Delete holiday
  deleteHoliday: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/holidays/${id}`);
  },

  // Get special dates
  getSpecialDates: (): Promise<SpecialDate[]> => {
    return api.get<SpecialDate[]>(`${BASE_PATH}/special-dates`);
  },

  // Add special date
  addSpecialDate: (data: Omit<SpecialDate, 'id'>): Promise<SpecialDate> => {
    return api.post<SpecialDate>(`${BASE_PATH}/special-dates`, data);
  },

  // Delete special date
  deleteSpecialDate: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/special-dates/${id}`);
  },
};
