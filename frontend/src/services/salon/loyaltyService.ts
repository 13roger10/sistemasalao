// Loyalty Service - API calls for loyalty/rewards management

import { api } from './api';
import type {
  LoyaltyProgram,
  ClientLoyaltyProgress,
  PointsRule,
  PointsRuleCreateInput,
  Reward,
  RewardCreateInput,
  PointsTransaction,
  PointsTransactionFilters,
  ClientReward,
  LoyaltyMemberSummary,
  LoyaltyStats,
  LoyaltySettings,
  LoyaltyLevelConfig,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams, DateRange } from '@/types/salon/common';

const BASE_PATH = '/salon/loyalty';

export const loyaltyService = {
  // ===== LOYALTY PROGRAMS (10 cuts = 1 free) =====
  programs: {
    list: (unitId?: string): Promise<LoyaltyProgram[]> => {
      return api.get<LoyaltyProgram[]>(`${BASE_PATH}/programs`, { unitId });
    },

    getById: (id: string): Promise<LoyaltyProgram> => {
      return api.get<LoyaltyProgram>(`${BASE_PATH}/programs/${id}`);
    },

    create: (data: {
      name: string;
      description?: string;
      requiredServices: number;
      rewardServices: number;
      applicableServiceIds?: string[];
      trackByService: boolean;
      unitId?: string;
    }): Promise<LoyaltyProgram> => {
      return api.post<LoyaltyProgram>(`${BASE_PATH}/programs`, data);
    },

    update: (
      id: string,
      data: Partial<{
        name: string;
        description?: string;
        requiredServices: number;
        rewardServices: number;
        applicableServiceIds?: string[];
        trackByService: boolean;
        isActive: boolean;
      }>
    ): Promise<LoyaltyProgram> => {
      return api.patch<LoyaltyProgram>(`${BASE_PATH}/programs/${id}`, data);
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/programs/${id}`);
    },

    toggleActive: (id: string): Promise<LoyaltyProgram> => {
      return api.post<LoyaltyProgram>(`${BASE_PATH}/programs/${id}/toggle`);
    },

    // Get client progress for a program
    getClientProgress: (
      programId: string,
      clientId: string
    ): Promise<ClientLoyaltyProgress> => {
      return api.get<ClientLoyaltyProgress>(
        `${BASE_PATH}/programs/${programId}/clients/${clientId}`
      );
    },

    // Register service towards program (after appointment completion)
    registerService: (
      programId: string,
      data: {
        clientId: string;
        appointmentId: string;
        serviceId: string;
        serviceName: string;
      }
    ): Promise<ClientLoyaltyProgress> => {
      return api.post<ClientLoyaltyProgress>(
        `${BASE_PATH}/programs/${programId}/register`,
        data
      );
    },

    // Redeem free service from program
    redeemFreeService: (
      programId: string,
      data: {
        clientId: string;
        appointmentId?: string;
      }
    ): Promise<ClientLoyaltyProgress> => {
      return api.post<ClientLoyaltyProgress>(
        `${BASE_PATH}/programs/${programId}/redeem`,
        data
      );
    },
  },

  // ===== POINTS RULES =====
  rules: {
    list: (
      params?: { unitId?: string; isActive?: boolean }
    ): Promise<PointsRule[]> => {
      return api.get<PointsRule[]>(`${BASE_PATH}/rules`, params);
    },

    getById: (id: string): Promise<PointsRule> => {
      return api.get<PointsRule>(`${BASE_PATH}/rules/${id}`);
    },

    create: (data: PointsRuleCreateInput): Promise<PointsRule> => {
      return api.post<PointsRule>(`${BASE_PATH}/rules`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    update: (
      id: string,
      data: Partial<PointsRuleCreateInput>
    ): Promise<PointsRule> => {
      return api.patch<PointsRule>(`${BASE_PATH}/rules/${id}`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/rules/${id}`);
    },

    toggleActive: (id: string): Promise<PointsRule> => {
      return api.post<PointsRule>(`${BASE_PATH}/rules/${id}/toggle`);
    },

    // Calculate points for a transaction
    calculatePoints: (data: {
      amount: number;
      serviceIds?: string[];
      clientId: string;
    }): Promise<{
      totalPoints: number;
      appliedRules: { ruleId: string; ruleName: string; points: number }[];
    }> => {
      return api.post(`${BASE_PATH}/rules/calculate`, data);
    },
  },

  // ===== REWARDS =====
  rewards: {
    list: (
      params: PaginationParams & {
        isActive?: boolean;
        type?: string;
        unitId?: string;
      }
    ): Promise<PaginatedResponse<Reward>> => {
      return api.get<PaginatedResponse<Reward>>(`${BASE_PATH}/rewards`, params);
    },

    getById: (id: string): Promise<Reward> => {
      return api.get<Reward>(`${BASE_PATH}/rewards/${id}`);
    },

    create: (data: RewardCreateInput): Promise<Reward> => {
      return api.post<Reward>(`${BASE_PATH}/rewards`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    update: (id: string, data: Partial<RewardCreateInput>): Promise<Reward> => {
      return api.patch<Reward>(`${BASE_PATH}/rewards/${id}`, {
        ...data,
        validFrom: data.validFrom?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/rewards/${id}`);
    },

    toggleActive: (id: string): Promise<Reward> => {
      return api.post<Reward>(`${BASE_PATH}/rewards/${id}/toggle`);
    },

    // Get available rewards for a client
    getAvailableForClient: (clientId: string): Promise<Reward[]> => {
      return api.get<Reward[]>(`${BASE_PATH}/rewards/available/${clientId}`);
    },
  },

  // ===== POINTS TRANSACTIONS =====
  transactions: {
    list: (
      params: PaginationParams & PointsTransactionFilters
    ): Promise<PaginatedResponse<PointsTransaction>> => {
      return api.get<PaginatedResponse<PointsTransaction>>(
        `${BASE_PATH}/transactions`,
        {
          ...params,
          startDate: params.dateRange?.startDate?.toISOString(),
          endDate: params.dateRange?.endDate?.toISOString(),
        }
      );
    },

    getById: (id: string): Promise<PointsTransaction> => {
      return api.get<PointsTransaction>(`${BASE_PATH}/transactions/${id}`);
    },

    // Get transactions for a specific client
    getByClient: (
      clientId: string,
      params: PaginationParams & Omit<PointsTransactionFilters, 'clientId'>
    ): Promise<PaginatedResponse<PointsTransaction>> => {
      return api.get<PaginatedResponse<PointsTransaction>>(
        `${BASE_PATH}/transactions/client/${clientId}`,
        {
          ...params,
          startDate: params.dateRange?.startDate?.toISOString(),
          endDate: params.dateRange?.endDate?.toISOString(),
        }
      );
    },

    // Award points to a client
    awardPoints: (data: {
      clientId: string;
      points: number;
      description: string;
      appointmentId?: string;
      ruleId?: string;
    }): Promise<PointsTransaction> => {
      return api.post<PointsTransaction>(`${BASE_PATH}/transactions/award`, data);
    },

    // Award bonus points
    awardBonus: (data: {
      clientId: string;
      points: number;
      description: string;
      reason: 'welcome' | 'birthday' | 'referral' | 'manual';
    }): Promise<PointsTransaction> => {
      return api.post<PointsTransaction>(`${BASE_PATH}/transactions/bonus`, data);
    },

    // Adjust points (admin only)
    adjustPoints: (data: {
      clientId: string;
      points: number;
      description: string;
    }): Promise<PointsTransaction> => {
      return api.post<PointsTransaction>(`${BASE_PATH}/transactions/adjust`, data);
    },

    // Expire points manually
    expirePoints: (data: {
      clientId: string;
      points: number;
      description: string;
    }): Promise<PointsTransaction> => {
      return api.post<PointsTransaction>(`${BASE_PATH}/transactions/expire`, data);
    },
  },

  // ===== CLIENT REWARDS (Redeemed) =====
  clientRewards: {
    list: (
      params: PaginationParams & {
        clientId?: string;
        status?: 'available' | 'used' | 'expired';
        unitId?: string;
      }
    ): Promise<PaginatedResponse<ClientReward>> => {
      return api.get<PaginatedResponse<ClientReward>>(
        `${BASE_PATH}/client-rewards`,
        params
      );
    },

    getByClient: (
      clientId: string,
      status?: 'available' | 'used' | 'expired'
    ): Promise<ClientReward[]> => {
      return api.get<ClientReward[]>(
        `${BASE_PATH}/client-rewards/client/${clientId}`,
        { status }
      );
    },

    // Redeem a reward
    redeem: (data: {
      clientId: string;
      rewardId: string;
    }): Promise<ClientReward> => {
      return api.post<ClientReward>(`${BASE_PATH}/client-rewards/redeem`, data);
    },

    // Use a redeemed reward
    use: (
      clientRewardId: string,
      appointmentId?: string
    ): Promise<ClientReward> => {
      return api.post<ClientReward>(
        `${BASE_PATH}/client-rewards/${clientRewardId}/use`,
        { appointmentId }
      );
    },

    // Cancel/refund a reward
    cancel: (
      clientRewardId: string,
      refundPoints: boolean
    ): Promise<ClientReward> => {
      return api.post<ClientReward>(
        `${BASE_PATH}/client-rewards/${clientRewardId}/cancel`,
        { refundPoints }
      );
    },
  },

  // ===== CLIENT SUMMARY =====
  getMemberSummary: (clientId: string): Promise<LoyaltyMemberSummary> => {
    return api.get<LoyaltyMemberSummary>(`${BASE_PATH}/members/${clientId}`);
  },

  // ===== AUTHENTICATED CLIENT ENDPOINTS =====
  // Get loyalty summary for the authenticated client
  getMyLoyaltySummary: (): Promise<LoyaltyMemberSummary> => {
    return api.get<LoyaltyMemberSummary>(`${BASE_PATH}/me`);
  },

  // Get points transactions for the authenticated client
  getMyTransactions: (
    params?: PaginationParams
  ): Promise<PaginatedResponse<PointsTransaction>> => {
    return api.get<PaginatedResponse<PointsTransaction>>(`${BASE_PATH}/me/transactions`, params);
  },

  // Get available rewards for the authenticated client
  getMyAvailableRewards: (): Promise<Reward[]> => {
    return api.get<Reward[]>(`${BASE_PATH}/me/rewards`);
  },

  // Redeem a reward for the authenticated client
  redeemMyReward: (rewardId: string): Promise<ClientReward> => {
    return api.post<ClientReward>(`${BASE_PATH}/me/rewards/${rewardId}/redeem`);
  },

  // Convert points to discount for the authenticated client
  convertMyPoints: (points: number): Promise<{ discount: number; pointsUsed: number }> => {
    return api.post(`${BASE_PATH}/me/convert`, { points });
  },

  // Get all members with pagination
  getMembers: (
    params: PaginationParams & {
      level?: string;
      search?: string;
      unitId?: string;
    }
  ): Promise<PaginatedResponse<LoyaltyMemberSummary>> => {
    return api.get<PaginatedResponse<LoyaltyMemberSummary>>(
      `${BASE_PATH}/members`,
      params
    );
  },

  // ===== LEVELS CONFIGURATION =====
  levels: {
    list: (): Promise<LoyaltyLevelConfig[]> => {
      return api.get<LoyaltyLevelConfig[]>(`${BASE_PATH}/levels`);
    },

    getById: (id: string): Promise<LoyaltyLevelConfig> => {
      return api.get<LoyaltyLevelConfig>(`${BASE_PATH}/levels/${id}`);
    },

    update: (
      id: string,
      data: Partial<LoyaltyLevelConfig>
    ): Promise<LoyaltyLevelConfig> => {
      return api.patch<LoyaltyLevelConfig>(`${BASE_PATH}/levels/${id}`, data);
    },
  },

  // ===== STATS =====
  getStats: (unitId?: string): Promise<LoyaltyStats> => {
    return api.get<LoyaltyStats>(`${BASE_PATH}/stats`, { unitId });
  },

  // ===== SETTINGS =====
  settings: {
    get: (unitId?: string): Promise<LoyaltySettings> => {
      return api.get<LoyaltySettings>(`${BASE_PATH}/settings`, { unitId });
    },

    update: (data: Partial<LoyaltySettings>): Promise<LoyaltySettings> => {
      return api.patch<LoyaltySettings>(`${BASE_PATH}/settings`, data);
    },
  },

  // ===== POINTS CONVERSION =====
  conversion: {
    // Get conversion rate (points to currency)
    getRate: (unitId?: string): Promise<{
      pointsPerCurrency: number;
      currencyPerPoint: number;
      minPointsToRedeem: number;
    }> => {
      return api.get(`${BASE_PATH}/conversion/rate`, { unitId });
    },

    // Calculate discount from points
    calculateDiscount: (data: {
      clientId: string;
      pointsToUse: number;
    }): Promise<{
      discount: number;
      pointsUsed: number;
      remainingPoints: number;
    }> => {
      return api.post(`${BASE_PATH}/conversion/calculate`, data);
    },

    // Apply points as discount to appointment
    applyDiscount: (data: {
      clientId: string;
      appointmentId: string;
      pointsToUse: number;
    }): Promise<{
      discount: number;
      pointsUsed: number;
      transaction: PointsTransaction;
    }> => {
      return api.post(`${BASE_PATH}/conversion/apply`, data);
    },
  },

  // ===== REPORTS =====
  reports: {
    // Points earned/redeemed over time
    pointsOverTime: (
      dateRange: DateRange,
      groupBy: 'day' | 'week' | 'month',
      unitId?: string
    ): Promise<{
      period: string;
      earned: number;
      redeemed: number;
      expired: number;
      netChange: number;
    }[]> => {
      return api.get(`${BASE_PATH}/reports/points-over-time`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        groupBy,
        unitId,
      });
    },

    // Rewards popularity
    rewardsPopularity: (
      dateRange: DateRange,
      unitId?: string
    ): Promise<{
      rewardId: string;
      rewardName: string;
      redemptions: number;
      pointsUsed: number;
    }[]> => {
      return api.get(`${BASE_PATH}/reports/rewards-popularity`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Members by level
    membersByLevel: (unitId?: string): Promise<{
      level: string;
      count: number;
      totalPoints: number;
      averagePoints: number;
    }[]> => {
      return api.get(`${BASE_PATH}/reports/members-by-level`, { unitId });
    },

    // Export report
    export: (
      type: 'transactions' | 'members' | 'rewards',
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
