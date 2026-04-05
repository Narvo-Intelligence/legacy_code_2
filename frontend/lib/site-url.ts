/**
 * Canonical public site origin for share links and absolute URLs.
 * Set NEXT_PUBLIC_APP_URL (e.g. https://narvo.news or http://localhost:3000).
 */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return '';
}

export function storyUrlOnSite(storyId: string): string {
  const base = getSiteOrigin();
  if (base) return `${base}/news/${encodeURIComponent(storyId)}`;
  if (typeof window !== 'undefined') return `${window.location.origin}/news/${encodeURIComponent(storyId)}`;
  return `/news/${encodeURIComponent(storyId)}`;
}
