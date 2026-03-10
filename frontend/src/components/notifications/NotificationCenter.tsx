"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, X, Check, Clock, Calendar, AlertCircle } from "lucide-react";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "schedule";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

const NOTIFICATIONS_KEY = "social_studio_notifications";

// Notificacoes de exemplo/demo
const defaultNotifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Bem-vindo ao Social Studio!",
    message: "Comece criando seu primeiro post para as redes sociais.",
    timestamp: new Date(),
    read: false,
    action: {
      label: "Criar Post",
      href: "/admin/capture",
    },
  },
  {
    id: "2",
    type: "info",
    title: "Dica: Melhores horarios",
    message: "Poste entre 11h-13h e 19h-21h para melhor engajamento no Instagram.",
    timestamp: new Date(Date.now() - 3600000),
    read: false,
  },
];

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window === "undefined") return defaultNotifications;
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((n: Notification) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      } catch {
        return defaultNotifications;
      }
    }
    return defaultNotifications;
  });
  const hasInitialized = useRef(false);

  // Salvar notificacoes iniciais se não existirem
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(defaultNotifications));
    }
  }, []);

  // Salvar notificacoes
  const saveNotifications = useCallback((notifs: Notification[]) => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  }, []);

  // Marcar como lida
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Remover notificacao
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  // Limpar todas
  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(NOTIFICATIONS_KEY);
  }, []);

  // Contar nao lidas
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Formatar tempo relativo
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Agora";
    if (minutes < 60) return `${minutes}min atras`;
    if (hours < 24) return `${hours}h atras`;
    if (days < 7) return `${days}d atras`;
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(date);
  };

  // Icone por tipo
  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <Check className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "schedule":
        return <Calendar className="h-4 w-4 text-violet-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-800 sm:w-96">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notificacoes</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma notificacao</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`relative p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        !notification.read ? "bg-violet-50/50 dark:bg-violet-900/20" : ""
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                          {getIcon(notification.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {notification.message}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(notification.timestamp)}
                            </span>
                            {notification.action && (
                              <a
                                href={notification.action.href}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                              >
                                {notification.action.label}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      {!notification.read && (
                        <span className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-violet-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-100 p-3 dark:border-gray-700">
                <button
                  onClick={clearAll}
                  className="w-full rounded-lg py-2 text-center text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                >
                  Limpar todas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
