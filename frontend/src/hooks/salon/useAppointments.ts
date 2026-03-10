// Appointment hooks with React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '@/services/salon';
import type {
  Appointment,
  AppointmentCreateInput,
  AppointmentUpdateInput,
  AppointmentFilters,
  AvailabilityRequest,
  WaitlistCreateInput,
} from '@/types/salon';
import type { PaginationParams, DateRange } from '@/types/salon/common';

// Query keys
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (params: PaginationParams & AppointmentFilters) =>
    [...appointmentKeys.lists(), params] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  calendar: (params: { startDate: Date; endDate: Date; professionalId?: string; unitId?: string }) =>
    [...appointmentKeys.all, 'calendar', params] as const,
  today: (unitId?: string) => [...appointmentKeys.all, 'today', unitId] as const,
  stats: (params: { dateRange?: DateRange; unitId?: string }) =>
    [...appointmentKeys.all, 'stats', params] as const,
  availability: (params: AvailabilityRequest) =>
    [...appointmentKeys.all, 'availability', params] as const,
  waitlist: (unitId?: string) => [...appointmentKeys.all, 'waitlist', unitId] as const,
};

// List appointments
export function useAppointments(params: PaginationParams & AppointmentFilters) {
  return useQuery({
    queryKey: appointmentKeys.list(params),
    queryFn: () => appointmentService.list(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Get single appointment
export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => appointmentService.getById(id),
    enabled: !!id,
  });
}

// Get calendar events
export function useCalendarEvents(params: {
  startDate: Date;
  endDate: Date;
  professionalId?: string;
  unitId?: string;
}) {
  return useQuery({
    queryKey: appointmentKeys.calendar(params),
    queryFn: () => appointmentService.getCalendarEvents(params),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });
}

// Get today's appointments
export function useTodayAppointments(unitId?: string) {
  return useQuery({
    queryKey: appointmentKeys.today(unitId),
    queryFn: () => appointmentService.getToday(unitId),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

// Get appointment stats
export function useAppointmentStats(params: { dateRange?: DateRange; unitId?: string }) {
  return useQuery({
    queryKey: appointmentKeys.stats(params),
    queryFn: () => appointmentService.getStats(params),
    staleTime: 1000 * 60 * 5,
  });
}

// Check availability
export function useAvailability(params: AvailabilityRequest) {
  return useQuery({
    queryKey: appointmentKeys.availability(params),
    queryFn: () => appointmentService.checkAvailability(params),
    enabled: params.serviceIds.length > 0 && !!params.date,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Get waitlist
export function useWaitlist(unitId?: string) {
  return useQuery({
    queryKey: appointmentKeys.waitlist(unitId),
    queryFn: () => appointmentService.waitlist.list(unitId),
  });
}

// Create appointment mutation
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AppointmentCreateInput) => appointmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

// Update appointment mutation
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AppointmentUpdateInput }) =>
      appointmentService.update(id, data),
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

// Confirm appointment mutation
export function useConfirmAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentService.confirm(id),
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
    },
  });
}

// Cancel appointment mutation
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      appointmentService.cancel(id, reason),
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
    },
  });
}

// Start appointment mutation
export function useStartAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentService.start(id),
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
    },
  });
}

// Complete appointment mutation
export function useCompleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      paymentData,
    }: {
      id: string;
      paymentData?: { method: string; amount: number };
    }) => appointmentService.complete(id, paymentData),
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
    },
  });
}

// Mark as no-show mutation
export function useNoShowAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentService.noShow(id),
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
    },
  });
}

// Reschedule appointment mutation
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      newDate,
      newTime,
    }: {
      id: string;
      newDate: Date;
      newTime: string;
    }) => appointmentService.reschedule(id, newDate, newTime),
    onSuccess: (updatedAppointment) => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      queryClient.setQueryData(
        appointmentKeys.detail(updatedAppointment.id),
        updatedAppointment
      );
    },
  });
}

// Apply coupon mutation
export function useApplyCoupon() {
  return useMutation({
    mutationFn: ({ id, couponCode }: { id: string; couponCode: string }) =>
      appointmentService.applyCoupon(id, couponCode),
  });
}

// Add to waitlist mutation
export function useAddToWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WaitlistCreateInput) => appointmentService.waitlist.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.waitlist() });
    },
  });
}

// Remove from waitlist mutation
export function useRemoveFromWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentService.waitlist.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.waitlist() });
    },
  });
}
