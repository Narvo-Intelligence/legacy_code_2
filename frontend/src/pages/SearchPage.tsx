import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { Bookmark } from '@phosphor-icons/react/Bookmark';
import { Clock } from '@phosphor-icons/react/Clock';
import { Radio } from '@phosphor-icons/react/Radio';
import { PlayCircle } from '@phosphor-icons/react/PlayCircle';
import { X } from '@phosphor-icons/react/X';
import { Funnel } from '@phosphor-icons/react/Funnel';
import { SortAscending } from '@phosphor-icons/react/SortAscending';
import { useBookmarks } from '../hooks/useBookmarks';
import { useAudio } from '../contexts/AudioContext';
import { useHapticAlert } from '../components/HapticAlerts';
import Skeleton from '../components/Skeleton';
import * as api from '../lib/api';
import logger from '../lib/logger';
import { asArray, asRecord, hasStringId } from '../lib/validators';
import type { Story } from '../types/story';

interface SearchResultItem extends Partial<Story> {
  id: string;
  source_type?: 'radio' | 'podcast' | 'aggregator' | string;
  station?: { id: string; name?: string; bitrate?: number; country?: string };
  aggregator?: string;
}

interface SearchResponse {
  [key: string]: unknown;
  results?: SearchResultItem[];
  total?: number;
}

const getCategoryStyle = (category: string | undefined) => {
  const cat = (category || 'general').toLowerCase();
  const map: Record<string, { text: string; border: string; bg: string }> = {
    finance: { text: 'text-label-finance', border: 'border-label-finance/30', bg: 'bg-label-finance/10' },
    politics: { text: 'text-label-politics', border: 'border-label-politics/30', bg: 'bg-label-politics/10' },
    tech: { text: 'text-label-tech', border: 'border-label-tech/30', bg: 'bg-label-tech/10' },
    health: { text: 'text-label-health', border: 'border-label-health/30', bg: 'bg-label-health/10' },
    podcast: { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' },
    radio: { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' },
  };
  return map[cat] || { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' };
};

const formatPublished = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (err) {
    logger.debug('[SearchPage] Failed to format published date', err);
    return dateStr;
  }
};

const SOURCE_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'RSS', label: 'RSS' },
  { id: 'AGGREGATOR', label: 'Agg' },
  { id: 'PODCAST', label: 'Podcasts' },
  { id: 'RADIO', label: 'Radio' },
];

