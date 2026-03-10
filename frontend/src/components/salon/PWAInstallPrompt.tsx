'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Bell, Zap, WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/salon/usePWA';
import { cn } from '@/lib/utils';

interface PWAInstallPromptProps {
  variant?: 'banner' | 'modal' | 'inline';
  className?: string;
  onDismiss?: () => void;
}

export function PWAInstallPrompt({
  variant = 'banner',
  className,
  onDismiss,
}: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, install, isLoading } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if should show prompt
  useEffect(() => {
    // Don't show if already installed
    if (isInstalled) return;

    // Don't show if not installable
    if (!isInstallable) return;

    // Check if user dismissed before
    const dismissedAt = localStorage.getItem('pwa_install_dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismiss = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

      // Show again after 7 days
      if (daysSinceDismiss < 7) return;
    }

    // Show after delay
    const timer = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowPrompt(false);
      onDismiss?.();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', new Date().toISOString());
    onDismiss?.();
  };

  if (!showPrompt || dismissed || isInstalled) return null;

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-white p-4 shadow-lg safe-area-bottom',
          className
        )}
      >
        <div className="mx-auto max-w-lg">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900">
                Instale o Belezza.ai
              </h3>
              <p className="mt-0.5 text-sm text-gray-600">
                Acesse mais rapido e receba notificacoes
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleInstall}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              Instalar
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-xl px-6 py-3 text-gray-600 hover:bg-gray-100"
            >
              Depois
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          className={cn(
            'w-full max-w-sm rounded-2xl bg-white p-6',
            className
          )}
        >
          {/* App Icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
              <span className="text-3xl font-bold text-white">B</span>
            </div>
          </div>

          <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
            Instale o Belezza.ai
          </h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            Tenha uma experiencia ainda melhor com nosso app
          </p>

          {/* Features */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <Zap className="h-5 w-5 text-violet-500" />
              <span className="text-sm text-gray-700">Acesso rapido na tela inicial</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <Bell className="h-5 w-5 text-violet-500" />
              <span className="text-sm text-gray-700">Notificacoes de lembretes</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <WifiOff className="h-5 w-5 text-violet-500" />
              <span className="text-sm text-gray-700">Funciona offline</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleInstall}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-4 font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              Instalar Agora
            </button>
            <button
              onClick={handleDismiss}
              className="w-full py-3 text-center text-gray-600 hover:text-gray-800"
            >
              Talvez depois
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div
      className={cn(
        'rounded-xl border border-violet-200 bg-violet-50 p-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-violet-900">Instale o App</h4>
          <p className="text-sm text-violet-700">Acesse mais rapido</p>
        </div>
        <button
          onClick={handleInstall}
          disabled={isLoading}
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          Instalar
        </button>
      </div>
    </div>
  );
}
