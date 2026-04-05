'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { saveStoryOffline, OfflineSaveError, type OfflineStoryInput } from '@/lib/offlineStorage';
import { COPY } from '@/lib/narvo-app-copy';

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
  downloadStory: (story: OfflineStoryInput) => Promise<void>;
  clearError: (id: string) => void;
  retryStory: (story: OfflineStoryInput) => void;
};

const OfflineDownloadContext = createContext<OfflineDownloadContextValue | null>(null);

export function OfflineDownloadProvider({ children }: { children: React.ReactNode }) {
  const [progressById, setProgressById] = useState<Record<string, number>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

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
      window.setTimeout(() => clearProgress(story.id), 700);
    } catch (e) {
      console.error('Offline save failed:', e);
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
      downloadStory,
      clearError,
      retryStory,
    }),
    [progressById, errorById, downloadStory, clearError, retryStory]
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
