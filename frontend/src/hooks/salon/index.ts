// Salon Hooks - Export all

// Client hooks
export {
  clientKeys,
  useClients,
  useClient,
  useClientHistory,
  useClientStats,
  useBirthdays,
  useInactiveClients,
  useClientSearch,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useUpdateLoyaltyPoints,
} from './useClients';

// Appointment hooks
export {
  appointmentKeys,
  useAppointments,
  useAppointment,
  useCalendarEvents,
  useTodayAppointments,
  useAppointmentStats,
  useAvailability,
  useWaitlist,
  useCreateAppointment,
  useUpdateAppointment,
  useConfirmAppointment,
  useCancelAppointment,
  useStartAppointment,
  useCompleteAppointment,
  useNoShowAppointment,
  useRescheduleAppointment,
  useApplyCoupon,
  useAddToWaitlist,
  useRemoveFromWaitlist,
} from './useAppointments';

// Professional hooks (to be implemented)
// export * from './useProfessionals';

// Service hooks (to be implemented)
// export * from './useServices';

// Finance hooks (to be implemented)
// export * from './useFinance';

// PWA hooks
export { usePWA } from './usePWA';

// Notification hooks
export { useNotifications } from './useNotifications';

// More hooks will be added here...
