'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Clock, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { TruthTag } from '@/components/TruthTag';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { COPY } from '@/lib/narvo-app-copy';

const DISCOVER_DATA = [
  {
    id: '1',
    category: 'POLITICS',
    title: 'Budget approval expected by Friday as Senate reconvenes',
    source: 'Premium Times',
    time: '3 min',
    verified: true,
    confidence: 94,
    sourcesCount: 5,
  },
  {
    id: '2',
    category: 'ECONOMY',
    title: 'Naira strengthens to 1,420/$ after CBN intervention',
    source: 'BusinessDay',
    time: '2 min',
    verified: true,
    confidence: 98,
    sourcesCount: 8,
  },
  {
    id: '3',
    category: 'TECH',
    title: 'Nigeria leads Africa in fintech funding for Q4 2025',
    source: 'TechCabal',
    time: '4 min',
    verified: true,
    confidence: 91,
    sourcesCount: 3,
  },
  {
    id: '4',
    category: 'SPORTS',
    title: 'Super Eagles secure AFCON qualification with 2-0 win',
    source: 'Complete Sports',
    time: '5 min',
    verified: true,
    confidence: 99,
    sourcesCount: 12,
  },
  {
    id: '5',
    category: 'ENTERTAINMENT',
    title: 'Burna Boy announces new album release date',
    source: 'Pulse Nigeria',
    time: '2 min',
    verified: false,
    confidence: 60,
    sourcesCount: 2,
  },
];

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return DISCOVER_DATA;
    return DISCOVER_DATA.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.source.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handlePlay = (e: React.MouseEvent, item: (typeof DISCOVER_DATA)[0]) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentTrack?.id === item.id) {
      togglePlayPause();
    } else {
      playTrack({
        id: item.id,
        title: item.title,
        source: item.source,
        category: item.category,
      });
    }
  };

  return (
    <AuthenticatedAppShell
      header={{
        title: COPY.discover_page_title,
        kicker: COPY.discover_trending,
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 max-w-3xl mx-auto w-full">
        <div className="relative mb-8 sm:mb-10">
          <Search
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

        <div className="space-y-4 sm:space-y-5">
          {filteredData.length > 0 ? (
            filteredData.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Link
                  href={`/news/${item.id}`}
                  className="block p-5 sm:p-6 rounded-[28px] bg-white dark:bg-narvo-ink border border-narvo-ink/6 dark:border-white/8 hover:border-narvo-teal/25 dark:hover:border-narvo-teal/30 transition-all shadow-sm hover:shadow-md group"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-[10px] font-bold tracking-widest text-narvo-vermilion uppercase">
                          {item.category}
                        </span>
                        <span className="text-narvo-ink/20 dark:text-white/20" aria-hidden>
                          •
                        </span>
                        <span className="text-[10px] font-medium font-mono text-narvo-ink/45 dark:text-white/40 flex items-center gap-1">
                          <Clock size={10} aria-hidden /> {item.time}
                        </span>
                      </div>
                      <h3 className="font-serif font-medium text-lg sm:text-xl group-hover:text-narvo-teal transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handlePlay(e, item)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all min-h-[48px] min-w-[48px] ${
                        currentTrack?.id === item.id && isPlaying
                          ? 'bg-narvo-vermilion text-white shadow-lg shadow-narvo-vermilion/20'
                          : 'bg-narvo-mist dark:bg-white/10 text-narvo-ink dark:text-white group-hover:bg-narvo-teal group-hover:text-white'
                      }`}
                      aria-label={currentTrack?.id === item.id && isPlaying ? 'Pause' : 'Play'}
                    >
                      {currentTrack?.id === item.id && isPlaying ? (
                        <Pause size={20} fill="currentColor" aria-hidden />
                      ) : (
                        <Play size={20} fill="currentColor" className="ml-0.5" aria-hidden />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs font-medium text-narvo-ink/55 dark:text-white/50">{item.source}</p>
                    {item.verified ? (
                      <TruthTag
                        status="verified"
                        sources={[item.source]}
                        details="Verified by Narvo Intelligence"
                        lastChecked="Recently"
                      />
                    ) : null}
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16 sm:py-20 rounded-[28px] border border-dashed border-narvo-ink/12 dark:border-white/10 bg-narvo-mist/15 dark:bg-white/[0.02] px-6">
              <Search size={40} className="mx-auto mb-4 text-narvo-ink/20 dark:text-white/15" aria-hidden />
              <p className="text-narvo-ink/55 dark:text-white/45 font-medium">{COPY.search_empty}</p>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedAppShell>
  );
}
