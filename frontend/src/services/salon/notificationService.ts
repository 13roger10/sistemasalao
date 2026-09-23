// Notification Service - Push Notifications and Reminders

import { api } from './api';
import type {
  Notification,
  NotificationType,
  NotificationCreateInput,
  NotificationStats,
  NotificationPreferences,
  PushSubscription,
  PushSubscriptionInput,
  Reminder,
  ReminderCreateInput,
  ReminderSettings,
  ReminderStats,
  PushPayload,
} from '@/types/salon/notification';
import type { PaginatedResponse, PaginationParams } from '@/types/salon/common';

const BASE_PATH = '/notificacoes';

// ===== VAPID Public Key (should come from environment) =====
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// ===== Utility Functions =====
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ===== Service =====
export const notificationService = {
  // ===== Push Subscription =====
  push: {
    // Check if push is supported
    isSupported: (): boolean => {
      return 'serviceWorker' in navigator && 'PushManager' in window;
    },

    // Check if user has granted permission
    getPermission: (): NotificationPermission => {
      return Notification.permission;
    },

    // Request permission
    requestPermission: async (): Promise<NotificationPermission> => {
      const permission = await Notification.requestPermission();
      return permission;
    },

    // Subscribe to push notifications
    subscribe: async (): Promise<PushSubscription | null> => {
      try {
        if (!notificationService.push.isSupported()) {
          console.warn('Push notifications not supported');
          return null;
        }

        const permission = await notificationService.push.requestPermission();
        if (permission !== 'granted') {
          console.warn('Push notification permission denied');
          return null;
        }

        const registration = await navigator.serviceWorker.ready;

        // Get existing subscription or create new one
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as BufferSource,
          });
        }

        // Send subscription to server
        const subscriptionData: PushSubscriptionInput = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))),
            auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!)))),
          },
          userAgent: navigator.userAgent,
        };

        const savedSubscription = await api.post<PushSubscription>(
          `${BASE_PATH}/push/subscribe`,
          subscriptionData
        );

        return savedSubscription;
      } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
        return null;
      }
    },

    // Unsubscribe from push notifications
    unsubscribe: async (): Promise<boolean> => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
          // Backend espera endpoint como query param
          await api.post(`${BASE_PATH}/push/unsubscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`);
        }

        return true;
      } catch (error) {
        console.error('Failed to unsubscribe from push notifications:', error);
        return false;
      }
    },

    // Check current subscription status
    getSubscription: async (): Promise<PushSubscriptionJSON | null> => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription?.toJSON() || null;
      } catch {
        return null;
      }
    },

    // Get all subscriptions for current user (não implementado no backend)
    listSubscriptions: async (): Promise<PushSubscription[]> => {
      return [];
    },

    // Remove specific subscription (não implementado no backend)
    removeSubscription: async (_subscriptionId: string): Promise<void> => {
      console.warn('push.removeSubscription not implemented in backend');
    },

    // Send test notification (não implementado no backend)
    sendTest: async (): Promise<void> => {
      console.warn('push.sendTest not implemented in backend');
    },
  },

  // ===== Notifications =====
  notifications: {
    // List notifications
    list: async (params?: PaginationParams & { unreadOnly?: boolean }): Promise<PaginatedResponse<Notification>> => {
      try {
        const response = await api.get<{ content: Record<string, unknown>[]; totalElements: number; totalPages: number; number: number; size: number }>(BASE_PATH, params);
        const tipoMap: Record<string, NotificationType> = {
          AGENDAMENTO_PENDENTE: 'appointment_pending_confirmation',
          AGENDAMENTO_CONFIRMADO: 'appointment_confirmed',
          AGENDAMENTO_CONFIRMADO_CLIENTE: 'appointment_confirmed_by_client',
          AGENDAMENTO_CANCELADO: 'appointment_cancelled',
          AGENDAMENTO_REAGENDADO: 'appointment_rescheduled',
          LEMBRETE_24H: 'appointment_reminder',
          LEMBRETE_2H: 'appointment_reminder',
          AVALIACAO_RECEBIDA: 'review_request',
          FIDELIDADE_CREDITO: 'loyalty_reward',
          FIDELIDADE_NIVEL: 'loyalty_reward',
          PROMOCAO: 'promotion',
          SISTEMA: 'general',
          POST_FALHOU: 'general',
          COMISSAO_DISPONIVEL: 'comissao_disponivel',
          PAGAMENTO_REALIZADO: 'pagamento_realizado',
        };
        const items: Notification[] = (response.content || []).map((n) => ({
          id: String(n.id),
          userId: '',
          type: tipoMap[String(n.tipo)] ?? 'general',
          title: String(n.titulo ?? ''),
          body: String(n.mensagem ?? ''),
          icon: n.icone as string | undefined,
          url: n.link as string | undefined,
          read: Boolean(n.lida),
          sent: true,
          createdAt: n.criadoEm ? new Date(n.criadoEm as string) : new Date(),
        }));
        return {
          data: items,
          items,
          meta: {
            total: response.totalElements || 0,
            page: response.number || 0,
            limit: response.size || 20,
            totalPages: response.totalPages || 0,
            hasNextPage: (response.number || 0) < (response.totalPages || 0) - 1,
            hasPrevPage: (response.number || 0) > 0,
          },
        };
      } catch {
        return { data: [], items: [], meta: { total: 0, page: 0, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false } };
      }
    },

    // Get single notification (não implementado no backend)
    getById: async (id: string): Promise<Notification> => {
      console.warn('getById not implemented in backend');
      return { id, userId: '', title: '', body: '', type: 'general', read: false, sent: false, createdAt: new Date() } as Notification;
    },

    // Create notification (não implementado no backend)
    create: async (data: NotificationCreateInput): Promise<Notification> => {
      console.warn('create not implemented in backend');
      return { id: '', ...data, read: false, sent: false, createdAt: new Date() } as Notification;
    },

    // Mark as read
    markAsRead: async (id: string): Promise<Notification> => {
      await api.post<void>(`${BASE_PATH}/${id}/lida`);
      return { id, userId: '', title: '', body: '', type: 'general', read: true, sent: false, createdAt: new Date() } as Notification;
    },

    // Mark all as read
    markAllAsRead: (): Promise<void> => {
      return api.post(`${BASE_PATH}/lidas`);
    },

    // Delete notification (não implementado no backend)
    delete: async (id: string): Promise<void> => {
      console.warn('delete not implemented in backend', id);
    },

    // Get stats (usa resumo do backend)
    getStats: async (): Promise<NotificationStats> => {
      const emptyByType: Record<NotificationType, number> = {
        appointment_reminder: 0,
        appointment_confirmed: 0,
        appointment_cancelled: 0,
        new_appointment: 0,
        appointment_rescheduled: 0,
        payment_received: 0,
        review_request: 0,
        promotion: 0,
        birthday: 0,
        loyalty_reward: 0,
        stock_low: 0,
        comissao_disponivel: 0,
        pagamento_realizado: 0,
        appointment_pending_confirmation: 0,
        appointment_confirmed_by_client: 0,
        general: 0,
      };
      try {
        const resumo = await api.get<{ naoLidas: number; ultimasNotificacoes: Notification[] }>(`${BASE_PATH}/resumo`);
        return {
          total: resumo.ultimasNotificacoes?.length || 0,
          unread: resumo.naoLidas || 0,
          sent: 0,
          pending: 0,
          byType: emptyByType,
        };
      } catch {
        return { total: 0, unread: 0, sent: 0, pending: 0, byType: emptyByType };
      }
    },

    // Get unread count (usa resumo do backend)
    getUnreadCount: async (): Promise<{ count: number }> => {
      try {
        const resumo = await api.get<{ naoLidas: number }>(`${BASE_PATH}/resumo`);
        return { count: resumo.naoLidas || 0 };
      } catch {
        return { count: 0 };
      }
    },
  },

  // ===== Preferences =====
  preferences: {
    // Get preferences (não implementado no backend - retorna padrão)
    get: async (): Promise<NotificationPreferences> => {
      // Retorna preferências padrão já que o endpoint não existe
      return {
        userId: '',
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: false,
        categories: {
          appointments: true,
          promotions: true,
          reviews: true,
          loyalty: true,
          reminders: true,
          marketing: false,
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
        updatedAt: new Date(),
      };
    },

    // Update preferences (não implementado no backend)
    update: async (data: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
      console.warn('preferences.update not implemented in backend');
      const defaultPrefs: NotificationPreferences = {
        userId: '',
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: false,
        categories: {
          appointments: true,
          promotions: true,
          reviews: true,
          loyalty: true,
          reminders: true,
          marketing: false,
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
        updatedAt: new Date(),
      };
      return { ...defaultPrefs, ...data };
    },
  },

  // ===== Reminders (não implementado no backend - retorna valores padrão) =====
  reminders: {
    // List reminders for an appointment
    listByAppointment: async (_appointmentId: string): Promise<Reminder[]> => {
      return [];
    },

    // List pending reminders
    listPending: async (): Promise<Reminder[]> => {
      return [];
    },

    // Create reminder
    create: async (data: ReminderCreateInput): Promise<Reminder> => {
      console.warn('reminders.create not implemented in backend');
      return {
        id: '',
        appointmentId: data.appointmentId,
        clientId: '',
        type: data.type,
        scheduledFor: data.scheduledFor,
        sent: false,
        channel: data.channel,
        createdAt: new Date(),
      };
    },

    // Cancel reminder
    cancel: async (_id: string): Promise<void> => {
      console.warn('reminders.cancel not implemented in backend');
    },

    // Send reminder immediately
    sendNow: async (_id: string): Promise<void> => {
      console.warn('reminders.sendNow not implemented in backend');
    },

    // Get reminder settings
    getSettings: async (): Promise<ReminderSettings> => {
      return {
        enabled: true,
        defaultChannels: ['push', 'email'],
        dayBefore: {
          enabled: true,
          time: '09:00',
        },
        hoursBefore: {
          enabled: true,
          hours: 2,
        },
      };
    },

    // Update reminder settings
    updateSettings: async (data: Partial<ReminderSettings>): Promise<ReminderSettings> => {
      console.warn('reminders.updateSettings not implemented in backend');
      const defaultSettings: ReminderSettings = {
        enabled: true,
        defaultChannels: ['push', 'email'],
        dayBefore: {
          enabled: true,
          time: '09:00',
        },
        hoursBefore: {
          enabled: true,
          hours: 2,
        },
      };
      return { ...defaultSettings, ...data };
    },

    // Get stats
    getStats: async (): Promise<ReminderStats> => {
      return {
        total: 0,
        sent: 0,
        pending: 0,
        byChannel: {
          push: 0,
          sms: 0,
          email: 0,
          whatsapp: 0,
        },
      };
    },

    // Schedule automatic reminders for an appointment
    scheduleForAppointment: async (
      _appointmentId: string,
      _options?: { dayBefore?: boolean; hoursBefore?: number }
    ): Promise<Reminder[]> => {
      console.warn('reminders.scheduleForAppointment not implemented in backend');
      return [];
    },

    // Cancel all reminders for an appointment
    cancelForAppointment: async (_appointmentId: string): Promise<void> => {
      console.warn('reminders.cancelForAppointment not implemented in backend');
    },
  },

  // ===== Local Notifications (for offline support) =====
  local: {
    // Show local notification
    show: async (payload: PushPayload): Promise<void> => {
      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-72x72.png',
        data: payload.data,
        tag: payload.tag,
        renotify: payload.renotify,
        requireInteraction: payload.requireInteraction,
        silent: payload.silent,
      } as NotificationOptions);
    },

    // Schedule local reminder (uses service worker)
    scheduleReminder: async (reminder: {
      id: string;
      appointmentId: string;
      title: string;
      body: string;
      scheduledTime: number; // timestamp
    }): Promise<void> => {
      const registration = await navigator.serviceWorker.ready;

      if (registration.active) {
        registration.active.postMessage({
          type: 'SCHEDULE_REMINDER',
          reminder,
        });
      }
    },

    // Cancel local reminder
    cancelReminder: async (reminderId: string): Promise<void> => {
      const registration = await navigator.serviceWorker.ready;

      if (registration.active) {
        registration.active.postMessage({
          type: 'CANCEL_REMINDER',
          reminderId,
        });
      }
    },
  },

  // ===== Bulk Operations (não implementado no backend) =====
  bulk: {
    // Send notification to multiple users
    sendToUsers: async (
      _userIds: string[],
      _notification: Omit<NotificationCreateInput, 'userId'>
    ): Promise<{ sent: number; failed: number }> => {
      console.warn('bulk.sendToUsers not implemented in backend');
      return { sent: 0, failed: 0 };
    },

    // Send to all users in a unit
    sendToUnit: async (
      _unitId: string,
      _notification: Omit<NotificationCreateInput, 'userId'>
    ): Promise<{ sent: number; failed: number }> => {
      console.warn('bulk.sendToUnit not implemented in backend');
      return { sent: 0, failed: 0 };
    },

    // Send appointment reminders for a date
    sendRemindersForDate: async (_date: Date): Promise<{ sent: number }> => {
      console.warn('bulk.sendRemindersForDate not implemented in backend');
      return { sent: 0 };
    },
  },
};
