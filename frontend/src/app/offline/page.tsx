'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      // Redirect to home when back online
      window.location.href = '/salon/dashboard';
    }
  }, [isOnline]);

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (response.ok) {
        window.location.href = '/salon/dashboard';
      }
    } catch {
      // Still offline
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      {/* Offline Icon */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-200">
        <WifiOff className="h-12 w-12 text-gray-500" />
      </div>

      {/* Title */}
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Voce esta offline
      </h1>
      <p className="mb-8 text-center text-gray-600">
        Verifique sua conexao com a internet e tente novamente
      </p>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-4 font-semibold transition-all',
            isRetrying
              ? 'bg-gray-200 text-gray-500'
              : 'bg-violet-500 text-white hover:bg-violet-600'
          )}
        >
          <RefreshCw
            className={cn('h-5 w-5', isRetrying && 'animate-spin')}
          />
          {isRetrying ? 'Verificando...' : 'Tentar novamente'}
        </button>

        <a
          href="/salon/dashboard"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-4 font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Home className="h-5 w-5" />
          Pagina Inicial (Offline)
        </a>
      </div>

      {/* Offline Features */}
      <div className="mt-12 w-full max-w-sm">
        <h2 className="mb-4 text-center text-sm font-medium text-gray-500">
          Disponivel offline:
        </h2>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
            <Calendar className="h-5 w-5 text-violet-500" />
            <span className="text-sm text-gray-700">Ver agendamentos salvos</span>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center">
        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
            isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              isOnline ? 'bg-green-500' : 'bg-red-500'
            )}
          />
          {isOnline ? 'Conectado' : 'Sem conexao'}
        </div>
      </div>
    </div>
  );
}
