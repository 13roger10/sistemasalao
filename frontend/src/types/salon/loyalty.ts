// Loyalty/Rewards types for the salon system

import { ID, Timestamps, DateRange, SoftDelete } from './common';
import { LoyaltyLevel } from './client';

// Loyalty Levels Configuration
export interface LoyaltyLevelConfig extends Timestamps {
  id: ID;
  level: LoyaltyLevel;
  name: string;
  description?: string;
  icon?: string;
  color: string;

  // Requirements
  minPoints: number;
  maxPoints?: number;

  // Benefits
  pointsMultiplier: number; // e.g., 1.5x for gold
  discountPercentage?: number;
  priorityBooking: boolean;
  exclusiveServices?: ID[];

  // Visuals
  badgeImage?: string;

  order: number;
  isActive: boolean;
}

// Points Rules
export type PointsRuleType =
  | 'per_currency' // X points per R$1
  | 'per_service' // X points per service
  | 'per_visit' // X points per visit
  | 'bonus'; // Bonus points

export interface PointsRule extends Timestamps {
  id: ID;
  name: string;
  description?: string;
  type: PointsRuleType;

  // Value
  pointsValue: number;
  currencyValue?: number; // For per_currency type

  // Conditions
  applicableServiceIds?: ID[];
  applicableCategoryIds?: ID[];
  applicableLoyaltyLevels?: LoyaltyLevel[];
  minPurchaseAmount?: number;

  // Schedule
  validFrom?: Date;
  validUntil?: Date;
  activeDays?: number[]; // 0-6 for specific days
  isActive: boolean;

  // Limits
  maxPointsPerTransaction?: number;
  maxPointsPerDay?: number;

  priority: number;
  unitId?: ID;
}

export interface PointsRuleCreateInput {
  name: string;
  description?: string;
  type: PointsRuleType;
  pointsValue: number;
  currencyValue?: number;
  applicableServiceIds?: ID[];
  applicableCategoryIds?: ID[];
  applicableLoyaltyLevels?: LoyaltyLevel[];
  minPurchaseAmount?: number;
  validFrom?: Date;
  validUntil?: Date;
  activeDays?: number[];
  maxPointsPerTransaction?: number;
  maxPointsPerDay?: number;
  unitId?: ID;
}

// Rewards
export type RewardType =
  | 'free_service'
  | 'discount_percentage'
  | 'discount_fixed'
  | 'product'
  | 'upgrade';

export interface Reward extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  description?: string;
  image?: string;

  type: RewardType;
  pointsCost: number;

  // Value
  discountValue?: number; // For discount types
  serviceId?: ID; // For free_service
  serviceName?: string;
  productId?: ID; // For product
  productName?: string;

  // Conditions
  applicableServiceIds?: ID[];
  minPurchaseAmount?: number;
  requiredLoyaltyLevel?: LoyaltyLevel;

  // Validity
  validityDays: number; // Days to use after redemption
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;

  // Limits
  maxRedemptions?: number;
  maxRedemptionsPerClient?: number;
  currentRedemptions: number;

  // Stats
  totalRedemptions: number;

  unitId?: ID;
}

export interface RewardCreateInput {
  name: string;
  description?: string;
  image?: string;
  type: RewardType;
  pointsCost: number;
  discountValue?: number;
  serviceId?: ID;
  productId?: ID;
  applicableServiceIds?: ID[];
  minPurchaseAmount?: number;
  requiredLoyaltyLevel?: LoyaltyLevel;
  validityDays: number;
  validFrom?: Date;
  validUntil?: Date;
  maxRedemptions?: number;
  maxRedemptionsPerClient?: number;
  unitId?: ID;
}

// Points Transactions
export type PointsTransactionType = 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';

export interface PointsTransaction extends Timestamps {
  id: ID;
  clientId: ID;
  clientName?: string;

  type: PointsTransactionType;
  points: number; // Positive for earn, negative for redeem/expire
  balanceAfter: number;

