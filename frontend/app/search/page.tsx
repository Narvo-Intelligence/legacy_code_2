'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { StoryNewsListCard } from '@/components/StoryNewsListCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY } from '@/lib/narvo-app-copy';
import { NARVO_TOOLBAR_RAIL_CLASS } from '@/lib/narvo-ui-classes';
import { fetchNewsList, type ApiNewsListItem } from '@/lib/narvo-api';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ApiNewsListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadList = () => {
    setLoading(true);
    void fetchNewsList({ limit: 60 })
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
  }, []);

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return items;
    return items.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const sum = String(item.summary || item.short_summary || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const src = (item.source || '').toLowerCase();
      return (
        title.includes(query) || sum.includes(query) || cat.includes(query) || src.includes(query)
      );
    });
  }, [searchQuery, items]);

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.search_page_title,
        kicker: COPY.search_page_kicker,
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className={`relative mb-8 sm:mb-10 ${NARVO_TOOLBAR_RAIL_CLASS}`}>
          <SearchIcon
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

        {!searchQuery.trim() && !loading && !loadError && items.length > 0 ? (
          <p className="mb-6 text-sm text-narvo-ink/50 dark:text-white/45">{COPY.search_empty}</p>
        ) : null}

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
          ) : items.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title={COPY.search_no_stories_title}
              description={COPY.search_empty}
            />
          ) : (
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
          )}
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
