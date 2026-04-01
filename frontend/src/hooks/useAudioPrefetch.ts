import { useCallback, useEffect, useRef } from 'react';
import * as api from '../lib/api';
import { getCachedAudio } from '../lib/audioCache';

export interface PrefetchArticle {
  id: string;
  title?: string;
  summary?: string;
  narrative?: string;
  source?: string;
  [key: string]: unknown;
}

const prefetchedIds = new Set<string>();
const prefetchInFlight = new Set<string>();

/**
 * Prefetch TTS for one article and store in client cache. Safe to call on save/bookmark.
 * Skips if already cached or in-flight.
 */
export async function prefetchAndCacheStory(
  article: PrefetchArticle,
  voiceId: string,
  language: string
): Promise<void> {
  await prefetchOne(article, voiceId, language);
}

/**
 * Prefetch TTS for a list of articles (e.g. bookmarks or listening history loaded on mount).
 * Runs sequentially in the background so it doesn't spike the network.
 */
export async function prefetchBookmarkedStories(
  articles: PrefetchArticle[],
  voiceId: string,
  language: string,
  signal?: AbortSignal
): Promise<void> {
  for (const article of articles) {
    if (signal?.aborted) break;
    await prefetchOne(article, voiceId, language, signal);
    // Yield between items so we don't starve other requests
    await new Promise<void>((r) => setTimeout(r, 400));
  }
}

async function prefetchOne(
  article: PrefetchArticle,
  voiceId: string,
  language: string,
  signal?: AbortSignal
): Promise<void> {
  if (prefetchedIds.has(article.id) || prefetchInFlight.has(article.id)) return;
  try {
    const cached = await getCachedAudio(article.id);
    if (cached?.audio_url) {
      prefetchedIds.add(article.id);
      return;
    }
  } catch (err) {
    /* ignore */
  }
  prefetchInFlight.add(article.id);
  try {
    // Send the full text — backend handles chunked TTS, no frontend truncation
    const text = (article.narrative ?? article.summary ?? article.title ?? '');
    if (!text) return;
    const originalSources = article.original_sources as unknown[] | undefined;
    const prependVerification = Array.isArray(originalSources) && originalSources.length > 1;
    const response = await api.post(
      'api/tts/generate',
      {
        text,
        voice_id: voiceId,
        language,
        prepend_verification: prependVerification,
        ...(article.id ? { story_id: article.id } : {}),
      },
      signal ? { signal } : undefined
    );
    if (!response.ok) return;
    const data = (await response.json()) as { audio_url?: string };
    const audioUrl = data.audio_url;
    if (audioUrl) {
      const { downloadAndCacheAudio } = await import('../lib/audioCache');
      await downloadAndCacheAudio(article.id, audioUrl, {
        title: article.title ?? '',
        source: (article.source as string) ?? '',
      });
    }
    prefetchedIds.add(article.id);
  } catch (err) {
    /* Abort or network error */
  } finally {
    prefetchInFlight.delete(article.id);
  }
}

/**
 * useAudioPrefetch — Prefetches TTS for articles in idle time and writes to client cache.
 * Uses voiceId and language so cached audio matches user settings for instant play.
 */
export function useAudioPrefetch(
  articles: PrefetchArticle[] = [],
  voiceId = 'nova',
  language = 'en',
  limit = 5
): void {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!articles.length) return;

    const toPrefetch = articles
      .filter((a) => !prefetchedIds.has(a.id) && !prefetchInFlight.has(a.id))
      .slice(0, limit);
    if (!toPrefetch.length) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    const run = async () => {
      for (const article of toPrefetch) {
        if (controller.signal.aborted) break;
        await new Promise<void>((resolve) => {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => resolve(), { timeout: 4000 });
          } else {
            setTimeout(resolve, 1500);
          }
        });
        if (controller.signal.aborted) break;
        await prefetchOne(article, voiceId, language, controller.signal);
      }
    };
    run();
    return () => {
      controller.abort();
    };
  }, [articles, voiceId, language, limit]);
}

export interface UseObservedAudioPrefetchOptions {
  voiceId: string;
  language: string;
  limit?: number;
  rootMargin?: string;
  threshold?: number;
}

/**
 * useObservedAudioPrefetch — Prefetches TTS for stories when they enter (or are near) the viewport.
 * Default rootMargin is 300px so stories are warmed before the user scrolls to them.
 * Returns a ref callback: call with (index) to get a ref to attach to the card at that index.
 */
export function useObservedAudioPrefetch(
  stories: PrefetchArticle[],
  options: UseObservedAudioPrefetchOptions
): (index: number) => (el: HTMLElement | null) => void {
  const { voiceId, language, limit = 15, rootMargin = '300px', threshold = 0.01 } = options;
  const elementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetchedCountRef = useRef(0);

  const getRef = useCallback((index: number) => {
    return (el: HTMLElement | null) => {
      const map = elementsRef.current;
      if (el) {
        map.set(index, el);
        observerRef.current?.observe(el);
      } else {
        const old = map.get(index);
        if (old) observerRef.current?.unobserve(old);
        map.delete(index);
      }
    };
  }, []);

  useEffect(() => {
    if (!stories.length || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const index = Array.from(elementsRef.current.entries()).find(([, v]) => v === el)?.[0];
          if (index == null || index >= stories.length) continue;
          if (prefetchedCountRef.current >= limit) continue;
          const story = stories[index];
          if (!story?.id || prefetchedIds.has(story.id) || prefetchInFlight.has(story.id)) continue;

          prefetchedCountRef.current += 1;
          observer.unobserve(el);
          prefetchOne(story, voiceId, language).finally(() => {
            prefetchedCountRef.current = Math.max(0, prefetchedCountRef.current - 1);
          });
        }
      },
      { rootMargin, threshold }
    );
    observerRef.current = observer;
    elementsRef.current.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [stories, voiceId, language, limit, rootMargin, threshold]);

  return getRef;
}
