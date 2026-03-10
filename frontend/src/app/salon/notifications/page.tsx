'use client';

import { useState } from 'react';
import {
  Bell,
  Settings,
  CheckCheck,
  ChevronLeft,
  Calendar,
  Check,
  X,
  CreditCard,
  Star,
  Gift,
  AlertCircle,
  Filter,
  Trash2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/salon/useNotifications';
import { NotificationSettings } from '@/components/salon/NotificationSettings';
import type { Notification, NotificationType } from '@/types/salon/notification';

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

type Tab = 'all' | 'unread' | 'settings';
type Filter = 'all' | NotificationType;

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const {
    notifications,
    unreadCount,
    stats,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications();

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread' && n.read) return false;
    if (filter !== 'all' && n.type !== filter) return false;
    return true;
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = format(new Date(notification.createdAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.url) {
      router.push(notification.url);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Hoje';
    }
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ontem';
    }
    return format(date, "d 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="flex-1 text-lg font-semibold">Notificacoes</h1>
          {unreadCount > 0 && activeTab !== 'settings' && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1 text-sm text-violet-600"
            >
              <CheckCheck className="h-4 w-4" />
              Marcar lidas
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 py-3 text-sm font-medium',
              activeTab === 'all'
                ? 'border-b-2 border-violet-500 text-violet-600'
                : 'text-gray-500'
            )}
          >
            Todas
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={cn(
              'flex-1 py-3 text-sm font-medium',
              activeTab === 'unread'
                ? 'border-b-2 border-violet-500 text-violet-600'
                : 'text-gray-500'
            )}
          >
            Nao lidas
            {unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'flex-1 py-3 text-sm font-medium',
              activeTab === 'settings'
                ? 'border-b-2 border-violet-500 text-violet-600'
                : 'text-gray-500'
            )}
          >
            <Settings className="mx-auto h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'settings' ? (
        <div className="p-4">
          <NotificationSettings />
        </div>
      ) : (
        <div className="p-4">
          {/* Filter */}
          <div className="mb-4 flex items-center justify-between">
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                  filter !== 'all' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
                )}
              >
                <Filter className="h-4 w-4" />
                {filter === 'all' ? 'Todos os tipos' : filter.replace(/_/g, ' ')}
              </button>

              {showFilterMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200">
                    <button
                      onClick={() => {
                        setFilter('all');
                        setShowFilterMenu(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                        filter === 'all' && 'bg-violet-50 text-violet-600'
                      )}
                    >
                      Todos os tipos
                    </button>
                    {(Object.keys(notificationIcons) as NotificationType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setFilter(type);
                          setShowFilterMenu(false);
                        }}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm capitalize hover:bg-gray-50',
                          filter === type && 'bg-violet-50 text-violet-600'
                        )}
                      >
                        {type.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <p className="text-sm text-gray-500">
              {filteredNotifications.length} notificacao(es)
            </p>
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-xl bg-white py-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">
                {activeTab === 'unread'
                  ? 'Nenhuma notificacao nao lida'
                  : 'Nenhuma notificacao'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedNotifications).map(([date, items]) => (
                <div key={date}>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">
                    {getDateLabel(date)}
                  </h3>
                  <div className="space-y-2">
                    {items.map(notification => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onDelete={() => deleteNotification(notification.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
}

function NotificationCard({ notification, onClick, onDelete }: NotificationCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        'relative rounded-xl bg-white p-4 shadow-sm transition-all',
        !notification.read && 'ring-2 ring-violet-100'
      )}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3">
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
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                'text-sm',
                !notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'
              )}
            >
              {notification.title}
            </p>
            {!notification.read && (
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-violet-500" />
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">{notification.body}</p>
          <p className="mt-2 text-xs text-gray-400">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      </div>

      {/* Delete button */}
      {showActions && (
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
