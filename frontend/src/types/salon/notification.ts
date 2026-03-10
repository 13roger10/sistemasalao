// Notification Types for PWA Push Notifications

// ===== Notification Type =====
export type NotificationType =
  | 'appointment_reminder'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'new_appointment'
  | 'appointment_rescheduled'
  | 'payment_received'
  | 'review_request'
  | 'promotion'
  | 'birthday'
  | 'loyalty_reward'
  | 'stock_low'
  | 'general';

// ===== Push Subscription =====
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  createdAt: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

// ===== Notification =====
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  data?: NotificationData;
  url?: string;
  read: boolean;
  sent: boolean;
  sentAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationData {
  appointmentId?: string;
  clientId?: string;
  professionalId?: string;
  promotionId?: string;
  reviewId?: string;
  orderId?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface NotificationCreateInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  data?: NotificationData;
  url?: string;
  sendPush?: boolean;
  scheduledFor?: Date;
}

// ===== Push Payload =====
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  vibrate?: number[];
  data?: {
    url?: string;
    type?: NotificationType;
    appointmentId?: string;
    [key: string]: string | undefined;
  };
  actions?: PushAction[];
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface PushAction {
  action: string;
  title: string;
  icon?: string;
}

// ===== Reminder =====
export interface Reminder {
  id: string;
  appointmentId: string;
  clientId: string;
  type: ReminderType;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  channel: ReminderChannel;
  message?: string;
  createdAt: Date;
}

export type ReminderType =
  | 'day_before'
  | 'hours_before'
  | 'custom';

export type ReminderChannel =
  | 'push'
  | 'sms'
  | 'email'
  | 'whatsapp';

export interface ReminderCreateInput {
  appointmentId: string;
  type: ReminderType;
  scheduledFor: Date;
  channel: ReminderChannel;
  customMessage?: string;
}

export interface ReminderSettings {
  enabled: boolean;
  defaultChannels: ReminderChannel[];
  dayBefore: {
    enabled: boolean;
    time: string; // HH:mm format
  };
  hoursBefore: {
    enabled: boolean;
    hours: number;
  };
  customMessage?: string;
}

// ===== Notification Preferences =====
export interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  categories: {
    appointments: boolean;
    promotions: boolean;
    reviews: boolean;
    loyalty: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
  };
  updatedAt: Date;
}

// ===== API Responses =====
export interface NotificationStats {
  total: number;
  unread: number;
  sent: number;
  pending: number;
  byType: Record<NotificationType, number>;
}

export interface ReminderStats {
  total: number;
  sent: number;
  pending: number;
  byChannel: Record<ReminderChannel, number>;
}
