/**
 * In-app href for the article behind a news track (global player → story page).
 * Excludes briefings, radio, podcasts, and other non-article queues.
 */
export function getNewsArticleHrefFromTrack(track: {
  id: string;
  category?: string;
} | null): string | null {
  if (!track?.id) return null;
  const cat = track.category?.toUpperCase() ?? '';
  if (cat === 'BRIEFING' || cat === 'RADIO' || cat === 'PODCAST') return null;
  if (track.id === 'briefing-pending' || track.id.startsWith('briefing-')) return null;
  if (track.id.startsWith('podcast-')) return null;
  return `/news/${encodeURIComponent(track.id)}`;
}
