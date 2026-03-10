// Finance types for the salon system

import { ID, Timestamps, PaymentMethod, DateRange } from './common';

// Cash Register
export type CashRegisterStatus = 'open' | 'closed';

export interface CashRegister extends Timestamps {
  id: ID;
  unitId: ID;
  openedById: ID;
  openedByName: string;
  closedById?: ID;
  closedByName?: string;

  status: CashRegisterStatus;
  openedAt: Date;
  closedAt?: Date;

  // Opening
  openingBalance: number;
  openingNotes?: string;

  // Closing
  closingBalance?: number;
  expectedBalance?: number;
  difference?: number;
  closingNotes?: string;

  // Totals
  totalIncome: number;
  totalExpenses: number;
  totalWithdrawals: number;

  // By payment method
  cashTotal: number;
  pixTotal: number;
  creditCardTotal: number;
  debitCardTotal: number;
  voucherTotal: number;
}

export interface CashRegisterOpenInput {
  unitId: ID;
  openingBalance: number;
  openingNotes?: string;
}

export interface CashRegisterCloseInput {
  closingBalance: number;
  closingNotes?: string;
}

// Transactions
export type TransactionType = 'income' | 'expense' | 'withdrawal';

export type TransactionCategory =
  | 'service' // Payment for service
  | 'product' // Product sale
  | 'package' // Package/combo sale
  | 'tip' // Tip
  | 'rent' // Rent expense
  | 'supplies' // Supplies expense
  | 'salary' // Salary expense
  | 'utilities' // Utilities expense
  | 'marketing' // Marketing expense
  | 'maintenance' // Maintenance expense
  | 'other_income'
  | 'other_expense';

export interface Transaction extends Timestamps {
  id: ID;
  cashRegisterId: ID;
  unitId: ID;

  type: TransactionType;
  category: TransactionCategory;
  description: string;
  amount: number;

  paymentMethod: PaymentMethod;
  appointmentId?: ID;
  clientId?: ID;
  clientName?: string;

  createdById: ID;
  createdByName: string;

  notes?: string;
  receiptUrl?: string;
}

export interface TransactionCreateInput {
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  appointmentId?: ID;
  clientId?: ID;
  notes?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: TransactionCategory;
  paymentMethod?: PaymentMethod;
  dateRange?: DateRange;
  minAmount?: number;
  maxAmount?: number;
  cashRegisterId?: ID;
  unitId?: ID;
}

// Expenses
export interface ExpenseCategory {
  id: ID;
  name: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
}

export interface Expense extends Timestamps {
  id: ID;
  unitId: ID;
  categoryId: ID;
  category?: ExpenseCategory;

  description: string;
  amount: number;
  dueDate: Date;
  paidAt?: Date;
  isPaid: boolean;

  isRecurring: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceEndDate?: Date;

  supplierId?: ID;
  supplierName?: string;

  attachments?: string[];
  notes?: string;

  createdById: ID;
}

export interface ExpenseCreateInput {
  categoryId: ID;
  description: string;
  amount: number;
  dueDate: Date;
  isRecurring?: boolean;
  recurrenceType?: Expense['recurrenceType'];
  recurrenceEndDate?: Date;
  supplierId?: ID;
  notes?: string;
  unitId: ID;
}

export interface ExpenseFilters {
  categoryId?: ID;
  isPaid?: boolean;
  isRecurring?: boolean;
  dateRange?: DateRange;
  unitId?: ID;
}

// Financial Reports
export interface DailyReport {
  date: Date;
  cashRegisterId?: ID;
  status: CashRegisterStatus;

  revenue: {
    services: number;
    products: number;
    packages: number;
    tips: number;
    other: number;
    total: number;
  };

  expenses: {
    total: number;
    byCategory: {
      categoryId: ID;
      categoryName: string;
      amount: number;
    }[];
  };

  paymentMethods: {
    cash: number;
    pix: number;
    creditCard: number;
    debitCard: number;
    voucher: number;
  };

  appointments: {
    total: number;
    completed: number;
    canceled: number;
    noShow: number;
  };

  averageTicket: number;
  profit: number;
}

export interface MonthlyReport {
  month: number;
  year: number;
  unitId?: ID;

  revenue: {
    total: number;
    byWeek: number[];
    byDay: { date: string; amount: number }[];
    comparison: {
      previousMonth: number;
      percentageChange: number;
    };
  };

  expenses: {
    total: number;
    byCategory: {
      categoryId: ID;
      categoryName: string;
      amount: number;
      percentage: number;
    }[];
    comparison: {
      previousMonth: number;
      percentageChange: number;
    };
  };

  profit: {
    total: number;
    margin: number;
    comparison: {
      previousMonth: number;
      percentageChange: number;
    };
  };

  appointments: {
    total: number;
    averagePerDay: number;
    completionRate: number;
  };

  topServices: {
    serviceId: ID;
    serviceName: string;
    revenue: number;
    count: number;
  }[];

  topProfessionals: {
    professionalId: ID;
    professionalName: string;
    revenue: number;
    appointments: number;
  }[];

  topClients: {
    clientId: ID;
    clientName: string;
    spent: number;
    visits: number;
  }[];
}

export interface FinanceStats {
  today: {
    revenue: number;
    expenses: number;
    profit: number;
    appointments: number;
    averageTicket: number;
  };
  week: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  month: {
    revenue: number;
    expenses: number;
    profit: number;
    revenueTarget?: number;
    targetProgress?: number;
  };
  pendingExpenses: number;
  pendingCommissions: number;
}
