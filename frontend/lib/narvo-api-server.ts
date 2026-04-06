/**
 * Server-only fetch helpers (RSC / generateMetadata). Same base URL rules as narvo-api.ts.
 */
import type { ApiNewsDetail } from '@/lib/narvo-api';

export function getNarvoApiBaseServer(): string {
  const raw =
    process.env.NEXT_PUBLIC_NARVO_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.VITE_BACKEND_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'http://127.0.0.1:8000';
}

/** Fetch public story for Open Graph / Twitter metadata (no auth). */
export async function fetchNewsDetailMetadata(newsId: string): Promise<ApiNewsDetail | null> {
  const base = getNarvoApiBaseServer();
  const url = `${base}/api/news/${encodeURIComponent(newsId)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 120 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as ApiNewsDetail;
  } catch {
    return null;
  }
}

export function getAppMetadataBase(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw.endsWith('/') ? raw.slice(0, -1) : raw);
  } catch {
    return undefined;
  }
}
