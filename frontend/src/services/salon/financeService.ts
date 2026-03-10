// Finance Service - API calls for financial management

import { api } from './api';
import type {
  CashRegister,
  CashRegisterOpenInput,
  CashRegisterCloseInput,
  Transaction,
  TransactionCreateInput,
  TransactionFilters,
  Expense,
  ExpenseCreateInput,
  ExpenseFilters,
  ExpenseCategory,
  DailyReport,
  MonthlyReport,
  FinanceStats,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams, DateRange } from '@/types/salon/common';

const BASE_PATH = '/salon/finance';

export const financeService = {
  // Cash Register
  cashRegister: {
    // Get current open cash register
    getCurrent: (unitId: string): Promise<CashRegister | null> => {
      return api.get<CashRegister | null>(`${BASE_PATH}/cash-register/current`, { unitId });
    },

    // Get cash register by ID
    getById: (id: string): Promise<CashRegister> => {
      return api.get<CashRegister>(`${BASE_PATH}/cash-register/${id}`);
    },

    // Get cash register history
    list: (
      params: PaginationParams & { unitId?: string; dateRange?: DateRange }
    ): Promise<PaginatedResponse<CashRegister>> => {
      return api.get<PaginatedResponse<CashRegister>>(`${BASE_PATH}/cash-register`, {
        ...params,
        startDate: params.dateRange?.startDate?.toISOString(),
        endDate: params.dateRange?.endDate?.toISOString(),
      });
    },

    // Open cash register
    open: (data: CashRegisterOpenInput): Promise<CashRegister> => {
      return api.post<CashRegister>(`${BASE_PATH}/cash-register/open`, data);
    },

    // Close cash register
    close: (id: string, data: CashRegisterCloseInput): Promise<CashRegister> => {
      return api.post<CashRegister>(`${BASE_PATH}/cash-register/${id}/close`, data);
    },

    // Add withdrawal
    addWithdrawal: (
      id: string,
      amount: number,
      reason: string
    ): Promise<Transaction> => {
      return api.post<Transaction>(`${BASE_PATH}/cash-register/${id}/withdrawal`, {
        amount,
        reason,
      });
    },
  },

  // Transactions
  transactions: {
    list: (
      params: PaginationParams & TransactionFilters
    ): Promise<PaginatedResponse<Transaction>> => {
      return api.get<PaginatedResponse<Transaction>>(`${BASE_PATH}/transactions`, params);
    },

    getById: (id: string): Promise<Transaction> => {
      return api.get<Transaction>(`${BASE_PATH}/transactions/${id}`);
    },

    create: (data: TransactionCreateInput): Promise<Transaction> => {
      return api.post<Transaction>(`${BASE_PATH}/transactions`, data);
    },

    // Get transactions for a specific appointment
    getByAppointment: (appointmentId: string): Promise<Transaction[]> => {
      return api.get<Transaction[]>(`${BASE_PATH}/transactions/appointment/${appointmentId}`);
    },
  },

  // Expenses
  expenses: {
    list: (
      params: PaginationParams & ExpenseFilters
    ): Promise<PaginatedResponse<Expense>> => {
      return api.get<PaginatedResponse<Expense>>(`${BASE_PATH}/expenses`, params);
    },

    getById: (id: string): Promise<Expense> => {
      return api.get<Expense>(`${BASE_PATH}/expenses/${id}`);
    },

    create: (data: ExpenseCreateInput): Promise<Expense> => {
      return api.post<Expense>(`${BASE_PATH}/expenses`, data);
    },

    update: (id: string, data: Partial<ExpenseCreateInput>): Promise<Expense> => {
      return api.patch<Expense>(`${BASE_PATH}/expenses/${id}`, data);
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/expenses/${id}`);
    },

    markAsPaid: (id: string): Promise<Expense> => {
      return api.post<Expense>(`${BASE_PATH}/expenses/${id}/pay`);
    },

    // Get pending expenses
    getPending: (unitId?: string): Promise<Expense[]> => {
      return api.get<Expense[]>(`${BASE_PATH}/expenses/pending`, { unitId });
    },

    // Get expense categories
    getCategories: (): Promise<ExpenseCategory[]> => {
      return api.get<ExpenseCategory[]>(`${BASE_PATH}/expenses/categories`);
    },

    // Create expense category
    createCategory: (data: { name: string; icon?: string; color?: string }): Promise<ExpenseCategory> => {
      return api.post<ExpenseCategory>(`${BASE_PATH}/expenses/categories`, data);
    },
  },

  // Reports
  reports: {
    // Get daily report
    daily: (date: Date, unitId?: string): Promise<DailyReport> => {
      return api.get<DailyReport>(`${BASE_PATH}/reports/daily`, {
        date: date.toISOString(),
        unitId,
      });
    },

    // Get monthly report
    monthly: (month: number, year: number, unitId?: string): Promise<MonthlyReport> => {
      return api.get<MonthlyReport>(`${BASE_PATH}/reports/monthly`, {
        month,
        year,
        unitId,
      });
    },

    // Get custom period report
    custom: (dateRange: DateRange, unitId?: string): Promise<MonthlyReport> => {
      return api.get<MonthlyReport>(`${BASE_PATH}/reports/custom`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Export report
    export: (
      type: 'daily' | 'monthly' | 'custom',
      params: { date?: Date; month?: number; year?: number; dateRange?: DateRange; unitId?: string },
      format: 'pdf' | 'xlsx'
    ): Promise<Blob> => {
      return api.get<Blob>(`${BASE_PATH}/reports/${type}/export`, {
        ...params,
        date: params.date?.toISOString(),
        startDate: params.dateRange?.startDate?.toISOString(),
        endDate: params.dateRange?.endDate?.toISOString(),
        format,
      });
    },
  },

  // Get finance stats
  getStats: (unitId?: string): Promise<FinanceStats> => {
    return api.get<FinanceStats>(`${BASE_PATH}/stats`, { unitId });
  },

  // Get revenue by period
  getRevenue: (params: {
    period: 'day' | 'week' | 'month' | 'year';
    date?: Date;
    unitId?: string;
  }): Promise<{ date: string; amount: number }[]> => {
    return api.get(`${BASE_PATH}/revenue`, {
      ...params,
      date: params.date?.toISOString(),
    });
  },

  // Get payment methods summary
  getPaymentMethodsSummary: (
    dateRange: DateRange,
    unitId?: string
  ): Promise<Record<string, number>> => {
    return api.get(`${BASE_PATH}/payment-methods`, {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      unitId,
    });
  },
};
