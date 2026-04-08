'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import { StoryNewsListCard } from '@/components/StoryNewsListCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { FilterPillGroup } from '@/components/FilterPillGroup';
import { StoryCardSkeleton } from '@/components/Skeleton';
import { COPY } from '@/lib/narvo-app-copy';
import { NARVO_TOOLBAR_RAIL_CLASS } from '@/lib/narvo-ui-classes';
import {
  fetchNewsList,
  fetchTrendingTopics,
  searchUnified,
  type ApiNewsListItem,
  type ApiTrendingResponse,
} from '@/lib/narvo-api';
import {
  addMyBookmark,
  getMyBookmarks,
  hasMeAuth,
  removeMyBookmark,
} from '@/lib/me-api';
import { useToast } from '@/components/Toast';
import { useUserTableRealtime } from '@/hooks/useUserTableRealtime';
import { useNarvoAuthBridge } from '@/hooks/use-narvo-auth-bridge';
import { NARVO_ACCESS_TOKEN_CHANGED } from '@/lib/narvo-session';

type SourceTypeFilter = 'all' | 'rss' | 'aggregator' | 'podcast' | 'radio';
type SortMode = 'relevance' | 'newest' | 'oldest' | 'title';

const SOURCE_TYPE_OPTIONS: { id: SourceTypeFilter; label: string }[] = [
  { id: 'all', label: COPY.search_type_all },
  { id: 'rss', label: COPY.search_type_news },
  { id: 'aggregator', label: COPY.search_type_aggregator },
  { id: 'podcast', label: COPY.search_type_podcast },
  { id: 'radio', label: COPY.search_type_radio },
];

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'relevance', label: COPY.search_sort_relevance },
  { id: 'newest', label: COPY.search_sort_newest },
  { id: 'oldest', label: COPY.search_sort_oldest },
  { id: 'title', label: COPY.search_sort_title },
];

function sortItems(list: ApiNewsListItem[], mode: SortMode): ApiNewsListItem[] {
  const out = [...list];
  switch (mode) {
    case 'newest':
      return out.sort((a, b) => String(b.published || '').localeCompare(String(a.published || '')));
    case 'oldest':
      return out.sort((a, b) => String(a.published || '').localeCompare(String(b.published || '')));
    case 'title':
      return out.sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
      );
    case 'relevance':
    default:
      return out;
  }
}

type FilterSectionsProps = {
  sourceType: SourceTypeFilter;
  setSourceType: (v: SourceTypeFilter) => void;
  sortMode: SortMode;
  setSortMode: (v: SortMode) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  trending: ApiTrendingResponse;
  /** `mobile` = edge rail; `desktop` = stacked panels in sidebar */
  layout: 'mobile' | 'desktop';
};

