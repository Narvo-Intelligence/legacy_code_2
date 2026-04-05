export interface OfflineStory {
  id: string;
  title: string;
  source: string;
  category: string;
  time: string;
  audioBlob?: Blob;
  downloadedAt: number;
}

export type OfflineStoryInput = Omit<OfflineStory, 'downloadedAt'>;

const DB_NAME = 'NarvoOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'stories';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export type OfflineSaveErrorCode = 'quota' | 'db' | 'blocked' | 'unknown';

export class OfflineSaveError extends Error {
  constructor(
    message: string,
    public readonly code: OfflineSaveErrorCode
  ) {
    super(message);
    this.name = 'OfflineSaveError';
  }
}

function classifySaveError(err: unknown): OfflineSaveError {
  if (err instanceof OfflineSaveError) return err;
  if (err instanceof DOMException) {
    if (err.name === 'QuotaExceededError') {
      return new OfflineSaveError('Storage is full. Free space and try again.', 'quota');
    }
  }
  if (err && typeof err === 'object' && 'name' in err && (err as DOMException).name === 'QuotaExceededError') {
    return new OfflineSaveError('Storage is full. Free space and try again.', 'quota');
  }
  return new OfflineSaveError('We could not save this story offline.', 'unknown');
}

export type SaveOfflineOptions = {
  onProgress?: (percent: number) => void;
};

/**
 * Persists a story for offline access. Reports coarse progress for UI (IndexedDB is fast; steps are staged for clarity).
 */
export const saveStoryOffline = async (
  story: OfflineStoryInput,
  options?: SaveOfflineOptions
): Promise<void> => {
  const onProgress = options?.onProgress ?? (() => {});

  const step = async (pct: number) => {
    onProgress(pct);
    await delay(45);
  };

  try {
    await step(8);
    const db = await initDB();
    await step(38);

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        ...story,
        downloadedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    onProgress(92);
    await delay(50);
    onProgress(100);
  } catch (e) {
    throw classifySaveError(e);
  }
};

export const getOfflineStories = async (): Promise<OfflineStory[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const stories = request.result.sort((a, b) => b.downloadedAt - a.downloadedAt);
      resolve(stories);
    };
    request.onerror = () => reject(request.error);
  });
};

export const removeOfflineStory = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearAllOfflineStories = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
