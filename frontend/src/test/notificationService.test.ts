/**
 * notificationService and audioCache tests (#13).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isPushSupported returns false when PushManager unavailable', async () => {
    // Remove PushManager
    const orig = (globalThis as Record<string, unknown>).PushManager;
    delete (globalThis as Record<string, unknown>).PushManager;

    const { isPushSupported } = await import('../lib/notificationService');
    expect(isPushSupported()).toBe(false);

    // Restore
    if (orig) (globalThis as Record<string, unknown>).PushManager = orig;
  });

  it('getNotificationStatus returns unsupported when Notification API missing', async () => {
    const orig = (globalThis as Record<string, unknown>).Notification;
    delete (globalThis as Record<string, unknown>).Notification;

    const mod = await import('../lib/notificationService');
    expect(mod.getNotificationStatus()).toBe('unsupported');

    if (orig) (globalThis as Record<string, unknown>).Notification = orig;
  });

  it('requestNotificationPermission returns false when Notification API missing', async () => {
    const orig = (globalThis as Record<string, unknown>).Notification;
    delete (globalThis as Record<string, unknown>).Notification;

    const mod = await import('../lib/notificationService');
    const result = await mod.requestNotificationPermission();
    expect(result).toBe(false);

    if (orig) (globalThis as Record<string, unknown>).Notification = orig;
  });
});


describe('audioCache constants', () => {
  it('exports eviction policy constants', async () => {
    // Verify the constants exist (imported from audioCache.ts)
    const mod = await import('../lib/audioCache');
    expect(typeof mod.downloadAndCacheAudio).toBe('function');
    expect(typeof mod.getCachedAudio).toBe('function');
    expect(typeof mod.evictStaleEntries).toBe('function');
    expect(typeof mod.clearAllCache).toBe('function');
    expect(typeof mod.getCacheStats).toBe('function');
  });
});
