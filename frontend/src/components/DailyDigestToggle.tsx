import { useState, useEffect, useCallback } from 'react';
import { BellRinging, BellSlash } from '@phosphor-icons/react';
import {
  requestNotificationPermission,
  isPushSupported,
  getNotificationStatus,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscription,
  showLocalNotification,
} from '../lib/notificationService';

const DailyDigestToggle = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPermissionStatus(getNotificationStatus());
    if (isPushSupported()) {
      getSubscription().then((sub) => setIsSubscribed(!!sub));
    }
  }, []);

  const handleToggle = useCallback(async () => {
    if (!isPushSupported()) return;
    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
        setIsSubscribed(false);
      } else {
        const granted = await requestNotificationPermission();
        if (granted) {
          await subscribeToPush();
          setIsSubscribed(true);
          showLocalNotification('NARVO DAILY DIGEST', {
            body: 'You will receive daily news briefings and breaking alerts.',
            tag: 'narvo-digest-confirm',
          });
        }
      }
      setPermissionStatus(getNotificationStatus());
    } catch (err) {
      console.error('Notification toggle error:', err);
    }
    setLoading(false);
  }, [isSubscribed]);

  const supported = isPushSupported();
  const denied = permissionStatus === 'denied';

  return (
    <div className="narvo-border p-4 flex items-center justify-between gap-3" data-testid="daily-digest-toggle">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 narvo-border flex items-center justify-center shrink-0">
          {isSubscribed ? (
            <BellRinging className="w-4 h-4 text-primary" weight="fill" />
          ) : (
            <BellSlash className="w-4 h-4 text-forest" />
          )}
        </div>
        <div className="min-w-0">
          <span className="mono-ui text-[12px] text-content font-bold block">DAILY_DIGEST</span>
          <span className="mono-ui text-[9px] text-forest block">
            {!supported ? 'NOT_SUPPORTED_IN_BROWSER' : denied ? 'BLOCKED_IN_BROWSER_SETTINGS' : isSubscribed ? 'NOTIFICATIONS_ACTIVE' : 'ENABLE_PUSH_ALERTS'}
          </span>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={!supported || denied || loading}
        className={`w-11 h-6 narvo-border transition-all relative shrink-0 ${
          isSubscribed ? 'bg-primary' : 'bg-surface/30'
        } ${!supported || denied ? 'opacity-40 cursor-not-allowed' : ''}`}
        data-testid="toggle-daily-digest"
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white transition-all ${
          isSubscribed ? 'right-0.5' : 'left-0.5'
        }`} />
      </button>
    </div>
  );
};

export default DailyDigestToggle;
