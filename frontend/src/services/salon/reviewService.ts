// Review Service - API calls for review/rating management

import { api } from './api';
import type {
  Review,
  ReviewCreateInput,
  ReviewFilters,
  ReviewRequest,
  ProfessionalRatingSummary,
  ReviewAnalytics,
  ReviewSettings,
  ReviewStats,
  PublicReview,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams, DateRange } from '@/types/salon/common';

const BASE_PATH = '/salon/reviews';

export const reviewService = {
  // ===== REVIEWS =====
  list: (
    params: PaginationParams & ReviewFilters
  ): Promise<PaginatedResponse<Review>> => {
    return api.get<PaginatedResponse<Review>>(`${BASE_PATH}`, {
      ...params,
      startDate: params.dateRange?.startDate?.toISOString(),
      endDate: params.dateRange?.endDate?.toISOString(),
    });
  },

  getById: (id: string): Promise<Review> => {
    return api.get<Review>(`${BASE_PATH}/${id}`);
  },

  // Create review (client submits)
  create: (data: ReviewCreateInput): Promise<Review> => {
    return api.post<Review>(`${BASE_PATH}`, data);
  },

  // Respond to a review (salon owner)
  respond: (id: string, response: string): Promise<Review> => {
    return api.post<Review>(`${BASE_PATH}/${id}/respond`, { response });
  },

  // Update review status (moderation)
  updateStatus: (
    id: string,
    status: 'published' | 'hidden' | 'spam',
    reason?: string
  ): Promise<Review> => {
    return api.patch<Review>(`${BASE_PATH}/${id}/status`, { status, reason });
  },

  // Delete review (soft delete)
  delete: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/${id}`);
  },

  // ===== CLIENT REVIEWS =====
  getByClient: (
    clientId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Review>> => {
    return api.get<PaginatedResponse<Review>>(
      `${BASE_PATH}/client/${clientId}`,
      params
    );
  },

  // Get pending review for an appointment
  getPendingForAppointment: (appointmentId: string): Promise<Review | null> => {
    return api.get<Review | null>(`${BASE_PATH}/appointment/${appointmentId}/pending`);
  },

  // Check if client can review an appointment
  canReview: (appointmentId: string): Promise<{
    canReview: boolean;
    reason?: string;
    appointmentId: string;
    professionalName: string;
    serviceName: string;
    appointmentDate: string;
  }> => {
    return api.get(`${BASE_PATH}/appointment/${appointmentId}/can-review`);
  },

  // ===== PROFESSIONAL RATINGS =====
  getProfessionalRating: (professionalId: string): Promise<ProfessionalRatingSummary> => {
    return api.get<ProfessionalRatingSummary>(
      `${BASE_PATH}/professionals/${professionalId}/rating`
    );
  },

  // Get all professionals with ratings (for ranking)
  getProfessionalsRanking: (
    params?: {
      unitId?: string;
      period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
      limit?: number;
    }
  ): Promise<ProfessionalRatingSummary[]> => {
    return api.get<ProfessionalRatingSummary[]>(
      `${BASE_PATH}/professionals/ranking`,
      params
    );
  },

  // ===== REVIEW REQUESTS =====
  requests: {
    list: (
      params: PaginationParams & {
        status?: 'pending' | 'opened' | 'completed' | 'expired';
      }
    ): Promise<PaginatedResponse<ReviewRequest>> => {
      return api.get<PaginatedResponse<ReviewRequest>>(
        `${BASE_PATH}/requests`,
        params
      );
    },

    // Send review request to client
    send: (appointmentId: string, via?: 'whatsapp' | 'email' | 'sms'): Promise<ReviewRequest> => {
      return api.post<ReviewRequest>(`${BASE_PATH}/requests/send`, {
        appointmentId,
        via,
      });
    },

    // Validate review token
    validate: (token: string): Promise<{
      valid: boolean;
      request?: ReviewRequest;
      appointmentDetails?: {
        professionalName: string;
        services: string[];
        date: string;
      };
    }> => {
      return api.get(`${BASE_PATH}/requests/validate/${token}`);
    },

    // Resend review request
    resend: (requestId: string): Promise<ReviewRequest> => {
      return api.post<ReviewRequest>(`${BASE_PATH}/requests/${requestId}/resend`);
    },
  },

  // ===== ANALYTICS =====
  getAnalytics: (
    dateRange: DateRange,
    unitId?: string
  ): Promise<ReviewAnalytics> => {
    return api.get<ReviewAnalytics>(`${BASE_PATH}/analytics`, {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      unitId,
    });
  },

  // ===== STATS =====
  getStats: (unitId?: string): Promise<ReviewStats> => {
    return api.get<ReviewStats>(`${BASE_PATH}/stats`, { unitId });
  },

  // ===== SETTINGS =====
  settings: {
    get: (unitId?: string): Promise<ReviewSettings> => {
      return api.get<ReviewSettings>(`${BASE_PATH}/settings`, { unitId });
    },

    update: (data: Partial<ReviewSettings>): Promise<ReviewSettings> => {
      return api.patch<ReviewSettings>(`${BASE_PATH}/settings`, data);
    },
  },

  // ===== PUBLIC REVIEWS =====
  getPublicReviews: (
    params: {
      professionalId?: string;
      unitId?: string;
      limit?: number;
      minRating?: number;
    }
  ): Promise<PublicReview[]> => {
    return api.get<PublicReview[]>(`${BASE_PATH}/public`, params);
  },

  // ===== REPORTS =====
  reports: {
    // Ratings over time
    ratingsOverTime: (
      dateRange: DateRange,
      groupBy: 'day' | 'week' | 'month',
      unitId?: string
    ): Promise<{
      period: string;
      averageRating: number;
      count: number;
    }[]> => {
      return api.get(`${BASE_PATH}/reports/ratings-over-time`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        groupBy,
        unitId,
      });
    },

    // Export report
    export: (
      dateRange: DateRange,
      format: 'pdf' | 'xlsx',
      unitId?: string
    ): Promise<Blob> => {
      return api.get<Blob>(`${BASE_PATH}/reports/export`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format,
        unitId,
      });
    },
  },
};
