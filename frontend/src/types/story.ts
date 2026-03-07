/**
 * Story / news article shape from backend API (api/news, api/news/:id).
 */
export interface Story {
  id: string;
  title?: string;
  summary?: string;
  short_summary?: string;
  narrative?: string;
  source?: string;
  category?: string;
  tags?: string[];
  image_url?: string | null;
  aggregator?: string;
  recommendation_score?: number;
  published?: string;
  published_at?: string;
  created_at?: string;
  /** Multi-source consensus: when story is merged from several reports */
  original_sources?: { name: string; url: string; time?: string; role?: string }[];
  /** Weighted source authority score 0–100 (Certainty Index) */
  certainty_score?: number;
  [key: string]: unknown;
}
