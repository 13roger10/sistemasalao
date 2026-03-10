// Client hooks with React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/salon';
import type {
  Client,
  ClientCreateInput,
  ClientUpdateInput,
  ClientFilters,
} from '@/types/salon';
import type { PaginationParams } from '@/types/salon/common';

// Query keys
export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (params: PaginationParams & ClientFilters) =>
    [...clientKeys.lists(), params] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
  history: (id: string) => [...clientKeys.detail(id), 'history'] as const,
  stats: (unitId?: string) => [...clientKeys.all, 'stats', unitId] as const,
  birthdays: (params: { month?: number; days?: number; unitId?: string }) =>
    [...clientKeys.all, 'birthdays', params] as const,
  inactive: (params: PaginationParams & { days?: number; unitId?: string }) =>
    [...clientKeys.all, 'inactive', params] as const,
  search: (query: string) => [...clientKeys.all, 'search', query] as const,
};

// List clients
export function useClients(params: PaginationParams & ClientFilters) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => clientService.list(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get single client
export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => clientService.getById(id),
    enabled: !!id,
  });
}

// Get client history
export function useClientHistory(id: string) {
  return useQuery({
    queryKey: clientKeys.history(id),
    queryFn: () => clientService.getHistory(id),
    enabled: !!id,
  });
}

// Get client stats
export function useClientStats(unitId?: string) {
  return useQuery({
    queryKey: clientKeys.stats(unitId),
    queryFn: () => clientService.getStats(unitId),
    staleTime: 1000 * 60 * 5,
  });
}

// Get birthdays
export function useBirthdays(params: { month?: number; days?: number; unitId?: string }) {
  return useQuery({
    queryKey: clientKeys.birthdays(params),
    queryFn: () => clientService.getBirthdays(params),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Get inactive clients
export function useInactiveClients(
  params: PaginationParams & { days?: number; unitId?: string }
) {
  return useQuery({
    queryKey: clientKeys.inactive(params),
    queryFn: () => clientService.getInactive(params),
    staleTime: 1000 * 60 * 15,
  });
}

// Search clients
export function useClientSearch(query: string, limit?: number) {
  return useQuery({
    queryKey: clientKeys.search(query),
    queryFn: () => clientService.search(query, limit),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 2,
  });
}

// Create client mutation
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClientCreateInput) => clientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats() });
    },
  });
}

// Update client mutation
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientUpdateInput }) =>
      clientService.update(id, data),
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.setQueryData(
        clientKeys.detail(updatedClient.id),
        updatedClient
      );
    },
  });
}

// Delete client mutation
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.removeQueries({ queryKey: clientKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats() });
    },
  });
}

// Update loyalty points mutation
export function useUpdateLoyaltyPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      points,
      reason,
    }: {
      id: string;
      points: number;
      reason: string;
    }) => clientService.updateLoyaltyPoints(id, points, reason),
    onSuccess: (updatedClient) => {
      queryClient.setQueryData(
        clientKeys.detail(updatedClient.id),
        updatedClient
      );
    },
  });
}
