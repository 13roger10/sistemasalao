'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePWA } from '@/hooks/salon/usePWA';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isPushSupported: boolean;
  isPushEnabled: boolean;
  pushPermission: NotificationPermission;
  isLoading: boolean;
  install: () => Promise<boolean>;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | null>(null);

export function PWAProvider({ children }: { children: ReactNode }) {
  const pwa = usePWA();

  return (
    <PWAContext.Provider value={pwa}>
      {children}
    </PWAContext.Provider>
  );
}

export function usePWAContext() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWAContext must be used within a PWAProvider');
  }
  return context;
}
