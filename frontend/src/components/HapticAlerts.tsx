import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { CheckCircle, Warning, XCircle, Lightning, Radio, Bell, X } from '@phosphor-icons/react';

type AlertTypeKey = 'success' | 'warning' | 'error' | 'breaking' | 'sync' | 'notification';

interface AlertTypeConfig {
  icon: Icon;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hapticPattern: number[];
}

const ALERT_TYPES: Record<AlertTypeKey, AlertTypeConfig> = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary',
    textColor: 'text-primary',
    hapticPattern: [100, 50, 100],
  },
  warning: {
    icon: Warning,
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-500',
    hapticPattern: [200, 100, 200, 100, 200],
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
    textColor: 'text-red-500',
    hapticPattern: [300, 100, 300, 100, 300, 100, 300],
  },
  breaking: {
    icon: Lightning,
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    textColor: 'text-red-500',
    hapticPattern: [500, 200, 500, 200, 500],
  },
  sync: {
    icon: Radio,
    bgColor: 'bg-forest/10',
    borderColor: 'border-forest',
    textColor: 'text-forest',
    hapticPattern: [50, 50, 50],
  },
  notification: {
    icon: Bell,
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/50',
    textColor: 'text-primary',
    hapticPattern: [100],
  },
};

export interface AlertPresetConfig {
  type: AlertTypeKey;
  title: string;
  message: string;
  code: string;
  duration?: number;
}

export const ALERT_PRESETS: Record<string, AlertPresetConfig> = {
  SYNC_SUCCESS: {
    type: 'success',
    title: 'SYNC_COMPLETE',
    message: 'Content successfully synchronized with broadcast server.',
    code: 'SYNC_OK',
  },
  SYNC_FAILED: {
    type: 'error',
    title: 'SYNC_FAILED',
    message: 'Unable to sync with server. Check network connection.',
    code: 'SYNC_ERR',
  },
  BREAKING_NEWS: {
    type: 'breaking',
    title: 'BREAKING_NEWS',
    message: 'New high-priority broadcast incoming.',
    code: 'BREAK_01',
  },
  OFFLINE_SAVED: {
    type: 'success',
    title: 'CACHED_OFFLINE',
    message: 'Content saved for offline access.',
    code: 'CACHE_OK',
  },
  BOOKMARK_ADDED: {
    type: 'sync',
    title: 'BOOKMARK_ADDED',
    message: 'Story added to your saved collection.',
    code: 'BM_ADD',
  },
  BOOKMARK_REMOVED: {
    type: 'sync',
    title: 'BOOKMARK_REMOVED',
    message: 'Story removed from saved collection.',
    code: 'BM_DEL',
  },
  VOICE_CHANGED: {
    type: 'notification',
    title: 'VOICE_UPDATED',
    message: 'Broadcast voice model has been changed.',
    code: 'VOICE_OK',
  },
  NETWORK_ERROR: {
    type: 'error',
    title: 'NETWORK_ERROR',
    message: 'Connection to broadcast server interrupted.',
    code: 'NET_ERR',
  },
  SETTINGS_SAVED: {
    type: 'success',
    title: 'SETTINGS_SAVED',
    message: 'Your preferences have been updated.',
    code: 'SET_OK',
  },
};

export interface HapticAlertItem {
  id: number;
  type: AlertTypeKey;
  title: string;
  message: string;
  code: string;
  duration: number;
}

interface HapticAlertContextValue {
  showAlert: (alertConfig: string | AlertPresetConfig) => number | void;
  dismissAlert: (id: number) => void;
  clearAlerts: () => void;
  alerts: HapticAlertItem[];
}

const HapticAlertContext = createContext<HapticAlertContextValue | null>(null);

export const useHapticAlert = (): HapticAlertContextValue => {
  const context = useContext(HapticAlertContext);
  if (!context) {
    throw new Error('useHapticAlert must be used within HapticAlertProvider');
  }
  return context;
};

interface AlertItemProps {
  alert: HapticAlertItem;
  onDismiss: (id: number) => void;
}

const AlertItem = ({ alert, onDismiss }: AlertItemProps) => {
  const config = ALERT_TYPES[alert.type] ?? ALERT_TYPES.notification;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(alert.id);
    }, alert.duration || 5000);
    return () => clearTimeout(timer);
  }, [alert.id, alert.duration, onDismiss]);

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} border border-[rgb(var(--color-border))]
        p-4 animate-slide-in-right
        flex items-start gap-4 relative overflow-hidden
      `}
      data-testid={`haptic-alert-${alert.type}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${config.borderColor.replace('border-', 'bg-')}`} />
      <div className={`${config.textColor} shrink-0 ml-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`mono-ui text-[12px] font-bold ${config.textColor}`}>{alert.title}</span>
          <span className="mono-ui text-[10px] text-forest">[{alert.code}]</span>
        </div>
        <p className="mono-ui text-[11px] text-forest leading-relaxed">{alert.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(alert.id)}
        className="text-forest hover:text-content transition-colors shrink-0 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest/20">
        <div
          className={`h-full ${config.borderColor.replace('border-', 'bg-')} animate-shrink-width`}
          style={{ animationDuration: `${alert.duration || 5000}ms` }}
        />
      </div>
    </div>
  );
};

interface HapticAlertProviderProps {
  children: React.ReactNode;
}

export const HapticAlertProvider = ({ children }: HapticAlertProviderProps) => {
  const [alerts, setAlerts] = useState<HapticAlertItem[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    const handleInteraction = () => setHasUserInteracted(true);
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const triggerHaptic = useCallback((pattern: number[]) => {
    if ('vibrate' in navigator && hasUserInteracted) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently fail
      }
    }
  }, [hasUserInteracted]);

  const showAlert = useCallback((alertConfig: string | AlertPresetConfig): number | void => {
    const id = Date.now() + Math.random();
    const config = typeof alertConfig === 'string' ? ALERT_PRESETS[alertConfig] : alertConfig;

    if (!config) {
      console.warn(`Unknown alert preset: ${String(alertConfig)}`);
      return;
    }

    const alert: HapticAlertItem = {
      id,
      ...config,
      duration: config.duration ?? 5000,
    };

    setAlerts((prev) => [...prev, alert]);

    const hapticPattern = ALERT_TYPES[config.type]?.hapticPattern;
    if (hapticPattern) {
      triggerHaptic(hapticPattern);
    }

    return id;
  }, [triggerHaptic]);

  const dismissAlert = useCallback((id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return (
    <HapticAlertContext.Provider value={{ showAlert, dismissAlert, clearAlerts, alerts }}>
      {children}
      <div
        className="fixed top-20 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
        data-testid="haptic-alert-container"
        role="region"
        aria-label="Notifications"
      >
        {alerts.map((alert) => (
          <div key={alert.id} className="pointer-events-auto">
            <AlertItem alert={alert} onDismiss={dismissAlert} />
          </div>
        ))}
      </div>
    </HapticAlertContext.Provider>
  );
};

export const hapticAlertStyles = `
@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes shrink-width {
  from { width: 100%; }
  to { width: 0%; }
}
.animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
.animate-shrink-width { animation: shrink-width linear forwards; }
`;

export default HapticAlertProvider;
