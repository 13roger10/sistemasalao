'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Save,
  RotateCcw,
  MessageSquare,
  Mail,
  Smartphone,
  Check,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalonLayout } from '@/components/layout/SalonLayout';
import { reminderService } from '@/services/salon/reminderService';
import type { ReminderSettings, ReminderChannel } from '@/types/salon/notification';

const channelIcons: Record<ReminderChannel, React.ReactNode> = {
  push: <Bell className="h-5 w-5" />,
  sms: <Smartphone className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  whatsapp: <MessageSquare className="h-5 w-5" />,
};

const channelLabels: Record<ReminderChannel, string> = {
  push: 'Push',
  sms: 'SMS',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
};

// Componente Toggle reutilizavel
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
}

function ToggleSwitch({ enabled, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'relative flex-shrink-0 rounded-full transition-colors',
        enabled ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
      )}
      style={{ width: '44px', height: '24px' }}
    >
      <span
        className="absolute rounded-full bg-white shadow-md transition-transform duration-200"
        style={{
          width: '18px',
          height: '18px',
          top: '3px',
          left: '3px',
          transform: enabled ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

// Componente de linha de configuracao
interface SettingRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
  children?: React.ReactNode;
}

function SettingRow({ icon, iconBg, title, description, enabled, onChange, children }: SettingRowProps) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', iconBg)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <ToggleSwitch enabled={enabled} onChange={onChange} />
      </div>
      {children}
    </div>
  );
}

export default function ReminderSettingsPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const data = await reminderService.settings.get();
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (updates: Partial<ReminderSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!settings || !hasChanges) return;

    setIsSaving(true);
    try {
      await reminderService.settings.update(settings);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const data = await reminderService.settings.reset();
      setSettings(data);
      setHasChanges(false);
    } catch (error) {
      console.error('Error resetting settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChannel = (channel: ReminderChannel) => {
    if (!settings) return;

    const currentChannels = settings.defaultChannels;
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];

    handleChange({ defaultChannels: newChannels });
  };

  if (isLoading || !settings) {
    return (
      <SalonLayout requiredRole={["ADMIN"]}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout requiredRole={["ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Lembretes Automaticos
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure lembretes de agendamento
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="text-sm">Salvo</span>
              </div>
            )}
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </div>

        {/* All Toggle Settings */}
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
          {/* Enable/Disable - Main Toggle */}
          <SettingRow
            icon={<Bell className={cn('h-5 w-5', settings.enabled ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400')} />}
            iconBg={settings.enabled ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-gray-100 dark:bg-gray-700'}
            title="Lembretes Automaticos"
            description="Enviar lembretes automaticamente"
            enabled={settings.enabled}
            onChange={() => handleChange({ enabled: !settings.enabled })}
          />

          {/* Day Before */}
          <SettingRow
            icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            title="1 Dia Antes"
            description="Enviar lembrete na vespera do agendamento"
            enabled={settings.dayBefore.enabled}
            onChange={() => handleChange({ dayBefore: { ...settings.dayBefore, enabled: !settings.dayBefore.enabled } })}
          >
            {settings.dayBefore.enabled && (
              <div className="mt-4 ml-14 flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Enviar as:</label>
                <input
                  type="time"
                  value={settings.dayBefore.time}
                  onChange={e => handleChange({ dayBefore: { ...settings.dayBefore, time: e.target.value } })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </SettingRow>

          {/* Hours Before */}
          <SettingRow
            icon={<Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            title="Horas Antes"
            description="Enviar lembrete algumas horas antes"
            enabled={settings.hoursBefore.enabled}
            onChange={() => handleChange({ hoursBefore: { ...settings.hoursBefore, enabled: !settings.hoursBefore.enabled } })}
          >
            {settings.hoursBefore.enabled && (
              <div className="mt-4 ml-14 flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Horas antes:</label>
                <select
                  value={settings.hoursBefore.hours}
                  onChange={e => handleChange({ hoursBefore: { ...settings.hoursBefore, hours: Number(e.target.value) } })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={3}>3 horas</option>
                  <option value={4}>4 horas</option>
                  <option value={6}>6 horas</option>
                </select>
              </div>
            )}
          </SettingRow>
        </div>

        {/* Channels */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 font-medium text-gray-900 dark:text-white">Canais de Envio</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Selecione os canais para enviar os lembretes
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(channelIcons) as ReminderChannel[]).map(channel => (
              <button
                key={channel}
                onClick={() => toggleChannel(channel)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border-2 p-4 transition-all',
                  settings.defaultChannels.includes(channel)
                    ? 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-900/20'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    settings.defaultChannels.includes(channel)
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                  )}
                >
                  {channelIcons[channel]}
                </div>
                <span
                  className={cn(
                    'font-medium',
                    settings.defaultChannels.includes(channel)
                      ? 'text-violet-900 dark:text-violet-300'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {channelLabels[channel]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Message */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 font-medium text-gray-900 dark:text-white">Mensagem Personalizada</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Use {'{servico}'}, {'{profissional}'}, {'{hora}'}, {'{data}'} como variaveis
          </p>

          <textarea
            value={settings.customMessage || ''}
            onChange={e => handleChange({ customMessage: e.target.value || undefined })}
            placeholder="Ola! Lembrete: {servico} com {profissional} {data} as {hora}. Te esperamos!"
            className="w-full rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-900 focus:border-violet-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            rows={3}
          />

          {settings.customMessage && (
            <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 text-blue-500 dark:text-blue-400" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Preview:</strong>
                  <p className="mt-1">
                    {settings.customMessage
                      .replace('{servico}', 'Corte de Cabelo')
                      .replace('{profissional}', 'Maria')
                      .replace('{hora}', '14:00')
                      .replace('{data}', 'amanha')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reset Button */}
        <div className="flex justify-center pb-6">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar padrao
          </button>
        </div>
      </div>
    </SalonLayout>
  );
}
