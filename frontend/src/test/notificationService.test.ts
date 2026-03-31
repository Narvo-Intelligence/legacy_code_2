import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from '../lib/api';
import { unsubscribeFromPush } from '../lib/notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unsubscribes and notifies backend when subscription exists', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const subscription = { endpoint: 'https://push.example', unsubscribe };
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(subscription),
      },
    };

    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(registration) },
      configurable: true,
    });

    const postSpy = vi.spyOn(api, 'post').mockResolvedValue(new Response(null, { status: 200 }));

    await unsubscribeFromPush();

    expect(unsubscribe).toHaveBeenCalled();
    expect(postSpy).toHaveBeenCalledWith('api/notifications/unsubscribe', { endpoint: subscription.endpoint });
  });

  it('no-ops when no subscription exists', async () => {
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
      },
    };
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: { ready: Promise.resolve(registration) },
      configurable: true,
    });

    const postSpy = vi.spyOn(api, 'post').mockResolvedValue(new Response(null, { status: 200 }));

    await unsubscribeFromPush();

    expect(postSpy).not.toHaveBeenCalled();
  });
});

