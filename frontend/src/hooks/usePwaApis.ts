/**
 * PWA Web API Hooks for Narvo
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
    setAppBadge?: (count: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener?: (type: string, cb: () => void) => void;
}

export function useWakeLock(): {
  request: () => Promise<void>;
  release: () => Promise<void>;
  isActive: boolean;
} {
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const [isActive, setIsActive] = useState(false);

  const request = useCallback(async () => {
    const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };
    if (!nav.wakeLock) return;
    try {
      wakeLockRef.current = await nav.wakeLock.request('screen');
      setIsActive(true);
      wakeLockRef.current?.addEventListener?.('release', () => setIsActive(false));
    } catch {
      /* denied */
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && isActive && !wakeLockRef.current) {
        request();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isActive, request]);

  return { request, release, isActive };
}

export function useNetworkInfo(): {
  online: boolean;
  effectiveType: string;
  downlink: number;
  saveData: boolean;
  isSlowConnection: boolean;
  isMediumConnection: boolean;
} {
  const [info, setInfo] = useState(() => {
    const conn = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection;
    if (!conn) {
      return {
        online: navigator.onLine,
        effectiveType: '4g',
        downlink: 10,
        saveData: false,
      };
    }
    return {
      online: navigator.onLine,
      effectiveType: conn.effectiveType ?? '4g',
      downlink: conn.downlink ?? 10,
      saveData: conn.saveData ?? false,
    };
  });

  useEffect(() => {
    const conn = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection;

    const updateInfo = () => {
      setInfo({
        online: navigator.onLine,
        effectiveType: conn?.effectiveType ?? '4g',
        downlink: conn?.downlink ?? 10,
        saveData: conn?.saveData ?? false,
      });
    };

    window.addEventListener('online', updateInfo);
    window.addEventListener('offline', updateInfo);
    conn?.addEventListener?.('change', updateInfo);

    return () => {
      window.removeEventListener('online', updateInfo);
      window.removeEventListener('offline', updateInfo);
      conn?.removeEventListener?.('change', updateInfo);
    };
  }, []);

  const isSlowConnection =
    info.effectiveType === '2g' || info.effectiveType === 'slow-2g' || info.saveData;
  const isMediumConnection = info.effectiveType === '3g';

  return { ...info, isSlowConnection, isMediumConnection };
}

export function useAppBadge(): {
  setBadge: (count: number) => void;
  clearBadge: () => void;
} {
  const setBadge = useCallback((count: number) => {
    if ('setAppBadge' in navigator) {
      if (count > 0) navigator.setAppBadge!(count).catch(() => {});
      else navigator.clearAppBadge!().catch(() => {});
    }
  }, []);

  const clearBadge = useCallback(() => {
    if ('clearAppBadge' in navigator) navigator.clearAppBadge!().catch(() => {});
  }, []);

  return { setBadge, clearBadge };
}

export function useVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return isVisible;
}

export function useInstallPrompt(): {
  canInstall: boolean;
  isInstalled: boolean;
  install: () => Promise<boolean>;
} {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const installed = () => setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!prompt) return false;
    prompt.prompt();
    const result = await prompt.userChoice;
    setPrompt(null);
    return result.outcome === 'accepted';
  }, [prompt]);

  return { canInstall: !!prompt && !isInstalled, isInstalled, install };
}
