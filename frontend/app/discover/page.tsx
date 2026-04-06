'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { StoryNewsListCard } from '@/components/StoryNewsListCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY } from '@/lib/narvo-app-copy';
import { fetchNewsList, type ApiNewsListItem } from '@/lib/narvo-api';

const SEARCH_RAIL =
  'rounded-2xl border border-narvo-ink/8 bg-narvo-mist/45 p-2.5 shadow-[0_10px_32px_-14px_rgba(23,50,74,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] sm:p-3';

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ApiNewsListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadList = () => {
    setLoading(true);
    void fetchNewsList({ limit: 40 })
      .then((n) => {
        setItems(Array.isArray(n) ? n : []);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        setItems([]);
        setLoadError(e instanceof Error ? e.message : COPY.browse_load_failed);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only bootstrap
  }, []);

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return items;
    return items.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const src = (item.source || '').toLowerCase();
      return title.includes(query) || cat.includes(query) || src.includes(query);
    });
  }, [searchQuery, items]);

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.discover_page_title,
        kicker: COPY.discover_trending,
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className={`relative mb-8 sm:mb-10 ${SEARCH_RAIL}`}>
          <Search
            className="pointer-events-none absolute left-5 top-1/2 z-[1] -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 sm:left-6"
            size={20}
            aria-hidden
          />
          <input
            type="search"
            placeholder={COPY.search_placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[48px] rounded-[18px] border border-narvo-ink/10 bg-white py-3.5 pl-12 pr-4 text-[15px] text-narvo-ink placeholder:text-narvo-ink/40 outline-none transition-shadow focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15 dark:border-white/10 dark:bg-narvo-ink/40 dark:text-white dark:placeholder:text-white/35 sm:min-h-[52px] sm:pl-14 sm:pr-5"
            aria-label={COPY.search_placeholder}
          />
        </div>

        <div className="space-y-4 sm:space-y-5">
          {loading ? (
            <p className="py-16 text-center font-medium text-narvo-ink/45 dark:text-white/45">
              {COPY.status_loading}
            </p>
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadList} />
          ) : filteredData.length > 0 ? (
            filteredData.map((item, index) => (
              <StoryNewsListCard key={item.id} item={item} index={index} />
            ))
          ) : (
            <EmptyState
              icon={Search}
              title={searchQuery.trim() ? COPY.discover_no_matches_title : COPY.search_empty}
              description={
                searchQuery.trim() ? COPY.discover_no_matches_desc : COPY.discover_trending
              }
            />
          )}
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
