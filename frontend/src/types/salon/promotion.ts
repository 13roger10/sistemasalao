// Promotion types for the salon system

import { ID, Timestamps, Status, DateRange, SoftDelete } from './common';

// Coupons
export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon extends Timestamps, SoftDelete {
  id: ID;
  code: string;
  description?: string;

  // Discount
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number; // Cap for percentage discounts

  // Validity
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;

  // Usage limits
  maxUses?: number;
  maxUsesPerClient?: number;
  currentUses: number;

  // Conditions
  minPurchaseAmount?: number;
  applicableServiceIds?: ID[];
  applicableCategoryIds?: ID[];
  excludedServiceIds?: ID[];

  // Target
  isPublic: boolean;
  targetClientIds?: ID[];
  targetLoyaltyLevels?: ('bronze' | 'silver' | 'gold')[];
  isFirstPurchaseOnly?: boolean;
  isBirthdayOnly?: boolean;

  // Multi-unit
  unitIds?: ID[];

  // Analytics
  totalDiscountGiven: number;
}

export interface CouponCreateInput {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  maxUses?: number;
  maxUsesPerClient?: number;
  minPurchaseAmount?: number;
  applicableServiceIds?: ID[];
  applicableCategoryIds?: ID[];
  isPublic?: boolean;
  targetClientIds?: ID[];
  targetLoyaltyLevels?: Coupon['targetLoyaltyLevels'];
  isFirstPurchaseOnly?: boolean;
  isBirthdayOnly?: boolean;
  unitIds?: ID[];
}

export interface CouponFilters {
  search?: string;
  isActive?: boolean;
  isExpired?: boolean;
  hasUsesRemaining?: boolean;
  dateRange?: DateRange;
  unitId?: ID;
}

export interface CouponUsage extends Timestamps {
  id: ID;
  couponId: ID;
  couponCode: string;
  clientId: ID;
  clientName: string;
  appointmentId: ID;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  usedAt: Date;
}

// Campaigns
export type CampaignTrigger =
  | 'birthday' // Client's birthday
  | 'inactive_60_days' // 60+ days without visit
  | 'after_first_visit' // After first visit
  | 'after_service' // After completing a service
  | 'welcome' // New client registration
  | 'manual'; // Manual trigger

export type CampaignChannel = 'whatsapp' | 'email' | 'sms' | 'push';

export interface Campaign extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  description?: string;

  // Trigger
  trigger: CampaignTrigger;
  triggerConfig?: {
    inactiveDays?: number;
    afterServiceDays?: number;
    serviceIds?: ID[];
  };

  // Channel
  channel: CampaignChannel;
  template: string;
  subject?: string; // For email

  // Promotion
  couponId?: ID;
  coupon?: Coupon;

  // Schedule
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  sendTime?: string; // HH:mm - preferred send time

  // Analytics
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;

  // Multi-unit
  unitIds?: ID[];
}

export interface CampaignCreateInput {
  name: string;
  description?: string;
  trigger: CampaignTrigger;
  triggerConfig?: Campaign['triggerConfig'];
  channel: CampaignChannel;
  template: string;
  subject?: string;
  couponId?: ID;
  validFrom?: Date;
  validUntil?: Date;
  sendTime?: string;
  unitIds?: ID[];
}

export interface CampaignExecution extends Timestamps {
  id: ID;
  campaignId: ID;
  clientId: ID;
  clientName: string;
  channel: CampaignChannel;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  convertedAt?: Date;
  appointmentId?: ID;
  errorMessage?: string;
}

// Cashback
export interface CashbackRule extends Timestamps {
  id: ID;
  name: string;
  percentage: number;
  minPurchaseAmount?: number;
  maxCashbackAmount?: number;

  // Applicable to
  applicableServiceIds?: ID[];
  applicableCategoryIds?: ID[];
  applicableLoyaltyLevels?: ('bronze' | 'silver' | 'gold')[];

  // Validity
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;

  // Expiration
  cashbackExpirationDays: number;

  unitIds?: ID[];
}

export interface ClientCashback extends Timestamps {
  id: ID;
  clientId: ID;
  ruleId: ID;
  appointmentId: ID;

  amount: number;
  expiresAt: Date;
  usedAt?: Date;
  usedInAppointmentId?: ID;

  status: 'available' | 'used' | 'expired';
}

// Package / Bundle
export interface PromotionalPackage extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  description?: string;
  image?: string;

  // Services included
  services: {
    serviceId: ID;
    quantity: number;
    service?: {
      name: string;
      price: number;
    };
  }[];

  // Pricing
  regularPrice: number;
  packagePrice: number;
  discountPercentage: number;

  // Validity
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;

  // Limits
  maxSales?: number;
  currentSales: number;

  // Usage
  validityDays: number; // Days to use after purchase
  canBeGifted: boolean;

  unitIds?: ID[];
}

export interface ClientPackage extends Timestamps {
  id: ID;
  clientId: ID;
  packageId: ID;
  package?: PromotionalPackage;

  purchasedAt: Date;
  expiresAt: Date;

  // Services remaining
  servicesRemaining: {
    serviceId: ID;
    remainingQuantity: number;
    usedQuantity: number;
  }[];

  status: 'active' | 'completed' | 'expired';
  paidAmount: number;
}

export interface PromotionStats {
  activeCoupons: number;
  activeCampaigns: number;
  totalDiscountsThisMonth: number;
  totalCashbackIssued: number;
  couponUsageRate: number;
  topCoupons: {
    couponId: ID;
    code: string;
    uses: number;
    totalDiscount: number;
  }[];
  campaignPerformance: {
    campaignId: ID;
    name: string;
    conversionRate: number;
  }[];
}
