'use client';

import { useState } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Star,
  Gift,
  CreditCard,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/salon/useNotifications';
import type { Notification, NotificationType } from '@/types/salon/notification';

interface NotificationCenterProps {
  className?: string;
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  appointment_reminder: <Calendar className="h-5 w-5" />,
  appointment_confirmed: <Check className="h-5 w-5" />,
  appointment_cancelled: <X className="h-5 w-5" />,
  new_appointment: <Calendar className="h-5 w-5" />,
  appointment_rescheduled: <Calendar className="h-5 w-5" />,
  payment_received: <CreditCard className="h-5 w-5" />,
  review_request: <Star className="h-5 w-5" />,
  promotion: <Gift className="h-5 w-5" />,
  birthday: <Gift className="h-5 w-5" />,
  loyalty_reward: <Gift className="h-5 w-5" />,
  stock_low: <AlertCircle className="h-5 w-5" />,
  general: <Bell className="h-5 w-5" />,
};

const notificationColors: Record<NotificationType, string> = {
  appointment_reminder: 'bg-blue-100 text-blue-600',
  appointment_confirmed: 'bg-green-100 text-green-600',
  appointment_cancelled: 'bg-red-100 text-red-600',
  new_appointment: 'bg-violet-100 text-violet-600',
  appointment_rescheduled: 'bg-orange-100 text-orange-600',
  payment_received: 'bg-emerald-100 text-emerald-600',
  review_request: 'bg-yellow-100 text-yellow-600',
  promotion: 'bg-pink-100 text-pink-600',
  birthday: 'bg-pink-100 text-pink-600',
  loyalty_reward: 'bg-purple-100 text-purple-600',
  stock_low: 'bg-amber-100 text-amber-600',
  general: 'bg-gray-100 text-gray-600',
};

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to relevant page based on notification type
    if (notification.url) {
      window.location.href = notification.url;
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 hover:bg-gray-100"
        aria-label="Notificacoes"
      >
        <Bell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white shadow-xl ring-1 ring-gray-200 sm:w-96">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-semibold text-gray-900">Notificacoes</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-violet-600 hover:bg-violet-50"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Marcar todas lidas
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="rounded-full p-1 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-500" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    Nenhuma notificacao
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onDelete={() => deleteNotification(notification.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t p-2">
                <a
                  href="/salon/notifications"
                  className="block rounded-lg py-2 text-center text-sm font-medium text-violet-600 hover:bg-violet-50"
                >
                  Ver todas as notificacoes
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
}

function NotificationItem({ notification, onClick, onDelete }: NotificationItemProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={cn(
        'relative flex cursor-pointer gap-3 p-4 transition-colors hover:bg-gray-50',
        !notification.read && 'bg-violet-50/50'
      )}
      onClick={onClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          notificationColors[notification.type]
        )}
      >
        {notificationIcons[notification.type]}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm',
            !notification.read ? 'font-medium text-gray-900' : 'text-gray-700'
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 truncate text-sm text-gray-500">
          {notification.body}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-violet-500" />
      )}

      {/* Delete button */}
      {showDelete && (
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Badge component for showing notification count in navigation
export function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
