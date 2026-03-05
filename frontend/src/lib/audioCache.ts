const DB_NAME = 'narvo_audio_cache';
const STORE_NAME = 'audio_files';
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'story_id' });
      store.createIndex('cached_at', 'cached_at');
      store.createIndex('type', 'type');
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

export interface AudioCacheMetadata {
  title?: string;
  source?: string;
  duration?: string;
  type?: string;
}

export interface CachedAudioRecord {
  story_id: string;
  audioBlob?: Blob | null;
  audio_url?: string;
  title: string;
  source: string;
  duration: string;
  type: string;
  size: number;
  cached_at: string;
}

export interface CachedAudioResult extends CachedAudioRecord {
  audio_url: string;
  isOffline: boolean;
}

export interface CachedAudioListItem {
  id: string;
  title: string;
  source: string;
  duration: string;
  type: string;
  size: number;
  hasBlob: boolean;
  cached_at: string;
  status: 'complete' | 'url_only';
}

export interface CacheStats {
  totalItems: number;
  offlineReady: number;
  totalSize: number;
  formattedSize: string;
}

/**
 * Download and cache audio file for offline playback.
 */
export async function downloadAndCacheAudio(
  storyId: string,
  audioUrl: string,
  metadata: AudioCacheMetadata = {},
  onProgress?: ((percent: number) => void) | null
): Promise<boolean> {
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error('Failed to fetch audio');

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (onProgress && total > 0) {
        onProgress(Math.round((loaded / total) * 100));
      }
    }

    const audioBlob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
    const size = audioBlob.size;

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: CachedAudioRecord = {
      story_id: storyId,
      audioBlob,
      title: metadata.title ?? `Audio_${storyId}`,
      source: metadata.source ?? '',
      duration: metadata.duration ?? '',
      type: metadata.type ?? 'audio',
      size,
      cached_at: new Date().toISOString(),
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to download and cache audio:', e);
    return false;
  }
}

/**
 * Cache audio URL reference (without downloading blob).
 * @deprecated Use downloadAndCacheAudio for offline support
 */
export async function cacheAudio(
  storyId: string,
  audioUrl: string,
  metadata: AudioCacheMetadata = {}
): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.put({
      story_id: storyId,
      audio_url: audioUrl,
      audioBlob: null,
      title: metadata.title ?? `Audio_${storyId}`,
      source: metadata.source ?? '',
      duration: metadata.duration ?? '',
      type: metadata.type ?? 'audio',
      size: 0,
      cached_at: new Date().toISOString(),
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to cache audio:', e);
    return false;
  }
}

/**
 * Get cached audio (returns blob URL for offline playback).
 */
export async function getCachedAudio(storyId: string): Promise<CachedAudioResult | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(storyId);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result as CachedAudioRecord | undefined;
        if (!result) {
          resolve(null);
          return;
        }
        if (result.audioBlob) {
          const objectUrl = URL.createObjectURL(result.audioBlob);
          resolve({
            ...result,
            audio_url: objectUrl,
            isOffline: true,
          });
        } else if (result.audio_url) {
          resolve({
            ...result,
            audio_url: result.audio_url,
            isOffline: false,
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Check if audio is cached for offline use.
 */
export async function isAudioCached(storyId: string): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(storyId);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result as CachedAudioRecord | undefined;
        resolve(result?.audioBlob ? true : false);
      };
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Remove cached audio.
 */
export async function removeCachedAudio(storyId: string): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(storyId);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Get all cached audio items with metadata.
 */
export async function getAllCachedAudio(): Promise<CachedAudioListItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const results = (request.result || []) as CachedAudioRecord[];
        resolve(
          results.map((item) => ({
            id: item.story_id,
            title: item.title,
            source: item.source,
            duration: item.duration,
            type: item.type,
            size: item.size,
            hasBlob: !!item.audioBlob,
            cached_at: item.cached_at,
            status: (item.audioBlob ? 'complete' : 'url_only') as 'complete' | 'url_only',
          }))
        );
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Get just the IDs of cached items.
 */
export async function getAllCachedIds(): Promise<string[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve((request.result as string[]) || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get total size of cached audio.
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const items = await getAllCachedAudio();
    const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
    const offlineCount = items.filter((item) => item.hasBlob).length;
    return {
      totalItems: items.length,
      offlineReady: offlineCount,
      totalSize,
      formattedSize: formatBytes(totalSize),
    };
  } catch {
    return { totalItems: 0, offlineReady: 0, totalSize: 0, formattedSize: '0 B' };
  }
}

/**
 * Clear all cached audio.
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
