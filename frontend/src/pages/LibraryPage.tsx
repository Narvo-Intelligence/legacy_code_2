import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { WifiSlash } from '@phosphor-icons/react/WifiSlash';
import { Play } from '@phosphor-icons/react/Play';
import { Pause } from '@phosphor-icons/react/Pause';
import { Trash } from '@phosphor-icons/react/Trash';
import { ArrowUpRight } from '@phosphor-icons/react/ArrowUpRight';
import { Article } from '@phosphor-icons/react/Article';
import { Waves } from '@phosphor-icons/react/Waves';
import { ArrowCounterClockwise } from '@phosphor-icons/react/ArrowCounterClockwise';
import { useAuth } from '../contexts/AuthContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useAudio } from '../contexts/AudioContext';
import { getAllCachedAudio, getCachedAudio, removeCachedAudio, getCacheStats, clearAllCache } from '../lib/audioCache';
import type { CacheStats } from '../lib/audioCache';
import * as api from '../lib/api';
import logger from '../lib/logger';
import Skeleton from '../components/Skeleton';
import type { Story } from '../types/story';

interface OfflineListItem {
  id: string;
  title: string;
  metadata: string;
  type: 'audio' | 'article';
  hasBlob?: boolean;
  narrative?: string;
  summary?: string;
}

interface SavedArticleApi {
  story_id: string;
  title?: string;
  source?: string;
  category?: string;
  narrative?: string;
  summary?: string;
}

const LibraryPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bookmarks, loading: bookmarksLoading, removeBookmark } = useBookmarks();
  const { playTrack, currentTrack, isPlaying, togglePlay } = useAudio();

  const [offlineItems, setOfflineItems] = useState<OfflineListItem[]>([]);
  const [savedArticles, setSavedArticles] = useState<OfflineListItem[]>([]);
  const [digestStories, setDigestStories] = useState<Story[]>([]);
  const [offlineLoading, setOfflineLoading] = useState(true);
  const [cacheStats, setCacheStats] = useState<CacheStats>({ totalItems: 0, offlineReady: 0, totalSize: 0, formattedSize: '0 KB' });

  const offlineUserId = user?.id ?? 'guest';
  const loadOffline = useCallback(async () => {
    setOfflineLoading(true);
    try {
      const articlesUrl = `api/offline/articles${offlineUserId ? `?user_id=${encodeURIComponent(offlineUserId)}` : ''}`;
      const [cached, articlesRes, stats, digest] = await Promise.all([
        getAllCachedAudio(),
        api.get(articlesUrl).then(r => r.ok ? r.json() : []),
        getCacheStats(),
        (api as { getCachedDigest?: () => Promise<unknown> }).getCachedDigest ? (api as { getCachedDigest: () => Promise<unknown> }).getCachedDigest() : Promise.resolve(null),
      ]);
      if (Array.isArray(digest)) setDigestStories(digest as Story[]);
      else setDigestStories([]);
      setCacheStats(stats);
      setOfflineItems(cached.map(item => ({
        id: item.id,
        title: item.title || `Audio_${(item.id || '').slice(0, 8)}`,
        metadata: item.source || 'CACHED',
        type: 'audio' as const,
        hasBlob: item.hasBlob,
      })));
      setSavedArticles(((articlesRes as SavedArticleApi[]) || []).map(a => ({
        id: a.story_id,
        title: a.title || `Article_${(a.story_id || '').slice(0, 8)}`,
        metadata: `${a.source || 'SAVED'} · ${a.category || 'GENERAL'}`,
        type: 'article' as const,
        narrative: a.narrative,
        summary: a.summary,
      })));
    } catch (e) {
      console.error('Library offline load:', e);
    }
    setOfflineLoading(false);
  }, [offlineUserId]);

  useEffect(() => { loadOffline(); }, [loadOffline]);

  const handleRemoveOffline = async (id: string, type: string) => {
    if (type === 'article') {
      try {
        const url = `api/offline/articles/${id}${offlineUserId ? `?user_id=${encodeURIComponent(offlineUserId)}` : ''}`;
        await api.del(url);
      } catch (e) { console.error(e); }
    } else {
      await removeCachedAudio(id);
    }
    await loadOffline();
  };

  const handleClearOffline = async () => {
    await clearAllCache();
    try {
      const url = `api/offline/articles${offlineUserId ? `?user_id=${encodeURIComponent(offlineUserId)}` : ''}`;
      await api.del(url);
    } catch (err) {
      logger.debug('[LibraryPage] Failed to clear offline articles', err);
    }
    await loadOffline();
  };

  const handlePlayOffline = async (item: OfflineListItem) => {
    if (currentTrack?.id === item.id && isPlaying) {
      togglePlay();
      return;
    }
    if (item.type === 'article') {
      playTrack({ id: item.id, title: item.title, summary: item.narrative || item.summary || item.title }, true);
      return;
    }
    const cached = await getCachedAudio(item.id);
    if (cached?.audio_url) {
      playTrack({ id: item.id, title: item.title, url: cached.audio_url, source: item.metadata }, true);
    }
  };

  const formatSavedAt = (date: string | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 3600000) return 'Just now';
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const allOffline = [...offlineItems, ...savedArticles];

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll min-h-0" data-testid="library-page">
      <div className="p-4 md:p-8 pb-32 md:pb-10 max-w-4xl mx-auto">
        <header className="mb-6 md:mb-8 narvo-border-b pb-4">
          <h1 className="font-display text-xl md:text-2xl font-bold uppercase tracking-tight text-content">
            {t('library_page.title')}
          </h1>
          <p className="mono-ui text-[11px] md:text-[12px] text-forest mt-1">{t('library_page.subtitle')}</p>
        </header>

        {/* Section: Saved (bookmarks) */}
        <section className="mb-8 md:mb-10" aria-labelledby="saved-heading">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 id="saved-heading" className="font-display text-base md:text-lg font-bold uppercase text-content flex items-center gap-2">
              <BookmarkSimple className="w-4 h-4 text-primary" weight="fill" />
              {t('library_page.saved')}
            </h2>
            <span className="mono-ui text-[10px] md:text-[11px] text-forest">{t('library_page.items_count', { count: bookmarks.length })}</span>
          </div>
          <div className="narvo-border bg-surface/10">
            {bookmarksLoading ? (
              <div className="p-4 md:p-6 divide-y divide-forest/10">
                {[1, 2, 3].map(i => (
                  <div key={i} className="py-4 flex gap-3"><Skeleton className="flex-1 h-5" /><Skeleton className="w-16 h-4" /></div>
                ))}
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="p-6 md:p-8 text-center">
                <BookmarkSimple className="w-10 h-10 text-forest/50 mx-auto mb-2" />
                <p className="mono-ui text-[11px] md:text-[12px] text-forest mb-4">{t('library_page.empty_saved')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="min-h-[48px] px-4 py-2 bg-primary text-background-dark mono-ui text-[11px] font-bold hover:bg-white transition-colors"
                  data-testid="library-go-feed"
                >
                  {t('library_page.go_to_feed')}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-forest/10">
                {bookmarks.map((item) => (
                  <li key={item.story_id}>
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex items-center gap-2 md:gap-3 p-3 md:p-4 min-h-[48px] hover:bg-surface/20 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/news/${item.story_id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/news/${item.story_id}`); } }}
                      aria-label={`Open ${item.title}`}
                      data-testid={`saved-${item.story_id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm md:text-base font-bold text-content group-hover:text-primary transition-colors truncate">{item.title}</p>
                        <p className="mono-ui text-[10px] md:text-[11px] text-forest truncate">{item.source || item.category} · {formatSavedAt(item.saved_at)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); playTrack({ id: item.story_id, title: item.title, summary: item.summary, source: item.source }, true); }}
                        className="min-w-[48px] min-h-[48px] flex items-center justify-center text-forest hover:text-primary shrink-0"
                        aria-label="Play"
                      >
                        {currentTrack?.id === item.story_id && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeBookmark(item.story_id); }}
                        className="min-w-[48px] min-h-[48px] flex items-center justify-center text-forest hover:text-primary shrink-0"
                        aria-label="Remove"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                      <ArrowUpRight className="w-4 h-4 text-forest/50 group-hover:text-primary shrink-0" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Section: Daily Digest (cached by SW when offline) */}
        {digestStories.length > 0 && (
          <section className="mb-8 md:mb-10" aria-labelledby="digest-heading">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 id="digest-heading" className="font-display text-base md:text-lg font-bold uppercase text-content flex items-center gap-2">
                <Article className="w-4 h-4 text-primary" weight="fill" />
                {t('library_page.daily_digest', 'Daily Digest (offline)')}
              </h2>
              <span className="mono-ui text-[10px] md:text-[11px] text-forest">{digestStories.length}</span>
            </div>
            <div className="narvo-border bg-surface/10">
              <ul className="divide-y divide-forest/10">
                {digestStories.map((item) => (
                  <li key={item.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex items-center gap-2 md:gap-3 p-3 md:p-4 min-h-[48px] hover:bg-surface/20 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/news/${item.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/news/${item.id}`); } }}
                      aria-label={`Open ${item.title}`}
                      data-testid={`digest-${item.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-sm md:text-base font-bold text-content group-hover:text-primary transition-colors truncate">{item.title}</p>
                        <p className="mono-ui text-[10px] md:text-[11px] text-forest truncate">{item.source || item.category || ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); playTrack({ id: item.id, title: item.title, summary: item.summary, source: item.source }, true); }}
                        className="min-w-[48px] min-h-[48px] flex items-center justify-center text-forest hover:text-primary shrink-0"
                        aria-label="Play"
                      >
                        {currentTrack?.id === item.id && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <ArrowUpRight className="w-4 h-4 text-forest/50 group-hover:text-primary shrink-0" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Section: Offline */}
        <section aria-labelledby="offline-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 md:mb-4">
            <h2 id="offline-heading" className="font-display text-base md:text-lg font-bold uppercase text-content flex items-center gap-2">
              <WifiSlash className="w-4 h-4 text-primary" />
              {t('library_page.offline')}
            </h2>
            <div className="flex items-center gap-3 mono-ui text-[10px] md:text-[11px] text-forest">
              <span>{cacheStats.formattedSize}</span>
              {allOffline.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearOffline}
                  className="text-forest hover:text-primary transition-colors"
                  data-testid="library-clear-offline"
                >
                  {t('library_page.clear_all')}
                </button>
              )}
            </div>
          </div>
          <div className="narvo-border bg-surface/10">
            {offlineLoading ? (
              <div className="p-4 md:p-6 divide-y divide-forest/10">
                {[1, 2].map(i => (
                  <div key={i} className="py-4 flex gap-3"><Skeleton className="flex-1 h-5" /><Skeleton className="w-12 h-4" /></div>
                ))}
              </div>
            ) : allOffline.length === 0 ? (
              <div className="p-6 md:p-8 text-center">
                <WifiSlash className="w-10 h-10 text-forest/50 mx-auto mb-2" />
                <p className="mono-ui text-[11px] md:text-[12px] text-forest mb-4">{t('library_page.empty_offline')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="min-h-[48px] px-4 py-2 bg-primary text-background-dark mono-ui text-[11px] font-bold hover:bg-white transition-colors"
                  data-testid="library-go-online"
                >
                  <ArrowCounterClockwise className="w-4 h-4 inline mr-1" /> {t('library_page.go_to_feed_offline')}
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-forest/10">
                {allOffline.map((item) => {
                  const isActive = currentTrack?.id === item.id && isPlaying;
                  return (
                    <li key={item.id}>
                      <div
                        className={`flex items-center gap-2 md:gap-3 p-3 md:p-4 min-h-[48px] transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-surface/20'}`}
                        data-testid={`offline-${item.id}`}
                      >
                        <span className="text-primary shrink-0">
                          {item.type === 'article' ? <Article className="w-4 h-4" /> : <Waves className="w-4 h-4" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`mono-ui text-[12px] md:text-[13px] font-bold truncate ${isActive ? 'text-primary' : 'text-content'}`}>{item.title}</p>
                          <p className="mono-ui text-[10px] md:text-[11px] text-forest truncate">{item.metadata}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePlayOffline(item)}
                          className="min-w-[48px] min-h-[48px] flex items-center justify-center text-forest hover:text-primary shrink-0"
                          aria-label={isActive ? 'Pause' : 'Play'}
                        >
                          {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOffline(item.id, item.type)}
                          className="min-w-[48px] min-h-[48px] flex items-center justify-center text-forest hover:text-primary shrink-0"
                          aria-label="Remove"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default LibraryPage;
