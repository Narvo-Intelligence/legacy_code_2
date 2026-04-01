import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import NewsDetailPage from '../pages/NewsDetailPage';

const mockStory = {
  id: 'story-1',
  title: 'Narvo redesign moves into article calm mode',
  summary: 'A short summary for the new article surface.',
  short_summary: 'A calmer, cleaner detail shell for long-form reading.',
  narrative: 'First paragraph of the full gist.\nSecond paragraph with more detail.',
  source: 'Narvo Desk',
  category: 'Politics',
  published: '2026-04-01T08:00:00.000Z',
  tags: ['#Design', '#Product'],
  key_takeaways: ['Reading surfaces are calmer.', 'Trust modules remain visible.'],
  certainty_score: 82,
  source_url: 'https://example.com/source',
  original_sources: [
    { name: 'Example Wire', url: 'https://example.com', time: '2026-04-01T07:30:00.000Z', role: 'Initial' },
  ],
  audio_by_lang: { en: 'https://cdn.example.com/story-1.mp3' },
};

const mockRelated = [
  {
    id: 'story-2',
    title: 'Related signal update',
    source: 'Related Desk',
    category: 'Business',
    summary: 'A related story.',
    published: '2026-04-01T07:00:00.000Z',
  },
];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('../contexts/AudioContext', () => ({
  useAudio: () => ({
    playTrack: vi.fn(),
    forcePlayTrack: vi.fn(),
    togglePlay: vi.fn(),
    addToQueue: vi.fn(),
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 120,
    voiceModel: 'emma',
    broadcastLanguage: 'en',
  }),
}));

vi.mock('../hooks/useBookmarks', () => ({
  useBookmarks: () => ({
    isBookmarked: () => false,
    addBookmark: vi.fn(),
    removeBookmark: vi.fn(),
  }),
}));

vi.mock('../components/HapticAlerts', () => ({
  useHapticAlert: () => ({ showAlert: vi.fn() }),
}));

vi.mock('../hooks/useAudioPrefetch', () => ({
  useObservedAudioPrefetch: () => () => {},
  prefetchAndCacheStory: vi.fn(),
}));

vi.mock('../lib/audioCache', () => ({
  downloadAndCacheAudio: vi.fn(async () => undefined),
}));

vi.mock('../components/TruthTag', () => ({
  default: () => <div data-testid="truth-tag">TruthTag</div>,
}));

vi.mock('../components/SourceTimeline', () => ({
  default: () => <div data-testid="source-timeline">SourceTimeline</div>,
}));

vi.mock('../components/CertaintyMeter', () => ({
  default: () => <div data-testid="certainty-meter">CertaintyMeter</div>,
}));

vi.mock('../components/ResponsiveImage', () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ''} data-testid="responsive-image" />,
}));

vi.mock('../components/HashtagText', () => ({
  TagPill: ({ tag }: { tag: string }) => <span>{tag}</span>,
}));

vi.mock('../lib/api', () => ({
  API_BASE: 'https://api.example.com',
  get: vi.fn((path: string) => {
    if (path.includes('/related')) {
      return Promise.resolve({ ok: true, json: async () => mockRelated });
    }
    return Promise.resolve({ ok: true, json: async () => mockStory });
  }),
  post: vi.fn(async () => ({ ok: true, json: async () => ({ audio_url: 'https://cdn.example.com/story-1.mp3' }) })),
}));

describe('NewsDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the calm reading shell and intel rail', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/news/story-1',
              state: { story: mockStory },
            },
          ]}
        >
          <Routes>
            <Route path="/news/:id" element={<NewsDetailPage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(await screen.findByTestId('news-detail-page')).toBeInTheDocument();
    expect(await screen.findByTestId('news-title')).toHaveTextContent(mockStory.title);
    expect(await screen.findByTestId('detail-sidebar')).toBeInTheDocument();
    expect(await screen.findByTestId('article-body')).toBeInTheDocument();
  });
});
