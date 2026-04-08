'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { COPY } from '@/lib/narvo-app-copy';
import { registerNarvoServiceWorker } from '@/lib/narvo-notifications';

const LS_PWA_INSTALLED = 'narvo_pwa_installed';
const LS_PWA_INSTALL_DISMISSED_AT = 'narvo_pwa_install_dismissed_at';
const INSTALL_BANNER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type InstallPromptOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallPromptOutcome; platform: string }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const ios = /iphone|ipad|ipod/.test(ua);
  const safari = ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios') && !ua.includes('edgios');
  return ios && safari;
}

function installBannerSuppressed(): boolean {
  if (typeof window === 'undefined') return true;
  if (isStandaloneMode()) return true;
  if (window.localStorage.getItem(LS_PWA_INSTALLED) === '1') return true;
  const raw = Number(window.localStorage.getItem(LS_PWA_INSTALL_DISMISSED_AT) || '0');
  return Number.isFinite(raw) && raw > 0 && Date.now() - raw < INSTALL_BANNER_TTL_MS;
}

export function NarvoPwaBootstrap() {
  const { banner, dismissBanner, success } = useToast();
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const installBannerIdRef = useRef<string | null>(null);
  const updateBannerIdRef = useRef<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadOnControllerChangeRef = useRef(false);
  const installSuccessShownRef = useRef(false);

  const dismissInstallBanner = useCallback(() => {
    if (!installBannerIdRef.current) return;
    dismissBanner(installBannerIdRef.current);
    installBannerIdRef.current = null;
  }, [dismissBanner]);

  const dismissUpdateBanner = useCallback(() => {
    if (!updateBannerIdRef.current) return;
    dismissBanner(updateBannerIdRef.current);
    updateBannerIdRef.current = null;
  }, [dismissBanner]);

  const rememberInstallDismissal = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LS_PWA_INSTALL_DISMISSED_AT, String(Date.now()));
  }, []);

  const markInstalled = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LS_PWA_INSTALLED, '1');
    window.localStorage.removeItem(LS_PWA_INSTALL_DISMISSED_AT);
  }, []);

  const promptInstall = useCallback(async () => {
    const promptEvent = installPromptRef.current;
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        markInstalled();
        dismissInstallBanner();
        if (!installSuccessShownRef.current) {
          installSuccessShownRef.current = true;
          success(COPY.pwa_install_success);
        }
      } else {
        rememberInstallDismissal();
        dismissInstallBanner();
      }
    } catch {
      rememberInstallDismissal();
      dismissInstallBanner();
    } finally {
      installPromptRef.current = null;
    }
  }, [dismissInstallBanner, markInstalled, rememberInstallDismissal, success]);

  const showInstallBanner = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (installBannerSuppressed()) {
      dismissInstallBanner();
      return;
    }
    const supportsNativePrompt = Boolean(installPromptRef.current);
    const supportsIosManualInstall = isIosSafari();
    if (!supportsNativePrompt && !supportsIosManualInstall) return;

    installBannerIdRef.current = banner(
      supportsNativePrompt ? COPY.pwa_install_banner : COPY.pwa_install_ios_banner,
      {
        id: 'narvo-pwa-install',
        variant: 'info',
        duration: 0,
        dismissible: false,
        actions: supportsNativePrompt
          ? [
              { label: COPY.pwa_install_action, onClick: () => void promptInstall() },
              {
                label: COPY.pwa_install_later,
                emphasis: 'secondary',
                onClick: () => {
                  rememberInstallDismissal();
                  dismissInstallBanner();
                },
              },
            ]
          : [
              {
                label: COPY.pwa_install_later,
                emphasis: 'secondary',
                onClick: () => {
                  rememberInstallDismissal();
                  dismissInstallBanner();
                },
              },
            ],
      }
    );
  }, [banner, dismissInstallBanner, promptInstall, rememberInstallDismissal]);

  const activateUpdate = useCallback(async () => {
    const registration = registrationRef.current;
    reloadOnControllerChangeRef.current = true;
    dismissUpdateBanner();

    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    try {
      await registration?.update();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
    } catch {
      /* fall through to hard reload */
    }

    window.location.reload();
  }, [dismissUpdateBanner]);

  const showUpdateBanner = useCallback(() => {
    updateBannerIdRef.current = banner(COPY.pwa_update_banner, {
      id: 'narvo-pwa-update',
      variant: 'warning',
      duration: 0,
      actions: [
        { label: COPY.pwa_update_action, onClick: () => void activateUpdate() },
        {
          label: COPY.pwa_update_later,
          emphasis: 'secondary',
          onClick: () => dismissUpdateBanner(),
        },
      ],
    });
  }, [activateUpdate, banner, dismissUpdateBanner]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPromptRef.current = event as BeforeInstallPromptEvent;
      showInstallBanner();
    };

    const onAppInstalled = () => {
      installPromptRef.current = null;
      markInstalled();
      dismissInstallBanner();
      if (!installSuccessShownRef.current) {
        installSuccessShownRef.current = true;
        success(COPY.pwa_install_success);
      }
    };

    if (isStandaloneMode()) markInstalled();
    else showInstallBanner();

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [dismissInstallBanner, markInstalled, showInstallBanner, success]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const cleanup: Array<() => void> = [];
    const hadControllerOnLoad = Boolean(navigator.serviceWorker.controller);

    const bindInstallingWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const onStateChange = () => {
        if (worker.state !== 'installed') return;
        if (navigator.serviceWorker.controller) {
          showUpdateBanner();
          return;
        }
        worker.postMessage({ type: 'SKIP_WAITING' });
      };
      worker.addEventListener('statechange', onStateChange);
      cleanup.push(() => worker.removeEventListener('statechange', onStateChange));
    };

    const bindRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;

      if (registration.waiting) {
        if (navigator.serviceWorker.controller) showUpdateBanner();
        else registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      bindInstallingWorker(registration.installing);

      const onUpdateFound = () => bindInstallingWorker(registration.installing);
      registration.addEventListener('updatefound', onUpdateFound);
      cleanup.push(() => registration.removeEventListener('updatefound', onUpdateFound));
    };

    void registerNarvoServiceWorker().then((registration) => {
      if (!registration) return;
      bindRegistration(registration);
    });

    const onControllerChange = () => {
      if (reloadOnControllerChangeRef.current) {
        reloadOnControllerChangeRef.current = false;
        window.location.reload();
        return;
      }
      if (hadControllerOnLoad) showUpdateBanner();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void registrationRef.current?.update().catch(() => {});
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void registrationRef.current?.update().catch(() => {});
    }, 15 * 60 * 1000);

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cleanup.forEach((fn) => fn());
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [showUpdateBanner]);

  return null;
}
