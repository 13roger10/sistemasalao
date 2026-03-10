'use client';

import { useState } from 'react';
import {
  Bell,
  BellOff,
  Clock,
  Calendar,
  Gift,
  Star,
  CreditCard,
  MessageSquare,
  Smartphone,
  Mail,
  Send,
  ChevronRight,
} from 'lucide-react';
import { usePWA } from '@/hooks/salon/usePWA';
import { useNotifications } from '@/hooks/salon/useNotifications';
import { cn } from '@/lib/utils';
import type { NotificationPreferences, ReminderSettings } from '@/types/salon/notification';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const {
    isPushSupported,
    isPushEnabled,
    pushPermission,
    enablePush,
    disablePush,
    sendTestNotification,
    isLoading: pwaLoading,
  } = usePWA();

  const { preferences, updatePreferences, isLoading: prefsLoading } = useNotifications();

  const [testSent, setTestSent] = useState(false);

  const handleTogglePush = async () => {
    if (isPushEnabled) {
      await disablePush();
    } else {
      await enablePush();
    }
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleToggleCategory = async (
    category: keyof NotificationPreferences['categories']
  ) => {
    if (!preferences) return;

    await updatePreferences({
      categories: {
        ...preferences.categories,
        [category]: !preferences.categories[category],
      },
    });
  };

  const isLoading = pwaLoading || prefsLoading;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Push Notification Toggle */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                isPushEnabled ? 'bg-violet-100' : 'bg-gray-100'
              )}
            >
              {isPushEnabled ? (
                <Bell className="h-5 w-5 text-violet-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Notificacoes Push</h3>
              <p className="text-sm text-gray-500">
                {!isPushSupported
                  ? 'Nao suportado neste dispositivo'
                  : pushPermission === 'denied'
                  ? 'Bloqueado nas configuracoes do navegador'
                  : isPushEnabled
                  ? 'Ativado'
                  : 'Desativado'}
              </p>
            </div>
          </div>

          <button
            onClick={handleTogglePush}
            disabled={isLoading || !isPushSupported || pushPermission === 'denied'}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              isPushEnabled ? 'bg-violet-500' : 'bg-gray-300',
              (isLoading || !isPushSupported || pushPermission === 'denied') &&
                'cursor-not-allowed opacity-50'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                isPushEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>

        {/* Permission Denied Message */}
        {pushPermission === 'denied' && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            As notificacoes foram bloqueadas. Para ativar, acesse as configuracoes
            do seu navegador e permita notificacoes para este site.
          </div>
        )}

        {/* Test Notification Button */}
        {isPushEnabled && (
          <button
            onClick={handleTestNotification}
            disabled={isLoading || testSent}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {testSent ? 'Notificacao enviada!' : 'Enviar notificacao de teste'}
          </button>
        )}
      </div>

      {/* Notification Categories */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-4 font-medium text-gray-900">Categorias</h3>

        <div className="space-y-1">
          <CategoryToggle
            icon={<Calendar className="h-5 w-5" />}
            label="Agendamentos"
            description="Confirmacoes, alteracoes e cancelamentos"
            enabled={preferences?.categories.appointments ?? true}
            onChange={() => handleToggleCategory('appointments')}
            disabled={isLoading}
          />

          <CategoryToggle
            icon={<Clock className="h-5 w-5" />}
            label="Lembretes"
            description="Lembretes de agendamentos"
            enabled={preferences?.categories.reminders ?? true}
            onChange={() => handleToggleCategory('reminders')}
            disabled={isLoading}
          />

          <CategoryToggle
            icon={<Gift className="h-5 w-5" />}
            label="Promocoes"
            description="Ofertas e descontos especiais"
            enabled={preferences?.categories.promotions ?? true}
            onChange={() => handleToggleCategory('promotions')}
            disabled={isLoading}
          />

          <CategoryToggle
            icon={<Star className="h-5 w-5" />}
            label="Avaliacoes"
            description="Solicitacoes de avaliacao"
            enabled={preferences?.categories.reviews ?? true}
            onChange={() => handleToggleCategory('reviews')}
            disabled={isLoading}
          />

          <CategoryToggle
            icon={<Gift className="h-5 w-5" />}
            label="Fidelidade"
            description="Pontos e recompensas"
            enabled={preferences?.categories.loyalty ?? true}
            onChange={() => handleToggleCategory('loyalty')}
            disabled={isLoading}
          />

          <CategoryToggle
            icon={<MessageSquare className="h-5 w-5" />}
            label="Marketing"
            description="Novidades e comunicados"
            enabled={preferences?.categories.marketing ?? false}
            onChange={() => handleToggleCategory('marketing')}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Horario de Silencio</h3>
            <p className="text-sm text-gray-500">
              {preferences?.quietHours.enabled
                ? `${preferences.quietHours.start} - ${preferences.quietHours.end}`
                : 'Desativado'}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Other Channels */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-4 font-medium text-gray-900">Outros Canais</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">E-mail</span>
            </div>
            <ToggleSwitch
              enabled={preferences?.emailEnabled ?? false}
              onChange={() =>
                updatePreferences({ emailEnabled: !preferences?.emailEnabled })
              }
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">SMS</span>
            </div>
            <ToggleSwitch
              enabled={preferences?.smsEnabled ?? false}
              onChange={() =>
                updatePreferences({ smsEnabled: !preferences?.smsEnabled })
              }
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700">WhatsApp</span>
            </div>
            <ToggleSwitch
              enabled={preferences?.whatsappEnabled ?? false}
              onChange={() =>
                updatePreferences({ whatsappEnabled: !preferences?.whatsappEnabled })
              }
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Category Toggle Component
interface CategoryToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function CategoryToggle({
  icon,
  label,
  description,
  enabled,
  onChange,
  disabled,
}: CategoryToggleProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-50 disabled:opacity-50"
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          enabled ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
    </button>
  );
}

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        onChange();
      }}
      disabled={disabled}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        enabled ? 'bg-violet-500' : 'bg-gray-300',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
