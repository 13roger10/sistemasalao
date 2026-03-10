// Commission types for the salon system

import { ID, Timestamps, DateRange } from './common';
import { CommissionType } from './professional';

export type CommissionStatus = 'pending' | 'paid' | 'canceled';

export interface Commission extends Timestamps {
  id: ID;
  professionalId: ID;
  professionalName: string;
  appointmentId: ID;
  serviceId: ID;
  serviceName: string;
  clientId: ID;
  clientName: string;

  // Values
  servicePrice: number;
  commissionType: CommissionType;
  commissionRate: number; // percentage or fixed value
  commissionValue: number; // calculated commission amount

  // Status
  status: CommissionStatus;
  paidAt?: Date;
  paidById?: ID;
  paidByName?: string;

  // Date
  appointmentDate: Date;

  // Multi-unit
  unitId: ID;

  notes?: string;
}

export interface CommissionFilters {
  professionalId?: ID;
  status?: CommissionStatus;
  dateRange?: DateRange;
  unitId?: ID;
}

export interface CommissionPayment extends Timestamps {
  id: ID;
  professionalId: ID;
  professionalName: string;

  // Period
  periodStart: Date;
  periodEnd: Date;

  // Values
  totalServices: number;
  totalCommission: number;
  deductions?: number;
  bonuses?: number;
  netAmount: number;

  // Breakdown
  commissionIds: ID[];
  breakdown: {
    serviceId: ID;
    serviceName: string;
    count: number;
    totalRevenue: number;
    commissionValue: number;
  }[];

  // Payment
  paidAt: Date;
  paidById: ID;
  paidByName: string;
  paymentMethod: string;
  paymentReference?: string;

  notes?: string;
  unitId: ID;
}

export interface CommissionPaymentInput {
  professionalId: ID;
  periodStart: Date;
  periodEnd: Date;
  commissionIds: ID[];
  deductions?: number;
  bonuses?: number;
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
}

export interface ProfessionalCommissionSummary {
  professionalId: ID;
  professionalName: string;
  avatar?: string;

  period: DateRange;

  // Totals
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;

  // Breakdown by service
  byService: {
    serviceId: ID;
    serviceName: string;
    count: number;
    revenue: number;
    commission: number;
  }[];

  // Comparison
  comparison?: {
    previousPeriod: {
      totalCommission: number;
      totalServices: number;
    };
    percentageChange: number;
  };
}

export interface CommissionStats {
  totalPending: number;
  totalPaidThisMonth: number;
  totalPaidThisYear: number;
  averageCommissionRate: number;
  topEarners: {
    professionalId: ID;
    professionalName: string;
    totalCommission: number;
  }[];
}

// Commission Rules
export interface CommissionRule extends Timestamps {
  id: ID;
  name: string;
  description?: string;

  // Type
  type: 'global' | 'service' | 'category' | 'professional';
  targetId?: ID; // serviceId, categoryId, or professionalId

  // Commission
  commissionType: CommissionType;
  commissionValue: number;

  // Conditions
  minServicePrice?: number;
  maxServicePrice?: number;
  validFrom?: Date;
  validUntil?: Date;

  // Priority (higher = applied first)
  priority: number;

  isActive: boolean;
  unitId?: ID;
}

export interface CommissionRuleCreateInput {
  name: string;
  description?: string;
  type: CommissionRule['type'];
  targetId?: ID;
  commissionType: CommissionType;
  commissionValue: number;
  minServicePrice?: number;
  maxServicePrice?: number;
  validFrom?: Date;
  validUntil?: Date;
  priority?: number;
  unitId?: ID;
}
