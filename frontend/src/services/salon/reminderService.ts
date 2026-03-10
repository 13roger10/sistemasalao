// Reminder Service - Automatic Appointment Reminders

import { api } from './api';
import { notificationService } from './notificationService';
import type {
  Reminder,
  ReminderCreateInput,
  ReminderSettings,
  ReminderStats,
  ReminderType,
  ReminderChannel,
} from '@/types/salon/notification';
import type { Appointment } from '@/types/salon';

const BASE_PATH = '/salon/reminders';

// ===== Default Settings =====
const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  defaultChannels: ['push'],
  dayBefore: {
    enabled: true,
    time: '18:00',
  },
  hoursBefore: {
    enabled: true,
    hours: 2,
  },
  customMessage: undefined,
};

// ===== Helper Functions =====
function calculateReminderTime(
  appointmentDate: Date,
  appointmentTime: string,
  type: ReminderType,
  settings: ReminderSettings
): Date {
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  const reminderTime = new Date(appointmentDateTime);

  switch (type) {
    case 'day_before':
      reminderTime.setDate(reminderTime.getDate() - 1);
      const [dayBeforeHours, dayBeforeMinutes] = settings.dayBefore.time.split(':').map(Number);
      reminderTime.setHours(dayBeforeHours, dayBeforeMinutes, 0, 0);
      break;

    case 'hours_before':
      reminderTime.setHours(reminderTime.getHours() - settings.hoursBefore.hours);
      break;

    default:
      break;
  }

  return reminderTime;
}

function formatReminderMessage(
  appointment: Partial<Appointment> & { serviceName?: string; professionalName?: string },
  type: ReminderType,
  customMessage?: string
): { title: string; body: string } {
  const serviceName = appointment.serviceName || appointment.services?.[0]?.service?.name || 'seu servico';
  const professionalName = appointment.professionalName || appointment.professional?.name || 'nosso profissional';
  const time = appointment.startTime || '';
  const date = appointment.date
    ? new Date(appointment.date).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : 'em breve';

  if (customMessage) {
    return {
      title: 'Lembrete de Agendamento',
      body: customMessage
        .replace('{servico}', serviceName)
        .replace('{profissional}', professionalName)
        .replace('{hora}', time)
        .replace('{data}', date),
    };
  }

  switch (type) {
    case 'day_before':
      return {
        title: 'Agendamento Amanha',
        body: `Lembrete: ${serviceName} com ${professionalName} amanha as ${time}. Te esperamos!`,
      };

    case 'hours_before':
      return {
        title: 'Agendamento em Breve',
        body: `Seu ${serviceName} com ${professionalName} e daqui a pouco, as ${time}. Nao se atrase!`,
      };

    default:
      return {
        title: 'Lembrete de Agendamento',
        body: `Voce tem ${serviceName} agendado com ${professionalName}.`,
      };
  }
}

