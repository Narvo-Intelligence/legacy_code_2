import React, { createContext, useContext, useState, useCallback } from 'react';
import { downloadAndCacheAudio } from '../lib/audioCache';

export type DownloadQueueItemStatus = 'pending' | 'downloading' | 'complete' | 'failed';

export interface DownloadQueueItem {
  id: string;
  audioUrl: string;
  title?: string;
  source?: string;
  duration?: string;
  type?: string;
  status: DownloadQueueItemStatus;
  progress: number;
  addedAt: number;
  [key: string]: unknown;
}

interface DownloadQueueContextValue {
  queue: DownloadQueueItem[];
  currentDownload: DownloadQueueItem | null;
  isProcessing: boolean;
  completedCount: number;
  totalCount: number;
  pendingCount: number;
  downloadingCount: number;
  failedCount: number;
  overallProgress: number;
  addToQueue: (items: Array<Pick<DownloadQueueItem, 'id' | 'audioUrl'> & Partial<DownloadQueueItem>>) => void;
  addSingleToQueue: (item: Pick<DownloadQueueItem, 'id' | 'audioUrl'> & Partial<DownloadQueueItem>) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  removeFromQueue: (id: string) => void;
}

const DownloadQueueContext = createContext<DownloadQueueContextValue | null>(null);

export const useDownloadQueue = (): DownloadQueueContextValue => {
  const context = useContext(DownloadQueueContext);
  if (!context) {
    throw new Error('useDownloadQueue must be used within DownloadQueueProvider');
  }
  return context;
};

export const DownloadQueueProvider = ({ children }: { children: React.ReactNode }) => {
  const [queue, setQueue] = useState<DownloadQueueItem[]>([]);
  const [currentDownload, setCurrentDownload] = useState<DownloadQueueItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const addToQueue = useCallback((items: Array<Pick<DownloadQueueItem, 'id' | 'audioUrl'> & Partial<DownloadQueueItem>>) => {
    const newItems: DownloadQueueItem[] = items.map((item) => ({
      ...item,
      status: 'pending' as const,
      progress: 0,
      addedAt: Date.now(),
    } as DownloadQueueItem));
    setQueue((prev) => [...prev, ...newItems]);
    setTotalCount((prev) => prev + newItems.length);
  }, []);

  const addSingleToQueue = useCallback(
    (item: Pick<DownloadQueueItem, 'id' | 'audioUrl'> & Partial<DownloadQueueItem>) => {
      addToQueue([item]);
    },
    [addToQueue]
  );

  const processQueue = useCallback(async () => {
    if (isProcessing) return;
    const pendingItem = queue.find((item) => item.status === 'pending');
    if (!pendingItem) return;

    setIsProcessing(true);
    setQueue((prev) =>
      prev.map((item) =>
        item.id === pendingItem.id ? { ...item, status: 'downloading' as const } : item
      )
    );
    setCurrentDownload(pendingItem);

    try {
      const success = await downloadAndCacheAudio(
        pendingItem.id,
        pendingItem.audioUrl,
        {
          title: pendingItem.title,
          source: pendingItem.source,
          duration: pendingItem.duration,
          type: pendingItem.type ?? 'podcast',
        },
        (progress) => {
          setQueue((prev) =>
            prev.map((item) => (item.id === pendingItem.id ? { ...item, progress } : item))
          );
        }
      );

      setQueue((prev) =>
        prev.map((item) =>
          item.id === pendingItem.id
            ? { ...item, status: success ? ('complete' as const) : ('failed' as const), progress: 100 }
            : item
        )
      );
      if (success) setCompletedCount((prev) => prev + 1);
    } catch (error) {
      console.error('Download failed:', error);
      setQueue((prev) =>
        prev.map((item) =>
          item.id === pendingItem.id ? { ...item, status: 'failed' as const } : item
        )
      );
    }

    setCurrentDownload(null);
    setIsProcessing(false);
  }, [queue, isProcessing]);

  React.useEffect(() => {
    const hasPending = queue.some((item) => item.status === 'pending');
    if (hasPending && !isProcessing) {
      processQueue();
    }
  }, [queue, isProcessing, processQueue]);

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== 'complete'));
  }, []);

  const clearAll = useCallback(() => {
    setQueue([]);
    setCompletedCount(0);
    setTotalCount(0);
    setCurrentDownload(null);
    setIsProcessing(false);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const downloadingCount = queue.filter((item) => item.status === 'downloading').length;
  const failedCount = queue.filter((item) => item.status === 'failed').length;

  const value: DownloadQueueContextValue = {
    queue,
    currentDownload,
    isProcessing,
    completedCount,
    totalCount,
    pendingCount,
    downloadingCount,
    failedCount,
    overallProgress,
    addToQueue,
    addSingleToQueue,
    clearCompleted,
    clearAll,
    removeFromQueue,
  };

  return (
    <DownloadQueueContext.Provider value={value}>
      {children}
    </DownloadQueueContext.Provider>
  );
};
