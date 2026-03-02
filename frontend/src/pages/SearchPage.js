import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, Bookmark, Clock, Radio, PlayCircle, X } from '@phosphor-icons/react';
import { useBookmarks } from '../hooks/useBookmarks';
import { useAudio } from '../contexts/AudioContext';
import Skeleton from '../components/Skeleton';
import * as api from '../lib/api';

const getCategoryStyle = (category) => {
  const cat = (category || 'general').toLowerCase();
  const map = {
    finance: { text: 'text-label-finance', border: 'border-label-finance/30', bg: 'bg-label-finance/10' },
    politics: { text: 'text-label-politics', border: 'border-label-politics/30', bg: 'bg-label-politics/10' },
    tech: { text: 'text-label-tech', border: 'border-label-tech/30', bg: 'bg-label-tech/10' },
    health: { text: 'text-label-health', border: 'border-label-health/30', bg: 'bg-label-health/10' },
    podcast: { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' },
    radio: { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' },
  };
  return map[cat] || { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' };
};

const formatPublished = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
};

const SOURCE_FILTERS = ['ALL', 'RSS', 'AGGREGATOR', 'PODCAST', 'RADIO'];

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [allNews, setAllNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [totalResults, setTotalResults] = useState(0);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { playTrack, playRadioStation, currentTrack, isPlaying } = useAudio();
  const searchTimer = useRef(null);

  useEffect(() => {
    api.get('api/news?limit=50').then(res => res.json()).then(data => {
      setAllNews(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const doSearch = useCallback(async (q) => {
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
        const data = await res.json();
        let items = data.results || [];
        if (sortBy === 'latest' && items.some(i => i.published)) {
          items = [...items].sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
        }
        setResults(items);
        setTotalResults(data.total ?? items.length);
      }
    } catch (e) {
      console.error('Search error:', e);
    }
    setSearching(false);
  }, [sortBy, sourceFilter]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      doSearch(query);
      if (query.trim()) setSearchParams({ q: query.trim() }, { replace: true });
      else setSearchParams({}, { replace: true });
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [query, doSearch, setSearchParams]);

  const handleSearch = (e) => { e.preventDefault(); doSearch(query); };

  const toggleBookmark = (item, e) => {
    e.stopPropagation();
    if (item.source_type === 'radio') return;
    if (isBookmarked(item.id)) removeBookmark(item.id);
    else addBookmark(item);
  };

  const displayResults = query.trim() ? results : allNews.slice(0, 8);
  const isSearchActive = query.trim().length > 0;

  const handleResultClick = (item) => {
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

  const isRadioPlaying = (item) =>
    item.source_type === 'radio' && item.station &&
    currentTrack?.type === 'radio' && currentTrack?.station?.id === item.station.id && isPlaying;

  return (
    <main className="flex-1 flex flex-col bg-background-dark overflow-y-auto overflow-x-hidden custom-scroll min-h-0" data-testid="search-page">
      {/* Compact header + search */}
      <header className="shrink-0 px-4 md:px-8 py-4 narvo-border-b bg-background-dark">
        <h1 className="font-display text-lg md:text-xl font-bold uppercase tracking-tight text-content hidden md:block mb-4">
          Search
        </h1>
        <form onSubmit={handleSearch} className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-surface/20 narvo-border pl-10 pr-10 py-2.5 md:py-3 text-sm md:text-base mono-ui text-content placeholder:text-forest/60 focus:outline-none focus:border-primary"
            placeholder="News, radio, podcasts, RSS..."
            data-testid="search-input"
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-forest hover:text-content" aria-label="Clear">
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </header>

      {/* Filters bar: 8pt grid, design system */}
      <div className="h-10 flex items-center justify-between px-4 md:px-8 bg-surface/10 narvo-border-b shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto custom-scroll">
          <span className="mono-ui text-[10px] md:text-[11px] text-forest shrink-0">
            {isSearchActive ? (searching ? 'SEARCHING...' : `${totalResults} RESULTS`) : 'BROWSE'}
          </span>
          <div className="flex items-center gap-0.5 p-0.5 narvo-border bg-background-dark shrink-0">
            {SOURCE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setSourceFilter(f)}
                className={`px-2 py-1 mono-ui text-[9px] md:text-[10px] font-bold whitespace-nowrap ${sourceFilter === f ? 'bg-primary text-background-dark' : 'text-forest hover:text-content'}`}
                data-testid={`source-filter-${f.toLowerCase()}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-0.5 p-0.5 narvo-border bg-background-dark shrink-0">
          <button
            onClick={() => setSortBy('latest')}
            className={`px-2 py-1 mono-ui text-[9px] md:text-[10px] font-bold ${sortBy === 'latest' ? 'bg-primary text-background-dark' : 'text-forest hover:text-content'}`}
            data-testid="sort-latest"
          >
            LATEST
          </button>
          <button
            onClick={() => setSortBy('relevance')}
            className={`px-2 py-1 mono-ui text-[9px] md:text-[10px] ${sortBy === 'relevance' ? 'bg-primary text-background-dark font-bold' : 'text-forest hover:text-content'}`}
            data-testid="sort-relevance"
          >
            RELEVANCE
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 p-4 md:p-8 pb-28 md:pb-8 min-w-0">
        {(loading || searching) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-forest/20 narvo-border overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-background-dark p-4 flex flex-col gap-3">
                <Skeleton variant="text" className="w-16 h-4" />
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
                <article
                  key={item.id}
                  onClick={() => handleResultClick(item)}
                  className="bg-background-dark p-4 md:p-5 flex flex-col gap-2 md:gap-3 hover:bg-surface/30 transition-colors cursor-pointer narvo-border md:border-0 min-w-0"
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
                        className={`shrink-0 ${isBookmarked(item.id) ? 'text-primary' : 'text-forest hover:text-primary'}`}
                        data-testid={`bookmark-${item.id}`}
                        aria-label={isBookmarked(item.id) ? 'Remove bookmark' : 'Bookmark'}
                      >
                        <Bookmark className="w-4 h-4" fill={isBookmarked(item.id) ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>
                  <h2 className="font-display text-sm md:text-base font-bold uppercase tracking-tight text-content leading-tight group-hover:text-primary break-words line-clamp-2">
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
                        {item.station?.bitrate > 0 && <span className="shrink-0">{item.station.bitrate}kbps</span>}
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
                        className="shrink-0 flex items-center justify-center w-8 h-8 narvo-border bg-primary text-background-dark hover:bg-white transition-colors"
                        aria-label={playing ? 'Pause' : 'Play'}
                        data-testid={`play-radio-${item.id}`}
                      >
                        <PlayCircle weight="fill" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : isSearchActive ? (
          <div className="narvo-border bg-surface/20 p-8 md:p-12 text-center">
            <MagnifyingGlass className="w-10 h-10 text-forest mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold text-content uppercase mb-2">No results</h3>
            <p className="mono-ui text-[11px] text-forest mb-4">Query &quot;{query}&quot; returned no matches.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => setQuery('')} className="px-4 py-2 bg-primary mono-ui text-[11px] font-bold text-background-dark hover:bg-white transition-colors">
                Clear
              </button>
              <button onClick={() => navigate('/discover')} className="px-4 py-2 narvo-border mono-ui text-[11px] font-bold text-primary hover:bg-primary hover:text-background-dark transition-colors">
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