const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest' },
  { id: 'relevance', label: 'Relevance' },
];

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [allNews, setAllNews] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [totalResults, setTotalResults] = useState(0);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { playTrack, playRadioStation, currentTrack, isPlaying } = useAudio();
  const { showAlert } = useHapticAlert();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get('api/news?limit=50').then(res => res.json()).then((data: unknown) => {
      const items = asArray<SearchResultItem>(data, hasStringId);
      if (!cancelled) {
        setAllNews(items);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setTotalResults(0);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q, limit: '50' });
      if (sourceFilter !== 'ALL') params.set('source_type', sourceFilter.toLowerCase());
      const res = await api.get(`api/search?${params}`);
      if (res.ok) {
        const payload = asRecord<SearchResponse>(await res.json(), {});
        let items = asArray<SearchResultItem>(payload.results, hasStringId);
        if (sortBy === 'latest') {
          items = [...items].sort((a, b) => new Date(b.published || 0).getTime() - new Date(a.published || 0).getTime());
        }
        if (!mountedRef.current) return;
        setResults(items);
        setTotalResults(payload.total ?? items.length);
      }
    } catch (e) {
      console.error('Search error:', e);
    }
    if (mountedRef.current) setSearching(false);
  }, [sortBy, sourceFilter]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      doSearch(query);
      if (query.trim()) setSearchParams({ q: query.trim() }, { replace: true });
      else setSearchParams({}, { replace: true });
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, doSearch, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); doSearch(query); };

  const toggleBookmark = (item: SearchResultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.source_type === 'radio') return;
    if (isBookmarked(item.id)) {
      removeBookmark(item.id);
      showAlert('BOOKMARK_REMOVED');
    } else {
      addBookmark(item as Story);
      showAlert('BOOKMARK_ADDED');
    }
  };

  const displayResults = query.trim() ? results : allNews.slice(0, 8);
  const isSearchActive = query.trim().length > 0;

  const handleResultClick = (item: SearchResultItem) => {
    if (item.source_type === 'radio' && item.station) {
      playRadioStation(item.station);
      return;
    }
    if (item.source_type === 'podcast') {
      playTrack({ id: item.id, title: item.title, summary: item.summary });
      return;
    }
    navigate(`/news/${item.id}`);
  };

  const isRadioPlaying = (item: SearchResultItem) =>
    item.source_type === 'radio' && item.station &&
    currentTrack?.type === 'radio' && currentTrack?.station?.id === item.station.id && isPlaying;

  return (
    <main className="flex-1 flex flex-col bg-background-dark overflow-hidden min-h-0" data-testid="search-page">
      <Helmet>
        <title>Search — NARVO</title>
        <meta property="og:title" content="Search — NARVO" />
        <meta property="og:description" content="Search news, podcasts, and radio across the Narvo network." />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <header className="shrink-0 flex flex-col narvo-border-b bg-background-dark">
        <div className="px-4 md:px-8 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h1 className="font-display text-base md:text-xl font-bold uppercase tracking-tight text-content">
              Search
            </h1>
          </div>
          <form onSubmit={handleSearch} className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 md:w-4 md:h-4 text-forest" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-surface/20 narvo-border pl-11 pr-11 md:pl-10 md:pr-10 py-3 md:py-2.5 text-base md:text-sm mono-ui text-content placeholder:text-forest/60 focus:outline-none focus:border-primary min-h-[48px] md:min-h-0"
              placeholder="News, radio, podcasts..."
              data-testid="search-input"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-forest hover:text-content" aria-label="Clear">
                <X className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>

        <div className="flex items-center gap-2 px-4 md:px-8 pb-3 overflow-x-auto custom-scroll">
          <div className="flex items-center gap-1.5 shrink-0">
            <Funnel className="w-4 h-4 text-forest shrink-0 md:hidden" aria-hidden />
            <span className="mono-ui text-[10px] text-forest font-bold hidden md:inline">Filter</span>
            <div className="flex items-center gap-1 p-1 narvo-border bg-surface/20">
              {SOURCE_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSourceFilter(id)}
                  className={`min-h-[40px] md:min-h-0 px-3 md:px-2.5 py-2 md:py-1 mono-ui text-[11px] md:text-[10px] font-bold whitespace-nowrap transition-colors ${sourceFilter === id ? 'bg-primary text-background-dark' : 'text-forest hover:text-content'}`}
                  data-testid={`source-filter-${id.toLowerCase()}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto md:ml-2">
            <SortAscending className="w-4 h-4 text-forest shrink-0" aria-hidden />
            <div className="flex items-center gap-0.5 p-1 narvo-border bg-surface/20">
              {SORT_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSortBy(id)}
                  className={`min-h-[40px] md:min-h-0 px-3 md:px-2.5 py-2 md:py-1 mono-ui text-[11px] md:text-[10px] font-bold ${sortBy === id ? 'bg-primary text-background-dark' : 'text-forest hover:text-content'}`}
                  data-testid={`sort-${id}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8 pb-2 flex items-center justify-between">
          <span className="mono-ui text-[10px] md:text-[11px] text-forest">
            {isSearchActive ? (searching ? 'Searching…' : `${totalResults} results`) : 'Browse recent'}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll px-4 md:px-8 pb-safe min-w-0">
        {(loading || searching) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-forest/20 narvo-border overflow-hidden rounded-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-background-dark p-4 md:p-5 flex flex-col gap-3">
                <Skeleton variant="text" className="w-20 h-4" />
                <Skeleton variant="text" className="w-full h-5" />
                <Skeleton variant="text" className="w-3/4 h-4" />
              </div>
            ))}
          </div>
        ) : displayResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-forest/20 narvo-border overflow-hidden" data-testid="search-results">
            {displayResults.map((item) => {
              const catStyle = getCategoryStyle(item.category);
              const isRadio = item.source_type === 'radio';
              const isAggregator = item.source_type === 'aggregator' || item.aggregator;
              const playing = isRadio && isRadioPlaying(item);

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleResultClick(item)}
                  aria-label={`Open ${item.title || 'result'}`}
                  className="bg-background-dark p-4 md:p-5 flex flex-col gap-2 md:gap-3 hover:bg-surface/30 active:bg-surface/40 transition-colors cursor-pointer min-w-0 min-h-[120px] md:min-h-0 w-full text-left border-0"
                  data-testid={`search-result-${item.id}`}
                >
                  <div className="flex justify-between items-start gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className={`mono-ui text-[9px] md:text-[10px] border px-1.5 py-0.5 font-bold uppercase shrink-0 ${catStyle.text} ${catStyle.border} ${catStyle.bg}`}>
                        {item.category || (isRadio ? 'RADIO' : 'GENERAL')}
                      </span>
                      {isAggregator && !isRadio && (
                        <span className="mono-ui text-[9px] text-primary border border-primary/30 px-1 py-0.5 bg-primary/10 font-bold shrink-0">AGG</span>
                      )}
                    </div>
                    {!isRadio && (
                      <button
                        onClick={(e) => toggleBookmark(item, e)}
                        className="min-w-[48px] min-h-[48px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center shrink-0 -m-2 md:m-0 rounded-none text-forest hover:text-primary focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
                        data-testid={`bookmark-${item.id}`}
                        aria-label={isBookmarked(item.id) ? 'Remove bookmark' : 'Bookmark'}
                      >
                        <Bookmark className="w-5 h-5 md:w-4 md:h-4" fill={isBookmarked(item.id) ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>
                  <h2 className="font-display text-sm md:text-base font-bold uppercase tracking-tight text-content leading-tight break-words line-clamp-2">
                    {item.title}
                  </h2>
                  {item.summary && (
                    <p className="text-[11px] md:text-xs text-forest font-mono leading-relaxed line-clamp-2 break-words">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2 mono-ui text-[9px] md:text-[10px] text-forest min-w-0">
                    {isRadio ? (
                      <span className="flex items-center gap-1.5 truncate">
                        <Radio className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.source}</span>
                        {item.station?.bitrate && item.station.bitrate > 0 && <span className="shrink-0">{item.station.bitrate}kbps</span>}
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatPublished(item.published) || '—'}
                        </span>
                        <span className="truncate text-right">{item.source || 'NARVO'}</span>
                      </>
                    )}
                    {isRadio && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResultClick(item); }}
                        className="min-w-[48px] min-h-[48px] md:min-w-[32px] md:min-h-[32px] shrink-0 flex items-center justify-center narvo-border bg-primary text-background-dark hover:bg-white transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
                        aria-label={playing ? 'Pause' : 'Play'}
                        data-testid={`play-radio-${item.id}`}
                      >
                        <PlayCircle weight="fill" className="w-5 h-5 md:w-4 md:h-4" />
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : isSearchActive ? (
          <div className="narvo-border bg-surface/20 p-8 md:p-12 text-center">
            <MagnifyingGlass className="w-12 h-12 text-forest mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold text-content uppercase mb-2">No results</h3>
            <p className="mono-ui text-[11px] text-forest mb-6">Query &quot;{query}&quot; returned no matches.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={() => setQuery('')} className="min-h-[48px] px-5 py-2.5 bg-primary mono-ui text-[12px] font-bold text-background-dark hover:bg-white transition-colors">
                Clear
              </button>
              <button onClick={() => navigate('/discover')} className="min-h-[48px] px-5 py-2.5 narvo-border mono-ui text-[12px] font-bold text-primary hover:bg-primary hover:text-background-dark transition-colors">
                Browse Discover
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default SearchPage;
