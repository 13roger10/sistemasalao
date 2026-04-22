'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSalonAuth } from '@/contexts/SalonAuthContext';
import { useSalonNotificacoes } from '@/contexts/SalonNotificacaoContext';
import {
  User,
  Mail,
  Phone,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  HelpCircle,
  Settings,
  Calendar,
  Star,
  Gift,
  Edit2,
  Camera,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClientProfilePage() {
  const { user, logout } = useSalonAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { naoLidas } = useSalonNotificacoes();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      logout();
    } catch (error) {
      console.error('Erro ao sair:', error);
      setIsLoggingOut(false);
    }
  };

  // Estatisticas do cliente (mock - substituir por dados reais)
  const stats = [
    { icon: Calendar, label: 'Agendamentos', value: '12' },
    { icon: Star, label: 'Avaliações', value: '8' },
    { icon: Gift, label: 'Pontos', value: '650' },
  ];

  // Menu de configurações
  const menuSections = [
    {
      title: 'Conta',
      items: [
        { icon: Edit2, label: 'Editar perfil', href: '/salon/client/profile/edit' },
        { icon: Bell, label: 'Notificações', href: '/salon/client/profile/notifications' },
        { icon: Shield, label: 'Privacidade e segurança', href: '/salon/client/profile/privacy' },
      ],
    },
    {
      title: 'Suporte',
      items: [
        { icon: HelpCircle, label: 'Central de ajuda', href: '/salon/client/help' },
        { icon: Settings, label: 'Configurações', href: '/salon/client/profile/settings' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header com gradiente */}
      <div className="relative bg-gradient-to-br from-violet-600 to-purple-700 px-4 pb-20 pt-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/salon/book')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Meu Perfil</h1>
        </div>

        {/* Decoração */}
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/5 blur-xl" />
      </div>

      {/* Card do usuário - sobrepõe o header */}
      <div className="relative -mt-16 px-4">
        <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-violet-600 ring-4 ring-white dark:bg-violet-900/30 dark:text-violet-400 dark:ring-gray-800">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name || 'Avatar'}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10" />
                )}
              </div>
              {/* Botão de editar foto */}
              <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-white shadow-md hover:bg-violet-600">
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Info do usuário */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user?.name || 'Cliente'}
              </h2>

              <div className="mt-2 space-y-1">
                {user?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                )}
                {user?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Phone className="h-4 w-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gray-100 pt-6 dark:border-gray-700">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-900/20">
                  <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Menu sections */}
      <div className="mt-6 space-y-6 px-4 pb-24">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 px-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {section.title}
            </h3>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
              {section.items.map(({ icon: Icon, label, href }, index) => {
                const isNotifications = href === '/salon/client/profile/notifications';
                return (
                  <a
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center justify-between px-4 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      index !== section.items.length - 1 &&
                        'border-b border-gray-100 dark:border-gray-700'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                        <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isNotifications && naoLidas > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-xs font-bold text-white">
                          {naoLidas > 99 ? '99+' : naoLidas}
                        </span>
                      )}
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ))}

        {/* Botão de logout */}
        <div className="pt-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-white px-4 py-4 font-semibold text-red-600 transition-colors',
              'hover:bg-red-50 dark:border-red-900/50 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20',
              isLoggingOut && 'cursor-not-allowed opacity-50'
            )}
          >
            <LogOut className="h-5 w-5" />
            {isLoggingOut ? 'Saindo...' : 'Sair da conta'}
          </button>
        </div>

        {/* Versão do app */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Versão 1.0.0
        </p>
      </div>
    </div>
  );
}
