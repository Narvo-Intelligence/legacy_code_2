/**
 * Shared mock news catalog for feed, news detail, and related-articles logic.
 */

export interface NewsDetail {
  id: string;
  category: string;
  title: string;
  source: string;
  time: string;
  verified: boolean;
  confidence: number;
  sourcesCount: number;
  author: string;
  publishedAt: string;
  tags: string[];
  summary: string[];
  content: string;
  related: { id: string; title: string; source: string }[];
}

export type RelatedArticlePreview = {
  id: string;
  title: string;
  source: string;
  time: string;
  category: string;
};

export const NEWS_DATA: Record<string, NewsDetail> = {
  '1': {
    id: '1',
    category: 'POLITICS',
    title: 'Budget approval expected by Friday as Senate reconvenes',
    source: 'Premium Times',
    time: '3 min',
    verified: true,
    confidence: 94,
    sourcesCount: 5,
    author: 'Oluwamayowa Tijani',
    publishedAt: '2026-04-05T09:00:00Z',
    tags: ['Nigeria', 'Senate', 'Budget 2026', 'Economy'],
    summary: [
      'The Nigerian Senate is set to finalize the 2026 budget approval by Friday.',
      'Key focus areas include infrastructure development and education funding.',
      'Bipartisan support is growing for the proposed fiscal adjustments.',
    ],
    content: `The Nigerian Senate reconvened today with a primary focus on the 2026 national budget. Senate President Godswill Akpabio expressed optimism that the final approval process would be completed by the end of the week. 

The proposed budget, which emphasizes infrastructure development and significant boosts to education and healthcare funding, has seen intense debate over the past month. However, recent committee reports suggest a growing consensus among lawmakers from various political parties.

"We are committed to delivering a budget that reflects the aspirations of all Nigerians," Akpabio stated during the morning session. "The adjustments made in the committee stage have addressed many of the initial concerns regarding fiscal sustainability."

Economists have noted that timely approval of the budget is crucial for maintaining the current economic momentum and ensuring that key developmental projects remain on track.`,
    related: [
      { id: '2', title: 'Naira strengthens to 1,420/$ after CBN intervention', source: 'BusinessDay' },
      { id: '3', title: 'Undersea cable repairs lift connectivity across West Africa', source: 'TechCabal' },
    ],
  },
  '2': {
    id: '2',
    category: 'MARKETS',
    title: 'Naira strengthens to 1,420/$ after CBN intervention',
    source: 'BusinessDay',
    time: '2 min',
    verified: true,
    confidence: 88,
    sourcesCount: 4,
    author: 'Markets Desk',
    publishedAt: '2026-04-05T08:30:00Z',
    tags: ['FX', 'CBN', 'Naira', 'Economy'],
    summary: [
      'The naira gained after recent central bank measures.',
      'Analysts watch liquidity and oil receipts.',
    ],
    content:
      'Placeholder body for dashboard and feed deep links until the live API is wired.',
    related: [
      { id: '1', title: 'Budget approval expected by Friday as Senate reconvenes', source: 'Premium Times' },
    ],
  },
  '3': {
    id: '3',
    category: 'TECH',
    title: 'Undersea cable repairs lift connectivity across West Africa',
    source: 'TechCabal',
    time: '4 min',
    verified: true,
    confidence: 82,
    sourcesCount: 3,
    author: 'Tech Desk',
    publishedAt: '2026-04-05T07:00:00Z',
    tags: ['Infrastructure', 'Connectivity', 'West Africa'],
    summary: [
      'Repairs progress on key submarine links.',
      'ISPs report steadier throughput in coastal cities.',
    ],
    content:
      'Placeholder body for dashboard and feed deep links until the live API is wired.',
    related: [
      { id: '1', title: 'Budget approval expected by Friday as Senate reconvenes', source: 'Premium Times' },
    ],
  },
  '4': {
    id: '4',
    category: 'HEALTH',
    title: 'NHIS expands coverage talks with state health ministries',
    source: 'The Guardian Nigeria',
    time: '3 min',
    verified: true,
    confidence: 79,
    sourcesCount: 3,
    author: 'Health Desk',
    publishedAt: '2026-04-05T06:15:00Z',
    tags: ['NHIS', 'Healthcare', 'Nigeria'],
    summary: [
      'Federal and state teams discuss enrollment expansion.',
      'Funding models remain under review.',
    ],
    content:
      'Placeholder body for dashboard and feed deep links until the live API is wired.',
    related: [
      { id: '1', title: 'Budget approval expected by Friday as Senate reconvenes', source: 'Premium Times' },
    ],
  },
};

export const DEFAULT_NEWS: NewsDetail = {
  id: '0',
  category: 'GENERAL',
  title: 'Story not found',
  source: 'Narvo Intelligence',
  time: '1 min',
  verified: true,
  confidence: 100,
  sourcesCount: 1,
  author: 'Narvo System',
  publishedAt: '2026-04-05T00:00:00Z',
  tags: ['System', 'Error'],
  summary: ['The requested story could not be found.'],
  content: 'Please return to the dashboard to explore more news.',
  related: [],
};

/**
 * Pick 2–3 related items: score by shared category and tags, then fill from `related` links.
 */
export function getRelatedArticlesForStory(
  current: NewsDetail,
  data: Record<string, NewsDetail> = NEWS_DATA
): RelatedArticlePreview[] {
  const out: RelatedArticlePreview[] = [];
  const seen = new Set<string>([current.id]);

  const tagSet = new Set(current.tags.map((t) => t.toLowerCase()));

  const scored = Object.values(data)
    .filter((a) => a.id !== current.id && a.id !== '0')
    .map((a) => {
      let score = 0;
      if (a.category === current.category) score += 5;
      for (const tag of a.tags) {
        if (tagSet.has(tag.toLowerCase())) score += 4;
      }
      return { a, score };
    })
    .sort((x, y) => y.score - x.score);

  for (const { a, score } of scored) {
    if (out.length >= 3) break;
    if (score > 0) {
      out.push({
        id: a.id,
        title: a.title,
        source: a.source,
        time: a.time,
        category: a.category,
      });
      seen.add(a.id);
    }
  }

  for (const r of current.related) {
    if (out.length >= 3) break;
    if (seen.has(r.id)) continue;
    const a = data[r.id];
    if (a) {
      out.push({
        id: a.id,
        title: a.title,
        source: a.source,
        time: a.time,
        category: a.category,
      });
    } else {
      out.push({
        id: r.id,
        title: r.title,
        source: r.source,
        time: '3 min',
        category: 'GENERAL',
      });
    }
    seen.add(r.id);
  }

  return out.slice(0, 3);
}