function SearchFilterSections({
  sourceType,
  setSourceType,
  sortMode,
  setSortMode,
  categoryFilter,
  setCategoryFilter,
  trending,
  layout,
}: FilterSectionsProps) {
  const isDesktop = layout === 'desktop';
  const panelClass = isDesktop
    ? 'rounded-[22px] border border-narvo-ink/10 bg-[var(--bg-card)]/95 p-4 shadow-[0_8px_30px_-18px_rgba(23,50,74,0.12)] dark:border-white/10 dark:bg-narvo-ink/45 dark:shadow-black/20'
    : '';
  const labelClass = isDesktop
    ? 'mb-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-ink/50 dark:text-white/45'
    : 'mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-ink/45 dark:text-white/40';

  const topicLimit = isDesktop ? 12 : 10;

  const topicBlock =
    trending.tags.length > 0 || categoryFilter ? (
      <div className={isDesktop ? panelClass : ''}>
        <p
          className={
            isDesktop
              ? 'mb-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-teal dark:text-narvo-mint'
              : 'mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-narvo-teal dark:text-narvo-mint'
          }
        >
          {COPY.search_category_label}
        </p>
        <div
          className={
            isDesktop
              ? 'flex flex-wrap gap-2'
              : 'flex flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          }
        >
          {categoryFilter ? (
            <button
              type="button"
              onClick={() => setCategoryFilter('')}
              className="shrink-0 rounded-full border border-narvo-vermilion/40 px-3 py-1.5 text-xs font-bold text-narvo-vermilion"
            >
              {COPY.search_category_clear}
            </button>
          ) : null}
          {trending.tags.slice(0, topicLimit).map((tag) => {
            const raw = tag.replace(/^#/i, '').trim();
            const selected = categoryFilter.toLowerCase() === raw.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setCategoryFilter(raw)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  selected
                    ? 'bg-narvo-teal text-white'
                    : 'border border-narvo-ink/10 bg-narvo-mist/60 text-narvo-ink/75 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div className={isDesktop ? 'space-y-5' : 'space-y-4'}>
      <div className={isDesktop ? panelClass : ''}>
        <p className={labelClass}>{COPY.search_type_filter_label}</p>
        <FilterPillGroup
          items={SOURCE_TYPE_OPTIONS}
          value={sourceType}
          onChange={setSourceType}
          ariaLabel={COPY.search_type_filter_label}
        />
      </div>
      <div className={isDesktop ? panelClass : ''}>
        <p className={labelClass}>{COPY.search_sort_label}</p>
        <FilterPillGroup
          items={SORT_OPTIONS}
          value={sortMode}
          onChange={setSortMode}
          ariaLabel={COPY.search_sort_label}
        />
      </div>
      {topicBlock}
    </div>
  );
}

function TrendingTopicsPanel({ trending, className = '' }: { trending: ApiTrendingResponse; className?: string }) {
  if (trending.topics.length === 0) return null;
  return (
    <div
      className={`rounded-[22px] border border-narvo-ink/10 bg-narvo-cloud/90 p-5 dark:border-white/10 dark:bg-narvo-ink/35 ${className}`}
    >
      <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-ink/45 dark:text-white/40">
        {COPY.search_trending_kicker}
      </p>
      <ul className="space-y-2">
        {trending.topics.slice(0, 6).map((t) => (
          <li key={t.name} className="flex justify-between gap-3 text-sm">
            <span className="font-medium text-narvo-ink dark:text-white">{t.name}</span>
            <span className="shrink-0 font-mono text-xs text-narvo-ink/45 dark:text-white/40">
              {t.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [browseItems, setBrowseItems] = useState<ApiNewsListItem[]>([]);
  const [trending, setTrending] = useState<ApiTrendingResponse>({ tags: [], topics: [] });
  const [searchResults, setSearchResults] = useState<ApiNewsListItem[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchRetryToken, setSearchRetryToken] = useState(0);
  const [sourceType, setSourceType] = useState<SourceTypeFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [bookmarkBusyId, setBookmarkBusyId] = useState<string | null>(null);
  const searchResultsRef = useRef<ApiNewsListItem[]>([]);
  const { info: toastInfo } = useToast();
  const authBridge = useNarvoAuthBridge();

  useEffect(() => {
    searchResultsRef.current = searchResults;
  }, [searchResults]);

  const refreshBookmarks = useCallback(async () => {
    if (!hasMeAuth()) {
      setBookmarkIds(new Set());
      return;
    }
    try {
      const rows = await getMyBookmarks();
      setBookmarkIds(new Set(rows.map((r) => r.story_id)));
    } catch {
      setBookmarkIds(new Set());
    }
  }, []);

  const loadBrowse = useCallback(async () => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const [news, trend] = await Promise.all([
        fetchNewsList({ limit: 30, includeAggregators: true }),
        fetchTrendingTopics(),
      ]);
      setBrowseItems(Array.isArray(news) ? news : []);
      setTrending(trend);
    } catch (e: unknown) {
      setBrowseItems([]);
      setBrowseError(e instanceof Error ? e.message : COPY.browse_load_failed);
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrowse();
  }, [loadBrowse]);

  useEffect(() => {
    void refreshBookmarks();
  }, [refreshBookmarks]);

  useEffect(() => {
    const onAuth = () => void refreshBookmarks();
    const onTok = () => void refreshBookmarks();
    window.addEventListener('narvo-auth-changed', onAuth);
    window.addEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
    return () => {
      window.removeEventListener('narvo-auth-changed', onAuth);
      window.removeEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
    };
  }, [refreshBookmarks]);

  useUserTableRealtime('bookmarks', () => void refreshBookmarks(), hasMeAuth());

  const activeSearch = searchQuery.trim().length >= 2;

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        setSearchError(null);
        try {
          const st = sourceType === 'all' ? undefined : sourceType;
          const { results, total } = await searchUnified({
            q,
            source_type: st,
            category: categoryFilter.trim() || undefined,
            limit: 30,
            skip: 0,
          });
          setSearchResults(results);
          setSearchTotal(total);
        } catch (e: unknown) {
          setSearchResults([]);
          setSearchTotal(0);
          setSearchError(e instanceof Error ? e.message : COPY.browse_load_failed);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 380);
    return () => window.clearTimeout(handle);
  }, [searchQuery, sourceType, categoryFilter, searchRetryToken]);

  const loadMoreSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 2 || loadMoreLoading) return;
    const skip = searchResultsRef.current.length;
    if (skip >= searchTotal) return;
    setLoadMoreLoading(true);
    try {
      const st = sourceType === 'all' ? undefined : sourceType;
      const { results, total } = await searchUnified({
        q,
        source_type: st,
        category: categoryFilter.trim() || undefined,
        limit: 30,
        skip,
      });
      setSearchResults((prev) => [...prev, ...results]);
      setSearchTotal(total);
    } catch {
      /* keep existing */
    } finally {
      setLoadMoreLoading(false);
    }
  }, [searchQuery, sourceType, categoryFilter, searchTotal, loadMoreLoading]);

  const filteredBrowse = useMemo(() => {
    let list = browseItems;
    const q = searchQuery.toLowerCase().trim();
    if (q.length === 1) {
      list = list.filter((item) => {
        const title = (item.title || '').toLowerCase();
        const sum = String(item.summary || item.short_summary || '').toLowerCase();
        return title.includes(q) || sum.includes(q);
      });
    }
    if (categoryFilter.trim()) {
      const c = categoryFilter.toLowerCase();
      list = list.filter((item) => (item.category || '').toLowerCase() === c);
    }
    return sortItems(list, sortMode);
  }, [browseItems, searchQuery, categoryFilter, sortMode]);

  const sortedSearchResults = useMemo(
    () => sortItems(searchResults, sortMode),
    [searchResults, sortMode]
  );

  const handleBookmarkToggle = useCallback(
    async (item: ApiNewsListItem) => {
      if (!authBridge.hydrated) return;
      if (!authBridge.hasApiToken) {
        toastInfo(
          authBridge.hasSession ? COPY.news_bookmark_cloud_paused : COPY.news_bookmark_need_sign_in
        );
        return;
      }
      if (String(item.id).startsWith('radio:')) return;
      setBookmarkBusyId(item.id);
      try {
        if (bookmarkIds.has(item.id)) {
          await removeMyBookmark(item.id);
          setBookmarkIds((prev) => {
            const n = new Set(prev);
            n.delete(item.id);
            return n;
          });
          toastInfo(COPY.news_bookmark_removed);
        } else {
          await addMyBookmark({
            story_id: item.id,
            title: item.title?.trim() || 'Untitled',
            summary: String(item.summary || item.short_summary || ''),
            narrative: '',
            source: item.source?.trim() || '',
            category: item.category || 'General',
            source_url: item.source_url?.trim() || '',
            image_url: item.image_url?.trim() || null,
          });
          setBookmarkIds((prev) => new Set(prev).add(item.id));
          toastInfo(COPY.news_bookmark_added);
        }
      } catch {
        toastInfo(COPY.error_generic);
      } finally {
        setBookmarkBusyId(null);
      }
    },
    [authBridge.hydrated, authBridge.hasApiToken, authBridge.hasSession, bookmarkIds, toastInfo]
  );

  const canLoadMore =
    activeSearch && sortedSearchResults.length > 0 && sortedSearchResults.length < searchTotal;

  const renderResultCards = (items: ApiNewsListItem[], keyPrefix: string) => (
    <div className="space-y-4 sm:space-y-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 xl:gap-8">
      {items.map((item, index) => (
        <StoryNewsListCard
          key={`${keyPrefix}-${item.id}-${index}`}
          item={item}
          index={index}
          bookmarked={bookmarkIds.has(item.id)}
          onBookmarkToggle={handleBookmarkToggle}
          bookmarkBusy={bookmarkBusyId === item.id}
        />
      ))}
    </div>
  );

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.search_page_title,
        kicker: COPY.search_page_kicker,
      }}
    >
      <div className="mx-auto w-full max-w-3xl overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:max-w-none lg:px-8 lg:py-8 xl:px-10">
        <div className="lg:mx-auto lg:max-w-[1600px] lg:grid lg:grid-cols-[minmax(0,1fr)_min(300px,26vw)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_min(320px,24vw)] xl:gap-12">
          {/* ── Main column: mobile = full-bleed feed; desktop = magazine primary ── */}
          <div className="min-w-0 lg:order-1">
            {/* Mobile: compact hero strip + rail. Desktop: wide editorial search bar */}
            <div
              className={`relative mb-5 sm:mb-6 lg:mb-8 ${NARVO_TOOLBAR_RAIL_CLASS} lg:rounded-[28px] lg:border lg:border-narvo-ink/[0.08] lg:bg-[var(--bg-card)]/80 lg:p-6 lg:shadow-[0_12px_48px_-24px_rgba(23,50,74,0.14)] dark:lg:border-white/[0.08] dark:lg:bg-narvo-ink/30 dark:lg:shadow-black/25 xl:p-8`}
            >
              <p className="mb-3 font-serif text-lg font-semibold text-narvo-ink dark:text-white lg:mb-4 lg:text-xl xl:text-2xl">
                {COPY.search_page_kicker}
              </p>
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 lg:left-5"
                  size={20}
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder={COPY.search_placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[48px] rounded-2xl border border-narvo-ink/10 bg-white py-3 pl-11 pr-4 text-[15px] text-narvo-ink placeholder:text-narvo-ink/40 outline-none transition-shadow focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15 dark:border-white/10 dark:bg-narvo-ink/40 dark:text-white dark:placeholder:text-white/35 lg:min-h-[56px] lg:rounded-[22px] lg:pl-12 lg:text-[16px] lg:shadow-inner"
                  aria-label={COPY.search_placeholder}
                />
              </div>
            </div>

            {/* Mobile-only: horizontal filter rail (distinct from desktop tool panels) */}
            <div className="mb-6 -mx-4 border-y border-narvo-ink/[0.07] bg-gradient-to-b from-narvo-mist/70 to-narvo-cloud/90 px-4 py-4 dark:border-white/[0.08] dark:from-narvo-ink/40 dark:to-narvo-ink/25 lg:hidden">
              <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-ink/40 dark:text-white/35">
                {COPY.search_mobile_rail_hint}
              </p>
              <SearchFilterSections
                layout="mobile"
                sourceType={sourceType}
                setSourceType={setSourceType}
                sortMode={sortMode}
                setSortMode={setSortMode}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                trending={trending}
              />
            </div>

            {!activeSearch && !browseLoading && !browseError ? (
              <p className="mb-4 text-sm leading-relaxed text-narvo-ink/50 dark:text-white/45 lg:mb-6 lg:max-w-xl lg:text-base">
                {COPY.search_empty}
              </p>
            ) : null}

            {activeSearch && searchLoading && sortedSearchResults.length === 0 ? (
              <p className="py-8 text-center font-medium text-narvo-ink/45 dark:text-white/45 lg:py-12 lg:text-sm">
                {COPY.search_searching}
              </p>
            ) : null}

            {activeSearch && !searchLoading && searchQuery.trim().length >= 2 ? (
              <div className="mb-4 flex flex-col gap-1 border-b border-narvo-ink/[0.06] pb-3 dark:border-white/[0.06] sm:flex-row sm:items-baseline sm:justify-between lg:mb-6">
                <p className="font-mono text-[11px] text-narvo-ink/50 dark:text-white/45">
                  {COPY.search_results_meta.replace('{n}', String(searchTotal))}
                </p>
              </div>
            ) : null}

            <div className="min-h-[120px]">
              {browseError && !browseLoading && !activeSearch ? (
                <ErrorState message={browseError} onRetry={loadBrowse} />
              ) : activeSearch && searchError && !searchLoading ? (
                <ErrorState
                  message={searchError}
                  onRetry={() => setSearchRetryToken((t) => t + 1)}
                />
              ) : activeSearch ? (
                sortedSearchResults.length > 0 ? (
                  <>
                    {renderResultCards(sortedSearchResults, 's')}
                    {canLoadMore ? (
                      <div className="flex justify-center pt-4 lg:pt-8">
                        <button
                          type="button"
                          disabled={loadMoreLoading}
                          onClick={() => void loadMoreSearch()}
                          className="min-h-[48px] w-full max-w-sm rounded-full border border-narvo-teal/35 px-6 text-sm font-bold text-narvo-teal transition-colors hover:bg-narvo-teal/10 disabled:opacity-45 dark:text-narvo-mint lg:max-w-none lg:w-auto"
                        >
                          {loadMoreLoading ? COPY.status_loading : COPY.search_results_more}
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : !searchLoading ? (
                  <EmptyState
                    icon={SearchIcon}
                    title={COPY.search_no_matches_title}
                    description={COPY.search_no_matches_desc}
                  >
                    <Link
                      href="/discover"
                      className="inline-flex min-h-[48px] items-center rounded-full bg-narvo-vermilion px-6 font-bold text-white shadow-md shadow-narvo-vermilion/20 transition-transform active:scale-[0.96]"
                    >
                      {COPY.search_link_discover}
                    </Link>
                  </EmptyState>
                ) : null
              ) : browseLoading ? (
                <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
                  <StoryCardSkeleton />
                  <StoryCardSkeleton />
                  <StoryCardSkeleton className="lg:hidden" />
                </div>
              ) : filteredBrowse.length > 0 ? (
                <>
                  <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint lg:mb-5 lg:text-[11px]">
                    {COPY.search_browse_kicker}
                  </p>
                  {renderResultCards(filteredBrowse, 'b')}
                  {/* Mobile: trending after feed; desktop sidebar shows trending */}
                  <div className="mt-8 lg:hidden">
                    <TrendingTopicsPanel trending={trending} />
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={SearchIcon}
                  title={COPY.search_no_stories_title}
                  description={COPY.search_empty}
                />
              )}
            </div>

            {!activeSearch && searchQuery.trim().length === 1 ? (
              <p className="mt-6 text-center text-xs text-narvo-ink/45 dark:text-white/40 lg:mt-8">
                {COPY.search_min_chars}
              </p>
            ) : null}
          </div>

          {/* ── Desktop-only: sticky refinement column (distinct from mobile rail) ── */}
          <aside className="relative hidden lg:order-2 lg:block">
            <div
              className="sticky flex max-h-[min(100dvh-5.5rem,920px)] flex-col gap-6 overflow-y-auto overscroll-y-contain pb-4"
              style={{
                top: 'max(1.5rem, env(safe-area-inset-top, 0px))',
              }}
            >
              <div>
                <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-teal dark:text-narvo-mint">
                  {COPY.search_sidebar_kicker}
                </p>
                <SearchFilterSections
                  layout="desktop"
                  sourceType={sourceType}
                  setSourceType={setSourceType}
                  sortMode={sortMode}
                  setSortMode={setSortMode}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  trending={trending}
                />
              </div>
              <TrendingTopicsPanel trending={trending} />
            </div>
          </aside>
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
