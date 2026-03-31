import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CachedAudioListItem, CacheStats } from '../lib/audioCache';
import * as audioCache from '../lib/audioCache';

const baseItem = (overrides: Partial<CachedAudioListItem>): CachedAudioListItem => ({
  id: 'id',
  title: 'Title',
  source: 'Source',
  duration: '0:30',
  type: 'audio',
  size: 1,
  hasBlob: true,
  cached_at: new Date().toISOString(),
  status: 'complete',
  ...overrides,
});

describe('audioCache.evictStaleEntries', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('evicts entries older than TTL', async () => {
    const now = Date.now();
    const expiredAt = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    const freshAt = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const items: CachedAudioListItem[] = [
      baseItem({ id: 'expired', cached_at: expiredAt }),
      baseItem({ id: 'fresh', cached_at: freshAt }),
    ];

    vi.spyOn(audioCache, 'getAllCachedAudio').mockResolvedValue(items);
    const removeSpy = vi.spyOn(audioCache, 'removeCachedAudio').mockResolvedValue(true);
    vi.spyOn(audioCache, 'getCacheStats').mockResolvedValue({
      totalItems: items.length,
      offlineReady: 1,
      totalSize: 0,
      formattedSize: '0 B',
    } as CacheStats);

    const evicted = await audioCache.evictStaleEntries();

    expect(removeSpy).toHaveBeenCalledWith('expired');
    expect(evicted).toBe(1);
  });

  it('evicts oldest entries when over max item count', async () => {
    const now = Date.now();
    const items: CachedAudioListItem[] = Array.from({ length: 101 }, (_, i) =>
      baseItem({ id: `id-${i}`, cached_at: new Date(now - i * 1000).toISOString() })
    );

    vi.spyOn(audioCache, 'getAllCachedAudio').mockResolvedValue(items);
    const removeSpy = vi.spyOn(audioCache, 'removeCachedAudio').mockResolvedValue(true);
    vi.spyOn(audioCache, 'getCacheStats').mockResolvedValue({
      totalItems: items.length,
      offlineReady: 0,
      totalSize: 0,
      formattedSize: '0 B',
    } as CacheStats);

    const evicted = await audioCache.evictStaleEntries();

    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(evicted).toBe(1);
  });
});

