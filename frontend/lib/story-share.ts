'use client';

import { getNarvoApiBase } from '@/lib/narvo-api';
import { storyUrlOnSite } from '@/lib/site-url';

export type StorySharePayload = {
  storyId: string;
  title: string;
  summary?: string | null;
  source?: string | null;
};

export type StoryShareResult = 'native' | 'clipboard' | 'whatsapp' | 'cancelled' | 'unsupported';

type StoryShareServerPayload = {
  title?: string | null;
  summary?: string | null;
  story_url?: string | null;
  autoplay_url?: string | null;
  share_text?: string | null;
  whatsapp_url?: string | null;
};

function compactText(value: string | null | undefined, maxChars: number): string {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function isShareAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function getStoryShareUrl(storyId: string): string {
  return storyUrlOnSite(storyId);
}

export function getStoryAutoplayUrl(storyId: string, lang?: string | null): string {
  const url = new URL(getStoryShareUrl(storyId), typeof window !== 'undefined' ? window.location.origin : 'https://narvo.news');
  url.searchParams.set('play', '1');
  const normalizedLang = (lang || '').trim().toLowerCase();
  if (normalizedLang) url.searchParams.set('lang', normalizedLang);
  return url.toString();
}

async function fetchStorySharePayload(
  storyId: string,
  opts?: { lang?: string | null }
): Promise<StoryShareServerPayload | null> {
  if (typeof window === 'undefined') return null;
  try {
    const query = new URLSearchParams();
    const lang = (opts?.lang || '').trim().toLowerCase();
    if (lang) query.set('lang', lang);
    const url = `${getNarvoApiBase()}/api/share/${encodeURIComponent(storyId)}/payload${
      query.toString() ? `?${query.toString()}` : ''
    }`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as StoryShareServerPayload;
  } catch {
    return null;
  }
}

export function buildStoryShareBlurb(payload: StorySharePayload): string {
  const summary = compactText(payload.summary, 160);
  if (summary) return summary;
  const source = (payload.source || '').trim();
  if (source) return `Cross-checked by Narvo from ${source}.`;
  return 'Cross-checked by Narvo.';
}

export function buildWhatsAppStoryShareText(payload: StorySharePayload): string {
  const lines = [(payload.title || 'Narvo story').trim()];
  const summary = compactText(payload.summary, 220);
  const source = (payload.source || '').trim();
  if (summary) lines.push(summary);
  if (source) lines.push(`Source: ${source}`);
  lines.push(`Tap to listen on Narvo: ${getStoryAutoplayUrl(payload.storyId, 'pcm')}`);
  return lines.join('\n\n');
}

export function buildWhatsAppStoryShareUrl(payload: StorySharePayload): string {
  return `https://wa.me/?text=${encodeURIComponent(buildWhatsAppStoryShareText(payload))}`;
}

export async function shareStory(payload: StorySharePayload): Promise<StoryShareResult> {
  if (typeof window === 'undefined') return 'unsupported';
  const remote = await fetchStorySharePayload(payload.storyId);
  const url = (remote?.story_url || '').trim() || getStoryShareUrl(payload.storyId);
  const title = (remote?.title || payload.title || 'Narvo story').trim();
  const text = (remote?.share_text || '').trim() || buildStoryShareBlurb(payload);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'native';
    } catch (error) {
      if (isShareAbort(error)) return 'cancelled';
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return 'clipboard';
    } catch {
      return 'unsupported';
    }
  }

  return 'unsupported';
}

export async function openStoryOnWhatsApp(payload: StorySharePayload): Promise<StoryShareResult> {
  if (typeof window === 'undefined') return 'unsupported';
  const remote = await fetchStorySharePayload(payload.storyId, { lang: 'pcm' });
  const url = (remote?.whatsapp_url || '').trim() || buildWhatsAppStoryShareUrl(payload);
  window.open(url, '_blank', 'noopener,noreferrer');
  return 'whatsapp';
}
