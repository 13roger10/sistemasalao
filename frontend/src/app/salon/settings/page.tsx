'use client';

import { useRouter } from 'next/navigation';
import {
  Bell,
  Shield,
  Database,
  Users,
  Palette,
  CreditCard,
  Clock,
  Building2,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalonLayout } from '@/components/layout/SalonLayout';

interface SettingsOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  darkColor: string;
}

const settingsOptions: SettingsOption[] = [
  {
    id: 'reminders',
    title: 'Lembretes',
    description: 'Configure lembretes automaticos para agendamentos',
    icon: <Bell className="h-6 w-6" />,
    href: '/salon/settings/reminders',
    color: 'bg-blue-100 text-blue-600',
    darkColor: 'dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    id: 'audit',
    title: 'Auditoria',
    description: 'Visualize logs de atividades e alteracoes no sistema',
    icon: <Shield className="h-6 w-6" />,
    href: '/salon/settings/audit',
    color: 'bg-purple-100 text-purple-600',
    darkColor: 'dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    id: 'backup',
    title: 'Backup',
    description: 'Gerencie backups e restauracao de dados',
    icon: <Database className="h-6 w-6" />,
    href: '/salon/settings/backup',
    color: 'bg-green-100 text-green-600',
    darkColor: 'dark:bg-green-900/30 dark:text-green-400',
  },
  {
    id: 'business',
    title: 'Dados do Negocio',
    description: 'Informacoes do salao, endereco e contato',
    icon: <Building2 className="h-6 w-6" />,
    href: '/salon/profile',
    color: 'bg-orange-100 text-orange-600',
    darkColor: 'dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    id: 'schedule',
    title: 'Horarios de Funcionamento',
    description: 'Configure dias e horarios de atendimento',
    icon: <Clock className="h-6 w-6" />,
    href: '/salon/schedule',
    color: 'bg-cyan-100 text-cyan-600',
    darkColor: 'dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  {
    id: 'team',
    title: 'Equipe',
    description: 'Gerencie profissionais e permissoes',
    icon: <Users className="h-6 w-6" />,
    href: '/salon/professionals',
    color: 'bg-pink-100 text-pink-600',
    darkColor: 'dark:bg-pink-900/30 dark:text-pink-400',
  },
  {
    id: 'appearance',
    title: 'Aparencia',
    description: 'Personalize cores e tema do sistema',
    icon: <Palette className="h-6 w-6" />,
    href: '/salon/appearance',
    color: 'bg-indigo-100 text-indigo-600',
    darkColor: 'dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    id: 'payments',
    title: 'Pagamentos',
    description: 'Configure formas de pagamento e integracoes',
    icon: <CreditCard className="h-6 w-6" />,
    href: '/salon/payments',
    color: 'bg-emerald-100 text-emerald-600',
    darkColor: 'dark:bg-emerald-900/30 dark:text-emerald-400',
  },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700">
            <Settings className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configuracoes
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie as configuracoes do seu salao
            </p>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settingsOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => router.push(option.href)}
              className={cn(
                'group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 text-left transition-all',
                'hover:border-violet-300 hover:shadow-md',
                'dark:border-gray-700 dark:bg-gray-800 dark:hover:border-violet-600'
              )}
            >
              <div className={cn('rounded-lg p-3', option.color, option.darkColor)}>
                {option.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {option.title}
                  </h3>
                  <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 dark:text-gray-500" />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Info Card */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Precisa de ajuda?
          </h3>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            Se voce tiver duvidas sobre como configurar o sistema, entre em contato com nosso suporte
            pelo WhatsApp ou acesse a central de ajuda.
          </p>
          <div className="mt-4 flex gap-3">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Central de Ajuda
            </button>
            <button className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:bg-transparent dark:text-blue-400 dark:hover:bg-blue-900/30">
              Falar com Suporte
            </button>
          </div>
        </div>
      </div>
    </SalonLayout>
  );
}
