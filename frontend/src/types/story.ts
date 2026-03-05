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
  [key: string]: unknown;
}
