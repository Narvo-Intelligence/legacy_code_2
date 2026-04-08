'use client';

import { NarvoApiError } from '@/lib/narvo-api';
import {
  clearMyOfflineRemote,
  deleteMyOfflineArticle,
  hasMeAuth,
  postOfflineArticleRemote,
} from '@/lib/me-api';

const OFFLINE_CLOUD_QUEUE_KEY = 'narvo-offline-cloud-queue-v1';

type OfflineCloudUpsertPayload = {
  story_id: string;
  title: string;
  summary?: string;
  narrative?: string;
  source?: string;
  category?: string;
  image_url?: string | null;
};

type OfflineCloudQueueOp =
  | {
      kind: 'upsert';
      story_id: string;
      payload: OfflineCloudUpsertPayload;
      enqueued_at: number;
    }
  | {
      kind: 'delete';
      story_id: string;
      enqueued_at: number;
    }
  | {
      kind: 'clear';
      enqueued_at: number;
    };

let flushPromise: Promise<{ processed: number; remaining: number }> | null = null;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readQueue(): OfflineCloudQueueOp[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_CLOUD_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as OfflineCloudQueueOp[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineCloudQueueOp[]): void {
  if (!canUseStorage()) return;
  try {
    if (queue.length === 0) {
      window.localStorage.removeItem(OFFLINE_CLOUD_QUEUE_KEY);
      return;
    }
    window.localStorage.setItem(OFFLINE_CLOUD_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore storage write failures */
  }
}

function compactQueue(queue: OfflineCloudQueueOp[]): OfflineCloudQueueOp[] {
  let clearOp: Extract<OfflineCloudQueueOp, { kind: 'clear' }> | null = null;
  const byStory = new Map<string, OfflineCloudQueueOp>();

  for (const op of queue) {
    if (!op || typeof op !== 'object') continue;
    if (op.kind === 'clear') {
      clearOp = op;
      byStory.clear();
      continue;
    }
    if (!op.story_id?.trim()) continue;
    const storyId = op.story_id.trim();
    if (op.kind === 'delete' && clearOp && !byStory.has(storyId)) {
      continue;
    }
    byStory.set(storyId, {
      ...op,
      story_id: storyId,
    });
  }

  const next = [...byStory.values()].sort((a, b) => a.enqueued_at - b.enqueued_at);
  return clearOp ? [clearOp, ...next] : next;
}

function enqueue(queueOp: OfflineCloudQueueOp): void {
  const next = compactQueue([...readQueue(), queueOp]);
  writeQueue(next);
}

async function applyQueueOp(op: OfflineCloudQueueOp): Promise<void> {
  if (op.kind === 'clear') {
    await clearMyOfflineRemote();
    return;
  }
  if (op.kind === 'delete') {
    try {
      await deleteMyOfflineArticle(op.story_id);
    } catch (error) {
      if (error instanceof NarvoApiError && error.status === 404) return;
      throw error;
    }
    return;
  }
  await postOfflineArticleRemote(op.payload);
}

export function queueOfflineCloudUpsert(payload: OfflineCloudUpsertPayload): void {
  const storyId = payload.story_id?.trim();
  const title = payload.title?.trim();
  if (!storyId || !title) return;
  enqueue({
    kind: 'upsert',
    story_id: storyId,
    payload: {
      story_id: storyId,
      title,
      summary: payload.summary ?? '',
      narrative: payload.narrative ?? '',
      source: payload.source ?? '',
      category: payload.category ?? 'General',
      image_url: payload.image_url ?? null,
    },
    enqueued_at: Date.now(),
  });
}

export function queueOfflineCloudDelete(storyId: string): void {
  const trimmed = storyId?.trim();
  if (!trimmed) return;
  enqueue({
    kind: 'delete',
    story_id: trimmed,
    enqueued_at: Date.now(),
  });
}

export function queueOfflineCloudClear(): void {
  enqueue({
    kind: 'clear',
    enqueued_at: Date.now(),
  });
}

export function getPendingOfflineCloudQueueLength(): number {
  return readQueue().length;
}

export async function flushOfflineCloudSyncQueue(): Promise<{ processed: number; remaining: number }> {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    const queue = compactQueue(readQueue());
    writeQueue(queue);

    if (queue.length === 0) return { processed: 0, remaining: 0 };
    if (!hasMeAuth()) return { processed: 0, remaining: queue.length };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { processed: 0, remaining: queue.length };
    }

    let processed = 0;
    let remaining = queue;

    for (let index = 0; index < queue.length; index += 1) {
      const op = queue[index]!;
      try {
        await applyQueueOp(op);
      } catch {
        remaining = queue.slice(index);
        writeQueue(remaining);
        return { processed, remaining: remaining.length };
      }
      processed += 1;
      remaining = queue.slice(index + 1);
      writeQueue(remaining);
    }

    return { processed, remaining: 0 };
  })();

  try {
    return await flushPromise;
  } finally {
    flushPromise = null;
  }
}
