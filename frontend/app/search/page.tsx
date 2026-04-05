'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { StoryNewsListCard } from '@/components/StoryNewsListCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY } from '@/lib/narvo-app-copy';
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
        setLoadError(e instanceof Error ? e.message : 'Could not load stories.');
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
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 max-w-3xl mx-auto w-full">
        <div className="relative mb-8 sm:mb-10">
          <SearchIcon
            className="absolute left-4 top-1/2 -translate-y-1/2 text-narvo-ink/35 dark:text-white/35 pointer-events-none"
            size={20}
            aria-hidden
          />
          <input
            type="search"
            placeholder={COPY.search_placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[52px] rounded-[22px] border border-narvo-ink/10 dark:border-white/10 bg-white dark:bg-white/[0.06] py-3.5 pl-12 pr-4 text-[15px] text-narvo-ink dark:text-white placeholder:text-narvo-ink/40 dark:placeholder:text-white/35 outline-none focus:border-narvo-teal/40 focus:ring-2 focus:ring-narvo-teal/15 transition-shadow"
            aria-label={COPY.search_placeholder}
          />
        </div>

        {!searchQuery.trim() && !loading && !loadError && items.length > 0 ? (
          <p className="text-sm text-narvo-ink/50 dark:text-white/45 mb-6">{COPY.search_empty}</p>
        ) : null}

        <div className="space-y-4 sm:space-y-5">
          {loading ? (
            <p className="text-center py-16 text-narvo-ink/45 dark:text-white/45 font-medium">Loading stories…</p>
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadList} />
          ) : filteredData.length > 0 ? (
            filteredData.map((item, index) => (
              <StoryNewsListCard key={item.id} item={item} index={index} />
            ))
          ) : items.length === 0 ? (
            <EmptyState icon={SearchIcon} title="No stories loaded" description={COPY.search_empty} />
          ) : (
            <EmptyState
              icon={SearchIcon}
              title="No matches"
              description="Try a different keyword, source, or category."
            >
              <Link
                href="/discover"
                className="inline-flex min-h-[48px] items-center rounded-full bg-narvo-vermilion px-6 font-bold text-white shadow-md shadow-narvo-vermilion/20"
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
