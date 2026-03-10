// Hook for managing notifications

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/services/salon/notificationService';
import type {
  Notification,
  NotificationPreferences,
  NotificationStats,
} from '@/types/salon/notification';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats | null;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationService.notifications.list({ limit: 50 });
      setNotifications(response.items);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count } = await notificationService.notifications.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await notificationService.notifications.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching notification stats:', err);
    }
  }, []);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const data = await notificationService.preferences.get();
      setPreferences(data);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchNotifications(),
          fetchUnreadCount(),
          fetchStats(),
          fetchPreferences(),
        ]);
      } catch (err) {
        setError('Erro ao carregar notificacoes');
        console.error('Error loading notifications:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, [fetchNotifications, fetchUnreadCount, fetchStats, fetchPreferences]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchNotifications(),
      fetchUnreadCount(),
      fetchStats(),
    ]);
    setIsLoading(false);
  }, [fetchNotifications, fetchUnreadCount, fetchStats]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.notifications.markAsRead(id);

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.notifications.markAllAsRead();

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.notifications.delete(id);

      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // Update preferences
  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    try {
      const updated = await notificationService.preferences.update(prefs);
      setPreferences(updated);
    } catch (err) {
      console.error('Error updating preferences:', err);
      throw err;
    }
  }, []);

  return {
    notifications,
    unreadCount,
    stats,
    preferences,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
  };
}
