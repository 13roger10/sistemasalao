// Notification Service - Push Notifications and Reminders

import { api } from './api';
import type {
  Notification,
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

const BASE_PATH = '/salon/notifications';

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
          await api.post(`${BASE_PATH}/push/unsubscribe`, {
            endpoint: subscription.endpoint,
          });
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

    // Get all subscriptions for current user
    listSubscriptions: (): Promise<PushSubscription[]> => {
      return api.get<PushSubscription[]>(`${BASE_PATH}/push/subscriptions`);
    },

    // Remove specific subscription
    removeSubscription: (subscriptionId: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/push/subscriptions/${subscriptionId}`);
    },

    // Send test notification
    sendTest: (): Promise<void> => {
      return api.post(`${BASE_PATH}/push/test`);
    },
  },

  // ===== Notifications =====
  notifications: {
    // List notifications
    list: (params?: PaginationParams & { unreadOnly?: boolean }): Promise<PaginatedResponse<Notification>> => {
      return api.get<PaginatedResponse<Notification>>(BASE_PATH, params);
    },

    // Get single notification
    getById: (id: string): Promise<Notification> => {
      return api.get<Notification>(`${BASE_PATH}/${id}`);
    },

    // Create notification
    create: (data: NotificationCreateInput): Promise<Notification> => {
      return api.post<Notification>(BASE_PATH, data);
    },

    // Mark as read
    markAsRead: (id: string): Promise<Notification> => {
      return api.post<Notification>(`${BASE_PATH}/${id}/read`);
    },

    // Mark all as read
    markAllAsRead: (): Promise<void> => {
      return api.post(`${BASE_PATH}/read-all`);
    },

    // Delete notification
    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/${id}`);
    },

    // Get stats
    getStats: (): Promise<NotificationStats> => {
      return api.get<NotificationStats>(`${BASE_PATH}/stats`);
    },

    // Get unread count
    getUnreadCount: (): Promise<{ count: number }> => {
      return api.get<{ count: number }>(`${BASE_PATH}/unread-count`);
    },
  },

  // ===== Preferences =====
  preferences: {
    // Get preferences
    get: (): Promise<NotificationPreferences> => {
      return api.get<NotificationPreferences>(`${BASE_PATH}/preferences`);
    },

    // Update preferences
    update: (data: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
      return api.patch<NotificationPreferences>(`${BASE_PATH}/preferences`, data);
    },
  },

  // ===== Reminders =====
  reminders: {
    // List reminders for an appointment
    listByAppointment: (appointmentId: string): Promise<Reminder[]> => {
      return api.get<Reminder[]>(`${BASE_PATH}/reminders`, { appointmentId });
    },

    // List pending reminders
    listPending: (): Promise<Reminder[]> => {
      return api.get<Reminder[]>(`${BASE_PATH}/reminders/pending`);
    },

    // Create reminder
    create: (data: ReminderCreateInput): Promise<Reminder> => {
      return api.post<Reminder>(`${BASE_PATH}/reminders`, {
        ...data,
        scheduledFor: data.scheduledFor.toISOString(),
      });
    },

    // Cancel reminder
    cancel: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/reminders/${id}`);
    },

    // Send reminder immediately
    sendNow: (id: string): Promise<void> => {
      return api.post(`${BASE_PATH}/reminders/${id}/send`);
    },

    // Get reminder settings
    getSettings: (): Promise<ReminderSettings> => {
      return api.get<ReminderSettings>(`${BASE_PATH}/reminders/settings`);
    },

    // Update reminder settings
    updateSettings: (data: Partial<ReminderSettings>): Promise<ReminderSettings> => {
      return api.patch<ReminderSettings>(`${BASE_PATH}/reminders/settings`, data);
    },

    // Get stats
    getStats: (): Promise<ReminderStats> => {
      return api.get<ReminderStats>(`${BASE_PATH}/reminders/stats`);
    },

    // Schedule automatic reminders for an appointment
    scheduleForAppointment: (
      appointmentId: string,
      options?: { dayBefore?: boolean; hoursBefore?: number }
    ): Promise<Reminder[]> => {
      return api.post<Reminder[]>(`${BASE_PATH}/reminders/schedule`, {
        appointmentId,
        ...options,
      });
    },

    // Cancel all reminders for an appointment
    cancelForAppointment: (appointmentId: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/reminders/appointment/${appointmentId}`);
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

  // ===== Bulk Operations =====
  bulk: {
    // Send notification to multiple users
    sendToUsers: (
      userIds: string[],
      notification: Omit<NotificationCreateInput, 'userId'>
    ): Promise<{ sent: number; failed: number }> => {
      return api.post<{ sent: number; failed: number }>(`${BASE_PATH}/bulk/send`, {
        userIds,
        notification,
      });
    },

    // Send to all users in a unit
    sendToUnit: (
      unitId: string,
      notification: Omit<NotificationCreateInput, 'userId'>
    ): Promise<{ sent: number; failed: number }> => {
      return api.post<{ sent: number; failed: number }>(`${BASE_PATH}/bulk/unit/${unitId}`, {
        notification,
      });
    },

    // Send appointment reminders for a date
    sendRemindersForDate: (date: Date): Promise<{ sent: number }> => {
      return api.post<{ sent: number }>(`${BASE_PATH}/bulk/reminders`, {
        date: date.toISOString(),
      });
    },
  },
};