// ===== Service =====
export const reminderService = {
  // ===== Settings =====
  settings: {
    // Get reminder settings
    get: async (): Promise<ReminderSettings> => {
      try {
        return await api.get<ReminderSettings>(`${BASE_PATH}/settings`);
      } catch {
        return DEFAULT_SETTINGS;
      }
    },

    // Update settings
    update: (data: Partial<ReminderSettings>): Promise<ReminderSettings> => {
      return api.patch<ReminderSettings>(`${BASE_PATH}/settings`, data);
    },

    // Reset to defaults
    reset: (): Promise<ReminderSettings> => {
      return api.post<ReminderSettings>(`${BASE_PATH}/settings/reset`);
    },
  },

  // ===== Reminder Management =====
  // Create reminder manually
  create: (data: ReminderCreateInput): Promise<Reminder> => {
    return api.post<Reminder>(BASE_PATH, {
      ...data,
      scheduledFor: data.scheduledFor.toISOString(),
    });
  },

  // Get reminder by ID
  getById: (id: string): Promise<Reminder> => {
    return api.get<Reminder>(`${BASE_PATH}/${id}`);
  },

  // List reminders
  list: (params?: {
    appointmentId?: string;
    clientId?: string;
    sent?: boolean;
    from?: Date;
    to?: Date;
  }): Promise<Reminder[]> => {
    return api.get<Reminder[]>(BASE_PATH, {
      ...params,
      from: params?.from?.toISOString(),
      to: params?.to?.toISOString(),
    });
  },

  // Cancel reminder
  cancel: (id: string): Promise<void> => {
    return api.delete(`${BASE_PATH}/${id}`);
  },

  // Send reminder now
  sendNow: (id: string): Promise<void> => {
    return api.post(`${BASE_PATH}/${id}/send`);
  },

  // ===== Automatic Scheduling =====
  schedule: {
    // Schedule all reminders for an appointment
    forAppointment: async (
      appointment: Partial<Appointment> & {
        id: string;
        clientId: string;
        date: Date | string;
        startTime: string;
      },
      settings?: ReminderSettings
    ): Promise<Reminder[]> => {
      const reminderSettings = settings || await reminderService.settings.get();

      if (!reminderSettings.enabled) {
        return [];
      }

      const appointmentDate = new Date(appointment.date);
      const now = new Date();
      const reminders: Reminder[] = [];

      // Schedule day-before reminder
      if (reminderSettings.dayBefore.enabled) {
        const dayBeforeTime = calculateReminderTime(
          appointmentDate,
          appointment.startTime,
          'day_before',
          reminderSettings
        );

        if (dayBeforeTime > now) {
          const { title, body } = formatReminderMessage(
            appointment,
            'day_before',
            reminderSettings.customMessage
          );

          for (const channel of reminderSettings.defaultChannels) {
            const reminder = await reminderService.create({
              appointmentId: appointment.id,
              type: 'day_before',
              scheduledFor: dayBeforeTime,
              channel,
              customMessage: body,
            });
            reminders.push(reminder);

            // Also schedule local reminder for push
            if (channel === 'push') {
              await notificationService.local.scheduleReminder({
                id: reminder.id,
                appointmentId: appointment.id,
                title,
                body,
                scheduledTime: dayBeforeTime.getTime(),
              });
            }
          }
        }
      }

      // Schedule hours-before reminder
      if (reminderSettings.hoursBefore.enabled) {
        const hoursBeforeTime = calculateReminderTime(
          appointmentDate,
          appointment.startTime,
          'hours_before',
          reminderSettings
        );

        if (hoursBeforeTime > now) {
          const { title, body } = formatReminderMessage(
            appointment,
            'hours_before',
            reminderSettings.customMessage
          );

          for (const channel of reminderSettings.defaultChannels) {
            const reminder = await reminderService.create({
              appointmentId: appointment.id,
              type: 'hours_before',
              scheduledFor: hoursBeforeTime,
              channel,
              customMessage: body,
            });
            reminders.push(reminder);

            // Also schedule local reminder for push
            if (channel === 'push') {
              await notificationService.local.scheduleReminder({
                id: reminder.id,
                appointmentId: appointment.id,
                title,
                body,
                scheduledTime: hoursBeforeTime.getTime(),
              });
            }
          }
        }
      }

      return reminders;
    },

    // Cancel all reminders for an appointment
    cancelForAppointment: async (appointmentId: string): Promise<void> => {
      const reminders = await reminderService.list({ appointmentId });

      for (const reminder of reminders) {
        if (!reminder.sent) {
          await reminderService.cancel(reminder.id);

          // Also cancel local reminder
          await notificationService.local.cancelReminder(reminder.id);
        }
      }
    },

    // Reschedule reminders when appointment is rescheduled
    rescheduleForAppointment: async (
      appointment: Partial<Appointment> & {
        id: string;
        clientId: string;
        date: Date | string;
        startTime: string;
      }
    ): Promise<Reminder[]> => {
      // Cancel existing reminders
      await reminderService.schedule.cancelForAppointment(appointment.id);

      // Schedule new reminders
      return reminderService.schedule.forAppointment(appointment);
    },

    // Schedule reminders for all appointments on a date
    forDate: async (date: Date, unitId?: string): Promise<{ scheduled: number }> => {
      return api.post<{ scheduled: number }>(`${BASE_PATH}/schedule/date`, {
        date: date.toISOString(),
        unitId,
      });
    },

    // Schedule reminders for tomorrow's appointments
    forTomorrow: async (unitId?: string): Promise<{ scheduled: number }> => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return reminderService.schedule.forDate(tomorrow, unitId);
    },
  },

  // ===== Statistics =====
  getStats: (params?: { from?: Date; to?: Date; unitId?: string }): Promise<ReminderStats> => {
    return api.get<ReminderStats>(`${BASE_PATH}/stats`, {
      from: params?.from?.toISOString(),
      to: params?.to?.toISOString(),
      unitId: params?.unitId,
    });
  },

  // ===== Bulk Operations =====
  bulk: {
    // Send all pending reminders
    sendPending: (): Promise<{ sent: number; failed: number }> => {
      return api.post<{ sent: number; failed: number }>(`${BASE_PATH}/bulk/send-pending`);
    },

    // Cancel all pending reminders for a unit
    cancelForUnit: (unitId: string): Promise<{ cancelled: number }> => {
      return api.post<{ cancelled: number }>(`${BASE_PATH}/bulk/cancel`, { unitId });
    },
  },
};
