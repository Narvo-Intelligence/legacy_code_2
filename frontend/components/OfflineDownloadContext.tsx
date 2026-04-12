'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { saveStoryOffline, OfflineSaveError, type OfflineStoryInput } from '@/lib/offlineStorage';
import { narvoTrack } from '@/lib/narvo-analytics';
import { COPY } from '@/lib/narvo-app-copy';
import { fetchNewsDetail } from '@/lib/narvo-api';
import { getPreferredBroadcastLanguage } from '@/lib/listening-preferences';
import { hasMeAuth } from '@/lib/me-api';
import {
  flushOfflineCloudSyncQueue,
  queueOfflineCloudUpsert,
} from '@/lib/offline-cloud-sync';

function userMessageFor(err: unknown): string {
  if (err instanceof OfflineSaveError) {
    if (err.code === 'quota') return COPY.offline_error_quota;
    return COPY.offline_error_generic;
  }
  return COPY.offline_error_generic;
}

type OfflineDownloadContextValue = {
  progressById: Record<string, number>;
  errorById: Record<string, string>;
  /** Clears after a few seconds — inline “saved” feedback on detail rows. */
  savedFlashId: string | null;
  downloadStory: (story: OfflineStoryInput) => Promise<void>;
  clearError: (id: string) => void;
  retryStory: (story: OfflineStoryInput) => void;
};

const OfflineDownloadContext = createContext<OfflineDownloadContextValue | null>(null);

export function OfflineDownloadProvider({ children }: { children: React.ReactNode }) {
  const [progressById, setProgressById] = useState<Record<string, number>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [savedFlashId, setSavedFlashId] = useState<string | null>(null);

  const clearProgress = useCallback((id: string) => {
    setProgressById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const downloadStory = useCallback(async (story: OfflineStoryInput) => {
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[story.id];
      return next;
    });
    setProgressById((prev) => ({ ...prev, [story.id]: 0 }));

    try {
      await saveStoryOffline(story, {
        onProgress: (pct) => {
          setProgressById((prev) => ({ ...prev, [story.id]: pct }));
        },
      });
      narvoTrack('offline_save_success', {
        story_id: story.id,
        category: story.category || null,
        source: story.source || null,
        authenticated: hasMeAuth(),
      });
      if (hasMeAuth()) {
        queueOfflineCloudUpsert({
          story_id: story.id,
          title: story.title,
          source: story.source,
          category: story.category,
        });
        void flushOfflineCloudSyncQueue();
        void (async () => {
          try {
            const d = await fetchNewsDetail(story.id, { language: getPreferredBroadcastLanguage() });
            const rawImg = d.image_url != null ? String(d.image_url).trim() : '';
            queueOfflineCloudUpsert({
              story_id: d.id,
              title: (d.title || story.title).trim(),
              summary: String(d.short_summary || d.summary || ''),
              narrative: String(d.narrative || ''),
              source: (d.source || story.source).trim(),
              category: String(d.category || story.category || 'General'),
              image_url: rawImg.length > 0 ? rawImg : null,
            });
            void flushOfflineCloudSyncQueue();
          } catch (err) {
            console.warn('[Narvo] Offline cloud sync failed (could not load story detail for cloud payload):', err);
          }
        })();
      }
      window.setTimeout(() => clearProgress(story.id), 700);
      setSavedFlashId(story.id);
      window.setTimeout(() => {
        setSavedFlashId((cur) => (cur === story.id ? null : cur));
      }, 4000);
    } catch (e) {
      console.error('Offline save failed:', e);
      narvoTrack('offline_save_failed', {
        story_id: story.id,
        category: story.category || null,
        source: story.source || null,
        authenticated: hasMeAuth(),
        message: e instanceof Error ? e.message : 'unknown_error',
      });
      clearProgress(story.id);
      setErrorById((prev) => ({ ...prev, [story.id]: userMessageFor(e) }));
    }
  }, [clearProgress]);

  const clearError = useCallback((id: string) => {
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const retryStory = useCallback(
    (story: OfflineStoryInput) => {
      void downloadStory(story);
    },
    [downloadStory]
  );

  const value = useMemo(
    () => ({
      progressById,
      errorById,
      savedFlashId,
      downloadStory,
      clearError,
      retryStory,
    }),
    [progressById, errorById, savedFlashId, downloadStory, clearError, retryStory]
  );

  return <OfflineDownloadContext.Provider value={value}>{children}</OfflineDownloadContext.Provider>;
}

export function useOfflineDownload() {
  const ctx = useContext(OfflineDownloadContext);
  if (!ctx) {
    throw new Error('useOfflineDownload must be used within OfflineDownloadProvider');
  }
  return ctx;
}

export function useOptionalOfflineDownload(): OfflineDownloadContextValue | null {
  return useContext(OfflineDownloadContext);
}
