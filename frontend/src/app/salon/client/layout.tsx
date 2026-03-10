'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSalonAuth } from '@/contexts/SalonAuthContext';
import { Loader2 } from 'lucide-react';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useSalonAuth();

  useEffect(() => {
    // Redireciona se não estiver autenticado
    if (!isLoading && !isAuthenticated) {
      router.push('/salon/login');
      return;
    }

    // Redireciona se não for cliente (funcionários vão para dashboard)
    if (!isLoading && isAuthenticated && user?.role !== 'CLIENT') {
      router.push('/salon/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Não renderiza se não estiver autenticado ou não for cliente
  if (!isAuthenticated || user?.role !== 'CLIENT') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Conteúdo da página */}
      <main className="pb-20">
        {children}
      </main>

      {/* Navegação inferior fixa */}
      <ClientBottomNavigation />
    </div>
  );
}

// Componente de navegação inferior inline (pode ser extraído depois)
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Gift, Star, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/salon/client/appointments', icon: Calendar, label: 'Agendamentos' },
  { href: '/salon/client/loyalty', icon: Gift, label: 'Fidelidade' },
  { href: '/salon/client/reviews', icon: Star, label: 'Avaliações' },
  { href: '/salon/client/profile', icon: User, label: 'Perfil' },
];

function ClientBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-around">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
                  isActive
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    isActive && 'scale-110'
                  )}
                  fill={isActive ? 'currentColor' : 'none'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn('font-medium', isActive && 'font-semibold')}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Safe area para dispositivos com notch */}
      <div className="h-safe-area-inset-bottom bg-white dark:bg-gray-900" />
    </nav>
  );
}
