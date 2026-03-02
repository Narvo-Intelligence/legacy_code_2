import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, Warning, XCircle, Lightning, Radio, Bell, X } from '@phosphor-icons/react';

// Alert types with their configurations
const ALERT_TYPES = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary',
    textColor: 'text-primary',
    hapticPattern: [100, 50, 100], // vibration pattern in ms
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

// Preset alert messages
export const ALERT_PRESETS = {
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

// Context
const HapticAlertContext = createContext(null);

export const useHapticAlert = () => {
  const context = useContext(HapticAlertContext);
  if (!context) {
    throw new Error('useHapticAlert must be used within HapticAlertProvider');
  }
  return context;
};

// Single Alert Component
const AlertItem = ({ alert, onDismiss }) => {
  const config = ALERT_TYPES[alert.type] || ALERT_TYPES.notification;
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
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 w-1 h-full ${config.borderColor.replace('border-', 'bg-')}`} />
      
      {/* Icon */}
      <div className={`${config.textColor} shrink-0 ml-2`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`mono-ui text-[12px] font-bold ${config.textColor}`}>
            {alert.title}
          </span>
          <span className="mono-ui text-[10px] text-forest">
            [{alert.code}]
          </span>
        </div>
        <p className="mono-ui text-[11px] text-forest leading-relaxed">
          {alert.message}
        </p>
      </div>

      {/* Dismiss */}
      <button 
        type="button"
        onClick={() => onDismiss(alert.id)}
        className="text-forest hover:text-content transition-colors shrink-0 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest/20">
        <div 
          className={`h-full ${config.borderColor.replace('border-', 'bg-')} animate-shrink-width`}
          style={{ animationDuration: `${alert.duration || 5000}ms` }}
        />
      </div>
    </div>
  );
};

// Provider Component
export const HapticAlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Track user interaction for vibration API
  useEffect(() => {
    const handleInteraction = () => setHasUserInteracted(true);
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Trigger haptic feedback if supported and user has interacted
  const triggerHaptic = useCallback((pattern) => {
    if ('vibrate' in navigator && hasUserInteracted) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently fail - vibration not critical
      }
    }
  }, [hasUserInteracted]);

  // Show alert
  const showAlert = useCallback((alertConfig) => {
    const id = Date.now() + Math.random();
    const config = typeof alertConfig === 'string' 
      ? ALERT_PRESETS[alertConfig] 
      : alertConfig;

    if (!config) {
      console.warn(`Unknown alert preset: ${alertConfig}`);
      return;
    }

    const alert = {
      id,
      ...config,
      duration: config.duration || 5000,
    };

    setAlerts(prev => [...prev, alert]);

    // Trigger haptic
    const hapticPattern = ALERT_TYPES[config.type]?.hapticPattern;
    if (hapticPattern) {
      triggerHaptic(hapticPattern);
    }

    return id;
  }, [triggerHaptic]);

  // Dismiss alert
  const dismissAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return (
    <HapticAlertContext.Provider value={{ showAlert, dismissAlert, clearAlerts, alerts }}>
      {children}
      
      {/* Alert Container - aria-live so screen readers announce new alerts */}
      <div 
        className="fixed top-20 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
        data-testid="haptic-alert-container"
        role="region"
        aria-label="Notifications"
      >
        {alerts.map(alert => (
          <div key={alert.id} className="pointer-events-auto">
            <AlertItem alert={alert} onDismiss={dismissAlert} />
          </div>
        ))}
      </div>
    </HapticAlertContext.Provider>
  );
};

// CSS for animations (add to index.css)
export const hapticAlertStyles = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes shrink-width {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}

.animate-shrink-width {
  animation: shrink-width linear forwards;
}
`;

export default HapticAlertProvider;
