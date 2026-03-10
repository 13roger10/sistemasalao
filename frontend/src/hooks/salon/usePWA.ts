// Hook for PWA functionality - Installation, Push Notifications

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/services/salon/notificationService';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isPushSupported: boolean;
  isPushEnabled: boolean;
  pushPermission: NotificationPermission;
  isLoading: boolean;
}

interface UsePWAReturn extends PWAState {
  install: () => Promise<boolean>;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
}

export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isPushSupported: false,
    isPushEnabled: false,
    pushPermission: 'default',
    isLoading: true,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Check if app is installed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (navigator as { standalone?: boolean }).standalone === true;

      setState(prev => ({
        ...prev,
        isInstalled: isStandalone || isIOSStandalone,
      }));
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    return () => mediaQuery.removeEventListener('change', checkInstalled);
  }, []);

  // Listen for install prompt
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Online/Offline detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check push notification status
  useEffect(() => {
    const checkPushStatus = async () => {
      if (typeof window === 'undefined') {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const isPushSupported = notificationService.push.isSupported();
      const pushPermission = notificationService.push.getPermission();

      let isPushEnabled = false;
      if (isPushSupported && pushPermission === 'granted') {
        const subscription = await notificationService.push.getSubscription();
        isPushEnabled = !!subscription;
      }

      setState(prev => ({
        ...prev,
        isPushSupported,
        pushPermission,
        isPushEnabled,
        isLoading: false,
      }));
    };

    checkPushStatus();
  }, []);

  // Install PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setState(prev => ({
          ...prev,
          isInstallable: false,
          isInstalled: true,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Enable push notifications
  const enablePush = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const subscription = await notificationService.push.subscribe();

      if (subscription) {
        setState(prev => ({
          ...prev,
          isPushEnabled: true,
          pushPermission: 'granted',
          isLoading: false,
        }));
        return true;
      }

      setState(prev => ({
        ...prev,
        pushPermission: notificationService.push.getPermission(),
        isLoading: false,
      }));
      return false;
    } catch (error) {
      console.error('Error enabling push:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Disable push notifications
  const disablePush = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const success = await notificationService.push.unsubscribe();

      if (success) {
        setState(prev => ({
          ...prev,
          isPushEnabled: false,
          isLoading: false,
        }));
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return success;
    } catch (error) {
      console.error('Error disabling push:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async (): Promise<void> => {
    if (state.isPushEnabled) {
      await notificationService.push.sendTest();
    } else {
      // Show local notification for testing
      await notificationService.local.show({
        title: 'Teste de Notificacao',
        body: 'As notificacoes estao funcionando corretamente!',
        icon: '/icons/icon-192x192.png',
        tag: 'test-notification',
      });
    }
  }, [state.isPushEnabled]);

  return {
    ...state,
    install,
    enablePush,
    disablePush,
    sendTestNotification,
  };
}
