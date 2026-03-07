import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from '@phosphor-icons/react/Bell';
import { BellRinging } from '@phosphor-icons/react/BellRinging';
import { X } from '@phosphor-icons/react/X';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { Lightning } from '@phosphor-icons/react/Lightning';
import * as api from '../lib/api';
import { supabase } from '../lib/supabase';

export interface BreakingStory {
  id: string;
  title: string;
  published_at?: string;
  [key: string]: unknown;
}

interface BreakingNewsContextValue {
  breakingStories: BreakingStory[];
  notificationsEnabled: boolean;
  requestPermission: () => Promise<boolean>;
  dismissStory: (id: string) => void;
  setNotificationsEnabled: (v: boolean) => void;
}

const BreakingNewsContext = createContext<BreakingNewsContextValue>({} as BreakingNewsContextValue);

export const useBreakingNews = () => useContext(BreakingNewsContext);

interface BreakingNewsProviderProps {
  children: React.ReactNode;
}

export const BreakingNewsProvider = ({ children }: BreakingNewsProviderProps) => {
  const [breakingStories, setBreakingStories] = useState<BreakingStory[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const lastCheckRef = useRef<number | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const sendBrowserNotification = useCallback((story: BreakingStory) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('NARVO // BREAKING', {
        body: story.title,
        icon: '/narvo-icon-192.png',
        tag: story.id,
        requireInteraction: true,
      });
      notification.onclick = () => {
        window.focus();
        window.location.href = `/news/${story.id}`;
      };
    }
  }, []);

  useEffect(() => {
    const checkBreaking = async () => {
      try {
        const res = await api.get('api/news/breaking');
        if (res.ok) {
          const stories: BreakingStory[] = await res.json();
          const newStories = stories.filter((s) => !seenIdsRef.current.has(s.id));
          if (newStories.length > 0 && notificationsEnabled && lastCheckRef.current != null) {
            newStories.forEach((story) => sendBrowserNotification(story));
          }
          stories.forEach((s) => seenIdsRef.current.add(s.id));
          setBreakingStories(stories);
          lastCheckRef.current = Date.now();
        }
      } catch {
        // Silently fail
      }
    };
    checkBreaking();
    const interval = setInterval(checkBreaking, 30000);
    return () => clearInterval(interval);
  }, [notificationsEnabled, sendBrowserNotification]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('breaking-news')
      .on('broadcast', { event: 'update' }, ({ payload }: { payload?: { stories?: BreakingStory[] } }) => {
        const stories = payload?.stories;
        if (Array.isArray(stories) && stories.length > 0) {
          stories.forEach((s) => seenIdsRef.current.add(s.id));
          setBreakingStories((prev) => {
            const byId = new Map(prev.map((p) => [p.id, p]));
            stories.forEach((s) => byId.set(s.id, s));
            return Array.from(byId.values()).sort((a, b) =>
              (b.published_at ?? b.id).localeCompare(a.published_at ?? a.id)
            );
          });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      return permission === 'granted';
    }
    return false;
  }, []);

  const dismissStory = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const activeBreaking = breakingStories.filter((s) => !dismissed.has(s.id));

  return (
    <BreakingNewsContext.Provider
      value={{
        breakingStories: activeBreaking,
        notificationsEnabled,
        requestPermission,
        dismissStory,
        setNotificationsEnabled,
      }}
    >
      {children}
    </BreakingNewsContext.Provider>
  );
};

export const BreakingNewsBanner = () => {
  const { breakingStories, dismissStory } = useBreakingNews();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (breakingStories.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % breakingStories.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [breakingStories.length]);

  if (breakingStories.length === 0) return null;

  const story = breakingStories[currentIndex % breakingStories.length];
  if (!story) return null;

  return (
    <div
      className="bg-red-950/90 border-b border-red-500/50 px-4 py-2 flex items-center gap-3 animate-pulse-subtle"
      data-testid="breaking-news-banner"
    >
      <div className="flex items-center gap-2 shrink-0">
        <Lightning className="w-3.5 h-3.5 text-red-400" />
        <span className="mono-ui text-[11px] md:text-[12px] text-red-400 font-bold tracking-widest">
          {t('notifications.breaking_news')}
        </span>
      </div>
      <button onClick={() => navigate(`/news/${story.id}`)} className="flex-1 min-w-0 text-left group">
        <span className="mono-ui text-[12px] md:text-[13px] text-white font-bold truncate block group-hover:text-red-300 transition-colors">
          {story.title}
        </span>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate(`/news/${story.id}`)}
          className="mono-ui text-[10px] text-red-400 font-bold hover:text-white transition-colors hidden sm:block"
          data-testid="breaking-read-now"
        >
          {t('notifications.read_now')}
          <ArrowRight className="w-3 h-3 inline ml-1" />
        </button>
        <button
          onClick={() => dismissStory(story.id)}
          className="p-1 hover:bg-red-500/20 transition-colors"
          data-testid="breaking-dismiss"
        >
          <X className="w-3 h-3 text-red-400" />
        </button>
      </div>
      {breakingStories.length > 1 && (
        <span className="mono-ui text-[9px] text-red-400 shrink-0">
          {currentIndex + 1}/{breakingStories.length}
        </span>
      )}
    </div>
  );
};

export const NotificationToggle = () => {
  const { notificationsEnabled, requestPermission } = useBreakingNews();
  const { t } = useTranslation();

  const handleToggle = async () => {
    if (!notificationsEnabled) {
      await requestPermission();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-3 narvo-border px-4 py-3 transition-all ${
        notificationsEnabled
          ? 'bg-primary/10 border-primary text-primary'
          : 'bg-surface/10 text-forest hover:border-primary hover:text-primary'
      }`}
      data-testid="notification-toggle"
    >
      {notificationsEnabled ? <BellRinging className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
      <span className="mono-ui text-[12px] font-bold">
        {notificationsEnabled ? t('notifications.notifications_enabled') : t('notifications.enable_notifications')}
      </span>
    </button>
  );
};
