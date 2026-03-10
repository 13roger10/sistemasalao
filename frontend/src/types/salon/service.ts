// Service types for the salon system

import { ID, Timestamps, Status, SoftDelete } from './common';

export interface ServiceCategory extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  status: Status;
  unitId?: ID;
}

export interface Service extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  description?: string;
  categoryId: ID;
  category?: ServiceCategory;

  // Pricing
  price: number;
  promotionalPrice?: number;
  promotionalPriceValidUntil?: Date;

  // Duration
  durationMinutes: number;
  bufferMinutes?: number; // Extra time between appointments

  // Commission
  commissionPercentage?: number; // Override professional's default

  // Stock
  usesStock: boolean;
  stockProducts?: {
    productId: ID;
    quantity: number;
  }[];

  // Loyalty
  loyaltyPointsEarned: number;
  loyaltyPointsRequired?: number; // If redeemable with points

  // Settings
  status: Status;
  showInOnlineBooking: boolean;
  requiresConfirmation: boolean;
  maxSimultaneous?: number; // For group services

  // Images
  image?: string;
  gallery?: string[];

  // Multi-unit
  unitIds: ID[]; // Available in these units
  priceByUnit?: Record<ID, number>; // Unit-specific pricing

  // Analytics
  totalBookings: number;
  averageRating: number;
}

export interface ServiceCreateInput {
  name: string;
  description?: string;
  categoryId: ID;
  price: number;
  promotionalPrice?: number;
  promotionalPriceValidUntil?: Date;
  durationMinutes: number;
  bufferMinutes?: number;
  commissionPercentage?: number;
  usesStock?: boolean;
  stockProducts?: {
    productId: ID;
    quantity: number;
  }[];
  loyaltyPointsEarned?: number;
  loyaltyPointsRequired?: number;
  showInOnlineBooking?: boolean;
  requiresConfirmation?: boolean;
  image?: string;
  unitIds?: ID[];
}

export interface ServiceUpdateInput extends Partial<ServiceCreateInput> {
  status?: Status;
}

export interface ServiceFilters {
  search?: string;
  categoryId?: ID;
  status?: Status;
  minPrice?: number;
  maxPrice?: number;
  unitId?: ID;
  showInOnlineBooking?: boolean;
  hasPromotion?: boolean;
}

// Service Combo / Package
export interface ServiceCombo extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  description?: string;
  services: {
    serviceId: ID;
    service?: Service;
  }[];

  // Pricing
  regularPrice: number; // Sum of individual prices
  comboPrice: number; // Discounted price
  discountPercentage: number;

  // Duration
  totalDurationMinutes: number;

  // Settings
  status: Status;
  showInOnlineBooking: boolean;
  validFrom?: Date;
  validUntil?: Date;
  maxUses?: number;
  currentUses: number;

  // Image
  image?: string;

  // Multi-unit
  unitIds: ID[];
}

export interface ServiceComboCreateInput {
  name: string;
  description?: string;
  serviceIds: ID[];
  comboPrice: number;
  showInOnlineBooking?: boolean;
  validFrom?: Date;
  validUntil?: Date;
  maxUses?: number;
  image?: string;
  unitIds?: ID[];
}

export interface CategoryCreateInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  unitId?: ID;
}

export interface ServiceStats {
  totalServices: number;
  activeServices: number;
  totalCategories: number;
  totalCombos: number;
  mostBooked: {
    serviceId: ID;
    serviceName: string;
    bookings: number;
  }[];
  highestRated: {
    serviceId: ID;
    serviceName: string;
    rating: number;
  }[];
}
