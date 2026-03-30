/**
 * DashboardPage tests (#13) — verify base render with mocked hooks and data.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../pages/DashboardPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('swr', () => ({
  default: () => ({
    data: {
      news: [
        {
          id: 'story-1',
          title: 'Story One',
          summary: 'Summary one',
          short_summary: 'Short one',
          category: 'Politics',
          source: 'Source A',
          published: new Date().toISOString(),
          tags: ['#POLITICS'],
        },
        {
          id: 'story-2',
          title: 'Story Two',
          summary: 'Summary two',
          category: 'Tech',
          source: 'Source B',
          published: new Date().toISOString(),
        },
      ],
      metrics: { total_sources: 5, listeners_today: 3 },
      settings: { aggregator_mediastack: true, aggregator_newsdata: true, interests: [] },
    },
    mutate: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../contexts/AudioContext', () => ({
  useAudio: () => ({
    playTrack: vi.fn(),
    addToQueue: vi.fn(),
    voiceModel: 'emma',
    broadcastLanguage: 'en',
  }),
}));

vi.mock('../contexts/ContentSourcesContext', () => ({
  useContentSources: () => ({
    getTotalSources: () => 10,
    getLocalSources: () => 5,
    getInternationalSources: () => 3,
    getContinentalSources: () => 2,
    getSourcesByRegion: () => [],
    getHealthForSource: () => ({ status: 'green' }),
    getHealthSummary: () => ({ total: 0, green: 0, amber: 0, red: 0, sources: [] }),
    refreshHealth: vi.fn(),
  }),
}));

vi.mock('../hooks/useBookmarks', () => ({
  useBookmarks: () => ({
    isBookmarked: () => false,
    addBookmark: vi.fn(),
    removeBookmark: vi.fn(),
    bookmarks: [],
  }),
}));

vi.mock('../components/HapticAlerts', () => ({
  useHapticAlert: () => ({ showAlert: vi.fn() }),
}));

vi.mock('../components/TruthTag', () => ({
  default: () => null,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('../hooks/useAudioPrefetch', () => ({
  useAudioPrefetch: vi.fn(),
  useObservedAudioPrefetch: () => () => {},
  prefetchAndCacheStory: vi.fn(),
  prefetchBookmarkedStories: vi.fn(),
}));

vi.mock('../hooks/usePullToRefresh', () => ({
  default: () => ({ containerRef: { current: null }, pulling: false, refreshing: false, pullDistance: 0, handlers: {} }),
}));

vi.mock('../hooks/useNewsRefresh', () => ({
  useNewsRefresh: () => ({ newCount: 0, applyRefresh: vi.fn(), clearNew: vi.fn() }),
}));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: false }),
}));

vi.mock('../lib/api', () => ({
  get: vi.fn((path: string) => {
    if (path.startsWith('api/recommendations')) {
      return Promise.resolve({ ok: true, json: async () => ({ recommendations: [], profile_summary: null }) });
    }
    if (path === 'api/trending') {
      return Promise.resolve({ ok: true, json: async () => ({ tags: [] }) });
    }
    if (path.startsWith('api/settings/')) {
      return Promise.resolve({ ok: true, json: async () => ({ aggregator_mediastack: true, aggregator_newsdata: true, interests: [] }) });
    }
    return Promise.resolve({ ok: true, json: async () => [] });
  }),
  post: vi.fn(),
}));

describe('DashboardPage', () => {
  it('renders featured content and telemetry sidebar', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('featured-card')).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-sidebar')).toBeInTheDocument();
  });
});
