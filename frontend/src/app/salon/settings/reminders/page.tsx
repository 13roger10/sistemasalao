'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Clock,
  ChevronLeft,
  Save,
  RotateCcw,
  MessageSquare,
  Mail,
  Smartphone,
  Check,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

export default function ReminderSettingsPage() {
  const router = useRouter();
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
      </div>
    );
  }

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
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Lembretes Automaticos</h1>
            <p className="text-sm text-gray-500">
              Configure lembretes de agendamento
            </p>
          </div>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 font-medium text-white hover:bg-violet-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-1 text-green-600">
              <Check className="h-5 w-5" />
              <span className="text-sm">Salvo</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Enable/Disable */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  settings.enabled ? 'bg-violet-100' : 'bg-gray-100'
                )}
              >
                <Bell
                  className={cn(
                    'h-5 w-5',
                    settings.enabled ? 'text-violet-600' : 'text-gray-500'
                  )}
                />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  Lembretes Automaticos
                </h3>
                <p className="text-sm text-gray-500">
                  Enviar lembretes automaticamente
                </p>
              </div>
            </div>
            <button
              onClick={() => handleChange({ enabled: !settings.enabled })}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                settings.enabled ? 'bg-violet-500' : 'bg-gray-300'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  settings.enabled ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>

        {/* Reminder Types */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-4 font-medium text-gray-900">Tipos de Lembrete</h3>

          {/* Day Before */}
          <div className="mb-4 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">1 Dia Antes</p>
                <p className="text-sm text-gray-500">
                  Enviar lembrete na vespera do agendamento
                </p>
              </div>
              <button
                onClick={() =>
                  handleChange({
                    dayBefore: {
                      ...settings.dayBefore,
                      enabled: !settings.dayBefore.enabled,
                    },
                  })
                }
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  settings.dayBefore.enabled ? 'bg-violet-500' : 'bg-gray-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    settings.dayBefore.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            {settings.dayBefore.enabled && (
              <div className="mt-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <label className="text-sm text-gray-600">Enviar as:</label>
                <input
                  type="time"
                  value={settings.dayBefore.time}
                  onChange={e =>
                    handleChange({
                      dayBefore: {
                        ...settings.dayBefore,
                        time: e.target.value,
                      },
                    })
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Hours Before */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Horas Antes</p>
                <p className="text-sm text-gray-500">
                  Enviar lembrete algumas horas antes
                </p>
              </div>
              <button
                onClick={() =>
                  handleChange({
                    hoursBefore: {
                      ...settings.hoursBefore,
                      enabled: !settings.hoursBefore.enabled,
                    },
                  })
                }
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  settings.hoursBefore.enabled ? 'bg-violet-500' : 'bg-gray-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    settings.hoursBefore.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            {settings.hoursBefore.enabled && (
              <div className="mt-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <label className="text-sm text-gray-600">Horas antes:</label>
                <select
                  value={settings.hoursBefore.hours}
                  onChange={e =>
                    handleChange({
                      hoursBefore: {
                        ...settings.hoursBefore,
                        hours: Number(e.target.value),
                      },
                    })
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                >
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={3}>3 horas</option>
                  <option value={4}>4 horas</option>
                  <option value={6}>6 horas</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Channels */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-4 font-medium text-gray-900">Canais de Envio</h3>
          <p className="mb-4 text-sm text-gray-500">
            Selecione os canais para enviar os lembretes
          </p>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(channelIcons) as ReminderChannel[]).map(channel => (
              <button
                key={channel}
                onClick={() => toggleChannel(channel)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 p-4 transition-all',
                  settings.defaultChannels.includes(channel)
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    settings.defaultChannels.includes(channel)
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {channelIcons[channel]}
                </div>
                <span
                  className={cn(
                    'font-medium',
                    settings.defaultChannels.includes(channel)
                      ? 'text-violet-900'
                      : 'text-gray-700'
                  )}
                >
                  {channelLabels[channel]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Message */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-medium text-gray-900">Mensagem Personalizada</h3>
          <p className="mb-4 text-sm text-gray-500">
            Use {'{servico}'}, {'{profissional}'}, {'{hora}'}, {'{data}'} como variaveis
          </p>

          <textarea
            value={settings.customMessage || ''}
            onChange={e =>
              handleChange({
                customMessage: e.target.value || undefined,
              })
            }
            placeholder="Ola! Lembrete: {servico} com {profissional} {data} as {hora}. Te esperamos!"
            className="w-full rounded-xl border border-gray-200 p-4 text-sm focus:border-violet-500 focus:outline-none"
            rows={3}
          />

          {settings.customMessage && (
            <div className="mt-3 rounded-lg bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
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
        <div className="flex justify-center">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar padrao
          </button>
        </div>
      </div>
    </div>
  );
}
