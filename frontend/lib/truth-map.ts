import type { VerificationStatus } from '@/components/TruthTag';
import type { ApiNewsDetail, ApiNewsListItem } from '@/lib/narvo-api';

export type TruthTagMapped = {
  status: VerificationStatus;
  sources: string[];
  details?: string;
  lastChecked?: string;
};

function statusFromScore(score: number | undefined, tags: string[] | undefined): VerificationStatus {
  if (score == null) return 'unverified';
  const lower = (tags || []).map((t) => t.toLowerCase());
  if (lower.some((t) => t.includes('sensational'))) return 'disputed';
  if (score >= 75) return 'verified';
  if (score < 45) return 'disputed';
  return 'unverified';
}

export function truthTagFromListItem(item: ApiNewsListItem): TruthTagMapped {
  const source = item.source?.trim();
  const sources = source ? [source] : [];
  if (item.trust_score == null && !item.truth_explanation) {
    return {
      status: 'unverified',
      sources,
      details: 'Open the full story for Narvo verification detail.',
    };
  }
  return {
    status: statusFromScore(item.trust_score, item.truth_tags),
    sources: sources.length ? sources : [],
    details: item.truth_explanation || undefined,
    lastChecked: item.published ? formatChecked(item.published) : undefined,
  };
}

export function truthTagFromDetail(detail: ApiNewsDetail): TruthTagMapped {
  const rawSources = detail.sources_used;
  const sources =
    Array.isArray(rawSources) && rawSources.length > 0
      ? rawSources.map(String)
      : detail.source
        ? [detail.source]
        : [];
  const score = typeof detail.trust_score === 'number' ? detail.trust_score : undefined;
  const tags = Array.isArray(detail.truth_tags) ? detail.truth_tags.map(String) : undefined;
  return {
    status: statusFromScore(score, tags),
    sources,
    details: detail.truth_explanation || undefined,
    lastChecked: detail.published ? formatChecked(detail.published) : undefined,
  };
}

function formatChecked(published: string): string {
  const d = new Date(published);
  if (Number.isNaN(d.getTime())) return published;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function confidenceFromDetail(detail: ApiNewsDetail): number {
  const s = detail.trust_score;
  if (typeof s === 'number' && s >= 0 && s <= 100) return Math.round(s);
  return 50;
}

export function sourcesCountFromDetail(detail: ApiNewsDetail): number {
  const used = detail.sources_used;
  if (Array.isArray(used) && used.length > 0) return used.length;
  return detail.source ? 1 : 0;
}
