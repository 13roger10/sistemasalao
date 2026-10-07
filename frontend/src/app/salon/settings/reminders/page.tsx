'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, Save, RotateCcw, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalonLayout } from '@/components/layout/SalonLayout';
import { api } from '@/services/salon/api';

// Espelha GET/PUT /api/salon/reminders/settings. Antes a tela chamava uma rota inexistente e
// mostrava opções (horário da véspera, canais, mensagem própria) que nenhum envio usava (BUG-026).
interface ConfiguracaoLembretes {
  enabled: boolean;
  dayBefore: boolean;
  hoursBefore: boolean;
}

const PADRAO: ConfiguracaoLembretes = { enabled: true, dayBefore: true, hoursBefore: true };

function mensagemDoErro(err: unknown, padrao: string): string {
  return err instanceof Error && err.message ? err.message : padrao;
}

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
  const [settings, setSettings] = useState<ConfiguracaoLembretes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ConfiguracaoLembretes>('/salon/reminders/settings')
      .then(setSettings)
      .catch((err) => setErro(mensagemDoErro(err, 'Não foi possível carregar a configuração dos lembretes.')))
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (updates: Partial<ConfiguracaoLembretes>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const salvar = async (dados: ConfiguracaoLembretes) => {
    setIsSaving(true);
    setErro(null);
    try {
      setSettings(await api.put<ConfiguracaoLembretes>('/salon/reminders/settings', dados));
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErro(mensagemDoErro(err, 'Não foi possível salvar a configuração dos lembretes.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lembretes Automáticos</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Lembretes de agendamento enviados ao cliente por WhatsApp
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
            {settings && hasChanges && (
              <button
                onClick={() => salvar(settings)}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        </div>

        {erro && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            {erro}
          </div>
        )}

        {settings && (
          <>
            <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
              <SettingRow
                icon={<Bell className={cn('h-5 w-5', settings.enabled ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400')} />}
                iconBg={settings.enabled ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-gray-100 dark:bg-gray-700'}
                title="Lembretes automáticos"
                description="Desligado, nenhum lembrete é enviado aos clientes deste salão"
                enabled={settings.enabled}
                onChange={() => handleChange({ enabled: !settings.enabled })}
              />
              <SettingRow
                icon={<Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                title="24 horas antes"
                description="Lembrete com link para o cliente confirmar o horário"
                enabled={settings.dayBefore}
                onChange={() => handleChange({ dayBefore: !settings.dayBefore })}
              />
              <SettingRow
                icon={<Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
                iconBg="bg-orange-100 dark:bg-orange-900/30"
                title="2 horas antes"
                description="Lembrete com o horário, o serviço e o endereço do salão"
                enabled={settings.hoursBefore}
                onChange={() => handleChange({ hoursBefore: !settings.hoursBefore })}
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Os lembretes saem pelo WhatsApp do salão, com mensagens padrão, para clientes com telefone
                cadastrado. Sem a integração do WhatsApp configurada, nada é enviado.
              </p>
            </div>

            <div className="flex justify-center pb-6">
              <button
                onClick={() => salvar(PADRAO)}
                disabled={isSaving}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar padrão
              </button>
            </div>
          </>
        )}
      </div>
    </SalonLayout>
  );
}
