// Promotion Service - API calls for promotions and marketing management

import { api } from './api';
import type {
  Coupon,
  CouponCreateInput,
  CouponFilters,
  CouponUsage,
  Campaign,
  CampaignCreateInput,
  CampaignExecution,
  CampaignTrigger,
  CashbackRule,
  ClientCashback,
  PromotionalPackage,
  ClientPackage,
  PromotionStats,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams, DateRange, ID } from '@/types/salon/common';

const BASE_PATH = '/salon/promotions';

export const promotionService = {
  // ===== COUPONS =====
  coupons: {
    list: (
      params: PaginationParams & CouponFilters
    ): Promise<PaginatedResponse<Coupon>> => {
      return api.get<PaginatedResponse<Coupon>>(`${BASE_PATH}/coupons`, {
        ...params,
        startDate: params.dateRange?.startDate?.toISOString(),
        endDate: params.dateRange?.endDate?.toISOString(),
      });
    },

    getById: (id: string): Promise<Coupon> => {
      return api.get<Coupon>(`${BASE_PATH}/coupons/${id}`);
    },

    getByCode: (code: string): Promise<Coupon> => {
      return api.get<Coupon>(`${BASE_PATH}/coupons/code/${code}`);
    },

    create: (data: CouponCreateInput): Promise<Coupon> => {
      return api.post<Coupon>(`${BASE_PATH}/coupons`, {
        ...data,
        validFrom: data.validFrom.toISOString(),
        validUntil: data.validUntil.toISOString(),
      });
    },

    update: (id: string, data: Partial<CouponCreateInput>): Promise<Coupon> => {
      return api.patch<Coupon>(`${BASE_PATH}/coupons/${id}`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/coupons/${id}`);
    },

    toggleActive: (id: string): Promise<Coupon> => {
      return api.post<Coupon>(`${BASE_PATH}/coupons/${id}/toggle`);
    },

    // Validate coupon for a client
    validate: (
      code: string,
      clientId: string,
      serviceIds: string[],
      totalAmount: number
    ): Promise<{
      valid: boolean;
      coupon?: Coupon;
      discountAmount?: number;
      errorMessage?: string;
    }> => {
      return api.post(`${BASE_PATH}/coupons/validate`, {
        code,
        clientId,
        serviceIds,
        totalAmount,
      });
    },

    // Apply coupon to appointment
    apply: (couponId: string, appointmentId: string): Promise<CouponUsage> => {
      return api.post<CouponUsage>(`${BASE_PATH}/coupons/${couponId}/apply`, {
        appointmentId,
      });
    },

    // Get coupon usage history
    getUsageHistory: (
      couponId: string,
      params: PaginationParams
    ): Promise<PaginatedResponse<CouponUsage>> => {
      return api.get<PaginatedResponse<CouponUsage>>(
        `${BASE_PATH}/coupons/${couponId}/usage`,
        params
      );
    },

    // Generate birthday coupons
    generateBirthdayCoupons: (month: number): Promise<{ generated: number }> => {
      return api.post(`${BASE_PATH}/coupons/generate-birthday`, { month });
    },
  },

  // ===== CAMPAIGNS =====
  campaigns: {
    list: (
      params: PaginationParams & {
        trigger?: CampaignTrigger;
        isActive?: boolean;
        channel?: string;
      }
    ): Promise<PaginatedResponse<Campaign>> => {
      return api.get<PaginatedResponse<Campaign>>(`${BASE_PATH}/campaigns`, params);
    },

    getById: (id: string): Promise<Campaign> => {
      return api.get<Campaign>(`${BASE_PATH}/campaigns/${id}`);
    },

    create: (data: CampaignCreateInput): Promise<Campaign> => {
      return api.post<Campaign>(`${BASE_PATH}/campaigns`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    update: (id: string, data: Partial<CampaignCreateInput>): Promise<Campaign> => {
      return api.patch<Campaign>(`${BASE_PATH}/campaigns/${id}`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/campaigns/${id}`);
    },

    toggleActive: (id: string): Promise<Campaign> => {
      return api.post<Campaign>(`${BASE_PATH}/campaigns/${id}/toggle`);
    },

    // Manual trigger
    triggerManually: (
      id: string,
      clientIds: string[]
    ): Promise<{ scheduled: number }> => {
      return api.post(`${BASE_PATH}/campaigns/${id}/trigger`, { clientIds });
    },

    // Get execution history
    getExecutions: (
      campaignId: string,
      params: PaginationParams & { status?: string }
    ): Promise<PaginatedResponse<CampaignExecution>> => {
      return api.get<PaginatedResponse<CampaignExecution>>(
        `${BASE_PATH}/campaigns/${campaignId}/executions`,
        params
      );
    },

    // Get inactive clients for targeting
    getInactiveClients: (
      days: number = 60
    ): Promise<{
      count: number;
      clients: Array<{
        id: ID;
        name: string;
        phone: string;
        email?: string;
        lastVisitAt: Date;
        daysSinceVisit: number;
      }>;
    }> => {
      return api.get(`${BASE_PATH}/campaigns/inactive-clients`, { days });
    },

    // Get birthday clients for targeting
    getBirthdayClients: (
      month?: number
    ): Promise<{
      count: number;
      clients: Array<{
        id: ID;
        name: string;
        phone: string;
        email?: string;
        birthday: Date;
      }>;
    }> => {
      return api.get(`${BASE_PATH}/campaigns/birthday-clients`, { month });
    },

    // Preview template
    previewTemplate: (
      template: string,
      clientId: string
    ): Promise<{ preview: string }> => {
      return api.post(`${BASE_PATH}/campaigns/preview`, { template, clientId });
    },

    // Send test message
    sendTest: (
      campaignId: string,
      phone?: string,
      email?: string
    ): Promise<{ success: boolean }> => {
      return api.post(`${BASE_PATH}/campaigns/${campaignId}/test`, { phone, email });
    },
  },

  // ===== CASHBACK =====
  cashback: {
    // Rules
    listRules: (unitId?: string): Promise<CashbackRule[]> => {
      return api.get<CashbackRule[]>(`${BASE_PATH}/cashback/rules`, { unitId });
    },

    getRuleById: (id: string): Promise<CashbackRule> => {
      return api.get<CashbackRule>(`${BASE_PATH}/cashback/rules/${id}`);
    },

    createRule: (data: Omit<CashbackRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CashbackRule> => {
      return api.post<CashbackRule>(`${BASE_PATH}/cashback/rules`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    updateRule: (id: string, data: Partial<CashbackRule>): Promise<CashbackRule> => {
      return api.patch<CashbackRule>(`${BASE_PATH}/cashback/rules/${id}`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    deleteRule: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/cashback/rules/${id}`);
    },

    toggleRuleActive: (id: string): Promise<CashbackRule> => {
      return api.post<CashbackRule>(`${BASE_PATH}/cashback/rules/${id}/toggle`);
    },

    // Client Cashback
    getClientBalance: (clientId: string): Promise<{
      available: number;
      pending: number;
      expiringSoon: number;
      history: ClientCashback[];
    }> => {
      return api.get(`${BASE_PATH}/cashback/client/${clientId}/balance`);
    },

    // Calculate cashback for appointment
    calculate: (
      appointmentId: string
    ): Promise<{
      ruleId?: ID;
      amount: number;
      expiresAt: Date;
    }> => {
      return api.post(`${BASE_PATH}/cashback/calculate`, { appointmentId });
    },

    // Apply cashback to appointment
    apply: (
      clientId: string,
      appointmentId: string,
      amount: number
    ): Promise<{
      applied: number;
      remainingBalance: number;
    }> => {
      return api.post(`${BASE_PATH}/cashback/apply`, {
        clientId,
        appointmentId,
        amount,
      });
    },

    // Get stats
    getStats: (
      dateRange?: DateRange,
      unitId?: string
    ): Promise<{
      totalIssued: number;
      totalUsed: number;
      totalExpired: number;
      averageCashbackRate: number;
    }> => {
      return api.get(`${BASE_PATH}/cashback/stats`, {
        startDate: dateRange?.startDate?.toISOString(),
        endDate: dateRange?.endDate?.toISOString(),
        unitId,
      });
    },
  },

  // ===== PACKAGES =====
  packages: {
    list: (
      params: PaginationParams & {
        isActive?: boolean;
        unitId?: string;
      }
    ): Promise<PaginatedResponse<PromotionalPackage>> => {
      return api.get<PaginatedResponse<PromotionalPackage>>(
        `${BASE_PATH}/packages`,
        params
      );
    },

    getById: (id: string): Promise<PromotionalPackage> => {
      return api.get<PromotionalPackage>(`${BASE_PATH}/packages/${id}`);
    },

    create: (
      data: Omit<PromotionalPackage, 'id' | 'createdAt' | 'updatedAt' | 'currentSales' | 'deletedAt'>
    ): Promise<PromotionalPackage> => {
      return api.post<PromotionalPackage>(`${BASE_PATH}/packages`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    update: (
      id: string,
      data: Partial<PromotionalPackage>
    ): Promise<PromotionalPackage> => {
      return api.patch<PromotionalPackage>(`${BASE_PATH}/packages/${id}`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/packages/${id}`);
    },

    toggleActive: (id: string): Promise<PromotionalPackage> => {
      return api.post<PromotionalPackage>(`${BASE_PATH}/packages/${id}/toggle`);
    },

    // Sell package to client
    sell: (
      packageId: string,
      clientId: string,
      paymentMethod: string
    ): Promise<ClientPackage> => {
      return api.post<ClientPackage>(`${BASE_PATH}/packages/${packageId}/sell`, {
        clientId,
        paymentMethod,
      });
    },

    // Get client packages
    getClientPackages: (
      clientId: string,
      status?: 'active' | 'completed' | 'expired'
    ): Promise<ClientPackage[]> => {
      return api.get<ClientPackage[]>(`${BASE_PATH}/packages/client/${clientId}`, {
        status,
      });
    },

    // Use service from package
    useService: (
      clientPackageId: string,
      serviceId: string,
      appointmentId: string
    ): Promise<ClientPackage> => {
      return api.post<ClientPackage>(
        `${BASE_PATH}/packages/client/${clientPackageId}/use`,
        { serviceId, appointmentId }
      );
    },
  },

  // ===== STATS & REPORTS =====
  getStats: (unitId?: string): Promise<PromotionStats> => {
    return api.get<PromotionStats>(`${BASE_PATH}/stats`, { unitId });
  },

  reports: {
    // Coupon performance report
    couponPerformance: (
      dateRange: DateRange,
      unitId?: string
    ): Promise<{
      coupons: Array<{
        couponId: ID;
        code: string;
        uses: number;
        totalDiscount: number;
        averageDiscount: number;
        conversionRate: number;
      }>;
      totals: {
        totalUses: number;
        totalDiscount: number;
        averageDiscount: number;
      };
    }> => {
      return api.get(`${BASE_PATH}/reports/coupons`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Campaign performance report
    campaignPerformance: (
      dateRange: DateRange,
      unitId?: string
    ): Promise<{
      campaigns: Array<{
        campaignId: ID;
        name: string;
        channel: string;
        sent: number;
        opened: number;
        clicked: number;
        converted: number;
        openRate: number;
        clickRate: number;
        conversionRate: number;
      }>;
      totals: {
        totalSent: number;
        totalConverted: number;
        averageConversionRate: number;
      };
    }> => {
      return api.get(`${BASE_PATH}/reports/campaigns`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Cashback report
    cashbackReport: (
      dateRange: DateRange,
      unitId?: string
    ): Promise<{
      issued: number;
      used: number;
      expired: number;
      pending: number;
      byRule: Array<{
        ruleId: ID;
        ruleName: string;
        issued: number;
        used: number;
      }>;
    }> => {
      return api.get(`${BASE_PATH}/reports/cashback`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Package sales report
    packageSales: (
      dateRange: DateRange,
      unitId?: string
    ): Promise<{
      packages: Array<{
        packageId: ID;
        name: string;
        sales: number;
        revenue: number;
        servicesUsed: number;
        servicesRemaining: number;
      }>;
      totals: {
        totalSales: number;
        totalRevenue: number;
      };
    }> => {
      return api.get(`${BASE_PATH}/reports/packages`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Export report
    export: (
      type: 'coupons' | 'campaigns' | 'cashback' | 'packages',
      dateRange: DateRange,
      format: 'pdf' | 'xlsx',
      unitId?: string
    ): Promise<Blob> => {
      return api.get<Blob>(`${BASE_PATH}/reports/export/${type}`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format,
        unitId,
      });
    },
  },
};
