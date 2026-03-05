import { useEffect, useRef } from 'react';
import * as api from '../lib/api';

interface PrefetchArticle {
  id: string;
  title?: string;
  summary?: string;
  narrative?: string;
  [key: string]: unknown;
}

const prefetchedIds = new Set<string>();

/**
 * useAudioPrefetch — Prefetches TTS audio for news articles in idle time.
 */
export function useAudioPrefetch(
  articles: PrefetchArticle[] = [],
  voiceId = 'nova',
  limit = 3
): void {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!articles.length) return;

    const toPrefetch = articles
      .filter((a) => !prefetchedIds.has(a.id))
      .slice(0, limit);
    if (!toPrefetch.length) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    const prefetch = async () => {
      for (const article of toPrefetch) {
        if (controller.signal.aborted) break;
        try {
          await new Promise<void>((resolve) => {
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(() => resolve(), { timeout: 5000 });
            } else {
              setTimeout(resolve, 2000);
            }
          });
          if (controller.signal.aborted) break;

          const text = (article.narrative ?? article.summary ?? article.title ?? '').slice(0, 500);
          if (!text) continue;

          await api.post(
            'api/tts/generate',
            { text, voice_id: voiceId, language: 'en' },
            { signal: controller.signal }
          );
          prefetchedIds.add(article.id);
        } catch {
          /* Abort or network error */
        }
      }
    };

    prefetch();
    return () => {
      controller.abort();
    };
  }, [articles, voiceId, limit]);
}
