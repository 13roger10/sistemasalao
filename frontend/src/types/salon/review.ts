// Review/Rating types for the salon system

import { ID, Timestamps, SoftDelete, DateRange } from './common';

export type ReviewStatus = 'pending' | 'published' | 'hidden' | 'spam';

export interface Review extends Timestamps, SoftDelete {
  id: ID;

  // Who
  clientId: ID;
  clientName: string;
  clientAvatar?: string;
  professionalId: ID;
  professionalName: string;

  // What
  appointmentId: ID;
  serviceIds: ID[];
  serviceNames: string[];

  // Rating
  rating: number; // 1-5
  comment?: string;

  // Status
  status: ReviewStatus;
  isVerified: boolean;

  // Response
  response?: string;
  respondedAt?: Date;
  respondedById?: ID;
  respondedByName?: string;

  // Moderation
  moderatedAt?: Date;
  moderatedById?: ID;
  moderationReason?: string;

  // Meta
  source: 'online' | 'admin';
  requestSentAt?: Date;

  // Multi-unit
  unitId: ID;
}

export interface ReviewCreateInput {
  appointmentId: ID;
  rating: number;
  comment?: string;
}

export interface ReviewFilters {
  professionalId?: ID;
  clientId?: ID;
  status?: ReviewStatus;
  rating?: number;
  minRating?: number;
  maxRating?: number;
  hasComment?: boolean;
  hasResponse?: boolean;
  dateRange?: DateRange;
  unitId?: ID;
}

// Review Request
export interface ReviewRequest extends Timestamps {
  id: ID;
  appointmentId: ID;
  clientId: ID;
  clientName: string;
  professionalId: ID;
  token: string;
  expiresAt: Date;
  sentAt: Date;
  sentVia: 'whatsapp' | 'email' | 'sms';
  openedAt?: Date;
  completedAt?: Date;
  reviewId?: ID;
  status: 'pending' | 'opened' | 'completed' | 'expired';
}

// Professional Rating Summary
export interface ProfessionalRatingSummary {
  professionalId: ID;
  professionalName: string;
  avatar?: string;

  averageRating: number;
  totalReviews: number;

  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };

  recentReviews: Review[];

  trend: {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
    direction: 'up' | 'down' | 'stable';
  };

  // NPS
  promoters: number; // 9-10 (scaled from 5-star: 5)
  passives: number; // 7-8 (scaled: 4)
  detractors: number; // 0-6 (scaled: 1-3)
  npsScore: number;
}

// Review Analytics
export interface ReviewAnalytics {
  period: DateRange;
  unitId?: ID;

  overview: {
    totalReviews: number;
    averageRating: number;
    responseRate: number;
    averageResponseTime: number; // in hours
  };

  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };

  trendByPeriod: {
    date: string;
    averageRating: number;
    count: number;
  }[];

  byProfessional: {
    professionalId: ID;
    professionalName: string;
    averageRating: number;
    totalReviews: number;
    trend: 'up' | 'down' | 'stable';
  }[];

  byService: {
    serviceId: ID;
    serviceName: string;
    averageRating: number;
    totalReviews: number;
  }[];

  nps: {
    score: number;
    promoters: number;
    passives: number;
    detractors: number;
    trend: number; // Change from previous period
  };

  topComments: {
    positive: {
      reviewId: ID;
      comment: string;
      rating: number;
      clientName: string;
    }[];
    negative: {
      reviewId: ID;
      comment: string;
      rating: number;
      clientName: string;
    }[];
  };

  keywords: {
    word: string;
    count: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];
}

// Review Settings
export interface ReviewSettings {
  id: ID;
  unitId?: ID;

  // Request settings
  autoRequestReview: boolean;
  requestDelay: number; // Hours after appointment
  requestChannel: ('whatsapp' | 'email' | 'sms')[];
  requestTemplate: string;
  requestExpirationDays: number;

  // Moderation
  autoPublish: boolean;
  moderateNegativeReviews: boolean;
  negativeThreshold: number; // Rating below this requires moderation

  // Display
  showOnPublicProfile: boolean;
  minimumRatingToShow: number;

  // Notifications
  notifyOnNewReview: boolean;
  notifyOnNegativeReview: boolean;
  notifyEmail?: string;
}

// Review Stats
export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  pendingResponses: number;
  reviewsThisMonth: number;
  npsScore: number;
  topRatedProfessional?: {
    professionalId: ID;
    professionalName: string;
    rating: number;
  };
}

// Public Review (for client-facing pages)
export interface PublicReview {
  id: ID;
  clientName: string;
  clientInitials: string;
  rating: number;
  comment?: string;
  date: Date;
  professionalName: string;
  services: string[];
  response?: {
    text: string;
    date: Date;
  };
}
