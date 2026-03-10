// Common types used across the salon system

export type ID = string;

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDelete {
  deletedAt?: Date;
  isDeleted?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  items: T[]; // alias for data
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country?: string;
}

export interface ContactInfo {
  phone: string;
  whatsapp?: string;
  email?: string;
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isOpen: boolean;
  timeRanges: TimeRange[];
}

export interface WeekSchedule {
  days: DaySchedule[];
}

export type Status = 'active' | 'inactive';

export type PaymentMethod =
  | 'cash'
  | 'pix'
  | 'credit_card'
  | 'debit_card'
  | 'voucher'
  | 'loyalty_points';

export interface Money {
  amount: number;
  currency: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface FilterParams {
  search?: string;
  status?: Status;
  dateRange?: DateRange;
  [key: string]: unknown;
}