  // Reference
  appointmentId?: ID;
  rewardId?: ID;
  rewardName?: string;
  ruleId?: ID;
  ruleName?: string;

  description: string;
  expiresAt?: Date;

  // Who
  createdById?: ID;
  createdByName?: string;

  unitId: ID;
}

export interface PointsTransactionFilters {
  clientId?: ID;
  type?: PointsTransactionType;
  dateRange?: DateRange;
  unitId?: ID;
}

// Client Rewards (Redeemed)
export interface ClientReward extends Timestamps {
  id: ID;
  clientId: ID;
  rewardId: ID;
  reward?: Reward;

  pointsUsed: number;
  redeemedAt: Date;
  expiresAt: Date;
  usedAt?: Date;
  usedInAppointmentId?: ID;

  status: 'available' | 'used' | 'expired';
  code?: string;

  unitId: ID;
}

// Loyalty Program (10 cuts = 1 free)
export interface LoyaltyProgram extends Timestamps {
  id: ID;
  name: string;
  description?: string;

  // Rule: X services = Y free
  requiredServices: number; // e.g., 10
  rewardServices: number; // e.g., 1
  applicableServiceIds?: ID[]; // Which services count

  // Track progress
  trackByService: boolean; // Count specific services or any service

  isActive: boolean;
  unitId?: ID;
}

export interface ClientLoyaltyProgress extends Timestamps {
  id: ID;
  clientId: ID;
  programId: ID;
  program?: LoyaltyProgram;

  currentCount: number;
  completedCycles: number;
  lastServiceAt?: Date;

  // History
  serviceHistory: {
    appointmentId: ID;
    serviceId: ID;
    serviceName: string;
    date: Date;
  }[];

  // Available free services
  freeServicesAvailable: number;
  freeServicesUsed: number;
}

// Member Summary
export interface LoyaltyMemberSummary {
  clientId: ID;
  clientName: string;
  avatar?: string;

  // Level
  currentLevel: LoyaltyLevel;
  nextLevel?: LoyaltyLevel;
  pointsToNextLevel?: number;

  // Points
  currentPoints: number;
  lifetimePoints: number;
  pointsExpiringSoon: number;
  expirationDate?: Date;

  // Progress (for 10=1 program)
  programProgress?: {
    programId: ID;
    programName: string;
    current: number;
    required: number;
    freeServicesAvailable: number;
  };

  // Rewards
  availableRewards: {
    rewardId: ID;
    rewardName: string;
    pointsCost: number;
    canRedeem: boolean;
  }[];

  redeemedRewards: {
    rewardId: ID;
    rewardName: string;
    status: 'available' | 'used' | 'expired';
    expiresAt?: Date;
  }[];

  // Activity
  lastActivity?: Date;
  memberSince: Date;
}

// Loyalty Stats
export interface LoyaltyStats {
  totalMembers: number;
  membersByLevel: Record<LoyaltyLevel, number>;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  totalRewardsRedeemed: number;
  pointsExpiringSoon: number;
  mostPopularRewards: {
    rewardId: ID;
    rewardName: string;
    redemptions: number;
  }[];
  topMembers: {
    clientId: ID;
    clientName: string;
    points: number;
    level: LoyaltyLevel;
  }[];
}

// Loyalty Settings
export interface LoyaltySettings {
  id: ID;
  unitId?: ID;

  // Program
  programEnabled: boolean;
  programName: string;

  // Points
  defaultPointsPerCurrency: number; // Points per R$1
  welcomeBonus: number;
  referralBonus: number;
  birthdayBonus: number;

  // Expiration
  pointsExpire: boolean;
  expirationMonths: number;

  // Notifications
  notifyOnPointsEarned: boolean;
  notifyOnLevelUp: boolean;
  notifyBeforeExpiration: boolean;
  expirationWarningDays: number;

  // Display
  showPointsOnReceipt: boolean;
  showLevelOnProfile: boolean;
}
