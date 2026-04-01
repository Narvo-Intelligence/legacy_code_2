import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Play } from '@phosphor-icons/react/Play';
import { Pause } from '@phosphor-icons/react/Pause';
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { ArrowSquareOut } from '@phosphor-icons/react/ArrowSquareOut';
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { Lightbulb } from '@phosphor-icons/react/Lightbulb';
import { ShareNetwork } from '@phosphor-icons/react/ShareNetwork';
import { Clock } from '@phosphor-icons/react/Clock';
import { Eye } from '@phosphor-icons/react/Eye';
import { Link as LinkIcon } from '@phosphor-icons/react/Link';
import { Queue } from '@phosphor-icons/react/Queue';

import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useHapticAlert, type AlertPresetConfig } from '../components/HapticAlerts';
import { ArticleSkeleton } from '../components/Skeleton';
import TruthTag from '../components/TruthTag';
import { TagPill } from '../components/HashtagText';
import SourceTimeline from '../components/SourceTimeline';
import CertaintyMeter from '../components/CertaintyMeter';
import { useObservedAudioPrefetch, prefetchAndCacheStory } from '../hooks/useAudioPrefetch';
import { downloadAndCacheAudio } from '../lib/audioCache';
import * as api from '../lib/api';
import ResponsiveImage from '../components/ResponsiveImage';
import { HERO_SIZES } from '../lib/responsiveImageUtils';
import logger from '../lib/logger';
import { asArray, isStory } from '../lib/validators';
import type { Story } from '../types/story';

interface NewsDetailStory extends Story {
  key_takeaways?: string[];
  source_url?: string;
  region?: string;
}



const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const stateStory = (location.state as { story?: Story })?.story;
  const [news, setNews] = useState<NewsDetailStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedNews, setRelatedNews] = useState<Story[]>([]);
  const [readTime, setReadTime] = useState(0);
  const { playTrack, forcePlayTrack, addToQueue, currentTrack, isPlaying, currentTime, duration, voiceModel, broadcastLanguage } = useAudio();
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { showAlert } = useHapticAlert();
  const { t } = useTranslation();
  const hasAutoPlayed = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const scrollSectionRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(true);
  
  // Calm Reading State
  const [isReading, setIsReading] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const mainPlayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Scroll observer for Calm Mode and Mini Player
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollSectionRef.current) return;
      const scrollPos = scrollSectionRef.current.scrollTop;
      
      // Enter "Reading Mode" after scrolling down a bit
      setIsReading(scrollPos > 300);

      // Show mini player if the main one is scrolled away
      if (mainPlayerRef.current) {
        const rect = mainPlayerRef.current.getBoundingClientRect();
        setShowMiniPlayer(rect.top < 0);
      }
    };

    const scrollEl = scrollSectionRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => scrollEl?.removeEventListener('scroll', handleScroll);
  }, []);

  // Optimistic UI: show story from router state immediately when id matches (zero layout shift)
  useEffect(() => {
    if (stateStory && stateStory.id === id) {
      setNews(stateStory as NewsDetailStory);
      setLoading(false);
      setError(null);
    } else {
      setNews(null);
      setLoading(true);
    }
  }, [id, stateStory]);

  // Core fetch — used by initial load, tab-focus re-validation, and background refresh
  const fetchDetail = useCallback(() => {
    const params = new URLSearchParams();
    if (user?.id) params.set('user_id', user.id);
    if (broadcastLanguage) params.set('language', broadcastLanguage);
    const qs = params.toString();
    const detailUrl = qs ? `api/news/${id}?${qs}` : `api/news/${id}`;
    const detailPromise = api.get(detailUrl).then(async (r) => {
      if (!r.ok) return null;
      const json = await r.json();
      return isStory(json) ? (json as NewsDetailStory) : null;
    }) as Promise<NewsDetailStory | null>;
    const relatedPromise = api.get(`api/news/${id}/related`).then(async (r) => {
      const json = r.ok ? await r.json() : [];
      return asArray<Story>(json, isStory);
    }).catch(() => []) as Promise<Story[]>;

    Promise.all([detailPromise, relatedPromise]).then(([newsData, related]) => {
      if (!mountedRef.current) return;
      if (!newsData) {
        setError('not_found');
        setLoading(false);
        return;
      }
      setNews(newsData);
      setRelatedNews(Array.isArray(related) ? related.slice(0, 5) : []);

      const text = (newsData.narrative || newsData.summary || '');
      const wordCount = text.split(/\s+/).length;
      setReadTime(Math.max(1, Math.ceil(wordCount / 200)));

      setLoading(false);
    }).catch(() => {
      if (!mountedRef.current) return;
      setError('not_found');
      setLoading(false);
    });
  }, [id, user?.id, broadcastLanguage]);

  // Initial load
  useEffect(() => {
    setError(null);
    hasAutoPlayed.current = false;
    fetchDetail();
  }, [fetchDetail]);

  // Background refresh
  useEffect(() => {
    const REFRESH_INTERVAL_MS = 2 * 60 * 1000;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const silentRefresh = () => {
      if (document.visibilityState === 'hidden') return;
      fetchDetail();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') silentRefresh();
    };

    intervalId = setInterval(silentRefresh, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchDetail]);

  const [autoplayReady, setAutoplayReady] = useState(false);
  const pregenAudioUrl = useRef<string | null>(null);

  // Use pre-generated audio when available (audio_by_lang), else generate TTS and cache for instant play
  useEffect(() => {
    if (!news || loading) return;
    const lang = broadcastLanguage || 'en';
    const audioByLang = news.audio_by_lang;
    const preGeneratedUrl = audioByLang?.[lang];

    if (preGeneratedUrl) {
      pregenAudioUrl.current = preGeneratedUrl;
      downloadAndCacheAudio(news.id, preGeneratedUrl, { title: news.title ?? '', source: news.source ?? '' }).catch((err) => {
        logger.debug('[NewsDetailPage] Failed to cache pre-generated audio', err);
      });
      setAutoplayReady(true);
      return;
    }

    const text = news.narrative || news.summary || news.title || '';
    if (!text) {
      setAutoplayReady(true);
      return;
    }

    const vid = voiceModel || 'emma';
    const prependVerification = Array.isArray((news as Story).original_sources) && (news as Story).original_sources!.length > 1;
    api.post('api/tts/generate', {
      text,
      voice_id: vid,
      language: lang,
      prepend_verification: prependVerification,
      story_id: news.id,
    })
      .then(r => (r.ok ? r.json() : null) as Promise<{ audio_url?: string; translated_text?: string } | null>)
      .then(async (data) => {
        if (data?.audio_url) {
          pregenAudioUrl.current = data.audio_url;
          await downloadAndCacheAudio(news.id, data.audio_url, {
            title: news.title ?? '',
            source: news.source ?? '',
          }).catch((err) => {
            logger.debug('[NewsDetailPage] Failed to cache generated audio', err);
          });
        }
        if (data?.translated_text && lang !== 'en' && data.translated_text !== text) {
          setNews(prev => prev ? { ...prev, narrative: data.translated_text! } : prev);
        }
        setAutoplayReady(true);
      })
      .catch((err) => {
        logger.debug('[NewsDetailPage] Failed to generate TTS audio', err);
        setAutoplayReady(true);
      });
  }, [news, loading, voiceModel, broadcastLanguage]);

  // Prefetch TTS for recommended/related news
  const setRelatedRef = useObservedAudioPrefetch(relatedNews, {
    voiceId: voiceModel,
    language: broadcastLanguage,
    limit: 8,
    rootMargin: '300px',
  });

  // Auto-play once TTS is pre-cached
  useEffect(() => {
    if (autoplayReady && news && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      const trackToPlay = pregenAudioUrl.current
        ? { ...news, url: pregenAudioUrl.current }
        : news;
      forcePlayTrack(trackToPlay);
    }
  }, [autoplayReady, news, forcePlayTrack]);

  const toggleBookmark = () => {
    if (!news) return;
    if (isBookmarked(news.id)) {
      removeBookmark(news.id);
      showAlert('BOOKMARK_REMOVED');
    } else {
      addBookmark(news);
      prefetchAndCacheStory(news, voiceModel, broadcastLanguage).catch((err) => {
        logger.debug('[NewsDetailPage] Failed to prefetch bookmarked audio', err);
      });
      showAlert('BOOKMARK_ADDED');
    }
  };

  const shareStory = async () => {
    if (!news) return;
    const shareUrl = `${api.API_BASE}/api/share/${news.id}`;
    const shareText = `${news.title} - Listen on NARVO`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: news.title,
          text: shareText,
          url: shareUrl,
        });
        showAlert({
          type: 'success',
          title: 'SHARED_SUCCESS',
          message: 'Story shared successfully.',
          code: 'SHARE_OK',
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          showAlert({
            type: 'sync',
            title: 'LINK_COPIED',
            message: 'Story link copied to clipboard.',
            code: 'CLIP_OK',
          });
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showAlert({
        type: 'sync',
        title: 'LINK_COPIED',
        message: 'Story link copied to clipboard.',
        code: 'CLIP_OK',
      });
    }
  };

  const formatPublishedDate = (dateStr?: string): string => {
    if (!dateStr) return 'Today';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffHours < 48) return 'Yesterday';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (err) {
      logger.debug('[NewsDetailPage] Failed to format published date', err);
      return dateStr;
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <section className="flex-1 overflow-y-auto bg-narvo-cloud custom-scroll flex flex-col items-center justify-center px-4 py-12" data-testid="news-detail-error">
          <p className="mono-ui text-[14px] text-narvo-teal uppercase tracking-widest mb-2">{t('news_detail.story_unavailable')}</p>
          <p className="text-narvo-ink font-display text-lg mb-6 text-center max-w-md">{t('news_detail.story_unavailable_message')}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="border-narvo-ink/20 border px-6 py-3 mono-ui text-[12px] font-bold text-narvo-teal hover:bg-narvo-teal hover:text-narvo-cloud transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-narvo-teal focus-visible:outline-offset-2 rounded-full"
            data-testid="back-to-feed-btn"
          >
            {t('news_detail.back_to_feed')}
          </button>
        </section>
      </div>
    );
  }

  if (loading || !news) {
    return (
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <section className="flex-1 overflow-y-auto overflow-x-hidden bg-narvo-cloud custom-scroll" data-testid="news-detail-loading">
          <div className="max-w-3xl mx-auto py-8 md:py-12 px-4 md:px-8">
            <ArticleSkeleton />
          </div>
        </section>
        <aside className="w-80 hidden xl:flex flex-col border-l border-narvo-ink/10 bg-narvo-cloud shrink-0">
          <div className="h-20 border-b border-narvo-ink/10 bg-narvo-mist/30" />
          <div className="p-6 space-y-6">
            <div className="bg-narvo-mist/50 p-4 space-y-3 rounded-2xl">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-narvo-teal/10 animate-pulse rounded" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    );
  }

  // Detailed narrative for body (and TTS); distinct from short_summary used in lead
  const narrativeParagraphs = (news.narrative || '').split('\n').filter(p => p.trim());
  const hasDetailedBody = narrativeParagraphs.length > 0;
  const isCurrentlyPlaying = currentTrack?.id === news.id && isPlaying;

  // Karaoke: map playback time to paragraph index (proportional by character count)
  const isThisTrack = currentTrack?.id === news.id;
  const totalChars = narrativeParagraphs.reduce((acc, p) => acc + p.length, 0);
  const paragraphRanges = totalChars > 0 && duration > 0 && isThisTrack
    ? (() => {
        let t = 0;
        return narrativeParagraphs.map((p) => {
          const start = t;
          t += (p.length / totalChars) * duration;
          return { start, end: t };
        });
      })()
    : null;
  const rawActive = paragraphRanges && Number.isFinite(currentTime)
    ? paragraphRanges.findIndex((r) => currentTime >= r.start && currentTime < r.end)
    : -1;
  const karaokeActiveIndex = rawActive >= 0 ? rawActive : (paragraphRanges && narrativeParagraphs.length > 0 && currentTime >= (paragraphRanges[paragraphRanges.length - 1]?.start ?? 0) ? narrativeParagraphs.length - 1 : -1);

  // Swipe logic
  const SWIPE_THRESHOLD = 60;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || relatedNews.length === 0) return;
    const end = e.changedTouches[0];
    const deltaX = end.clientX - start.x;
    const deltaY = end.clientY - start.y;
    if (deltaX < -SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
      const next = relatedNews[0];
      navigate(`/news/${next.id}`, { state: { story: next } });
    }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-narvo-cloud" data-testid="news-detail-page">
      <Helmet>
        <title>{news.title != null ? `${String(news.title)} — NARVO` : 'NARVO'}</title>
        <meta property="og:title" content={news.title != null ? String(news.title) : 'NARVO'} />
        <meta property="og:description" content={news.narrative?.slice(0, 160) || 'Listen on Narvo — Audio-first news for Africa'} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/news/${id}`} />
        <meta property="og:image" content={`${api.API_BASE}/api/og/${id}`} />
        <meta property="og:image:alt" content={news.title != null ? `${String(news.title)} — Narvo` : 'Narvo — Audio-first news for Africa'} />
        <meta property="og:site_name" content="NARVO" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={news.title != null ? String(news.title) : 'NARVO'} />
        <meta name="twitter:description" content={news.narrative?.slice(0, 160) || 'Audio-first news for Africa'} />
        <meta name="twitter:image" content={`${api.API_BASE}/api/og/${id}`} />
        <meta name="twitter:image:alt" content={news.title != null ? `${String(news.title)} — Narvo` : 'Narvo — Audio-first news for Africa'} />
      </Helmet>

      {/* ── Main scroll column ── */}
      <section
        ref={scrollSectionRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-narvo-cloud custom-scroll min-w-0 pb-safe relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating Mini Player (Sticky on scroll) */}
        <div 
          className={`fixed top-4 right-4 z-50 transition-all duration-500 transform ${showMiniPlayer ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-12 opacity-0 scale-95 pointer-events-none'}`}
        >
          <div className="bg-narvo-surface/90 backdrop-blur-md border border-narvo-teal/20 rounded-full shadow-narvo-3 p-1.5 flex items-center gap-2 pr-6">
            <button
              onClick={() => playTrack(news)}
              className="w-10 h-10 rounded-full bg-narvo-teal text-narvo-cloud flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isCurrentlyPlaying ? <Pause weight="fill" className="w-4 h-4" /> : <Play weight="fill" className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex flex-col">
              <span className="mono-ui text-[8px] text-narvo-teal/60 font-bold leading-none mb-0.5">NOW_PLAYING</span>
              <span className="text-xs font-display font-bold text-narvo-ink truncate max-w-[120px]">{news.title}</span>
            </div>
          </div>
        </div>

        {/* Hero — full-width image with gradient overlay */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[11/5] max-h-[520px] overflow-hidden">
          <ResponsiveImage
            src={news.image_url || '/narvo-icon-512.png'}
            alt={news.title ?? 'Story'}
            className="w-full h-full object-cover"
            sizes={HERO_SIZES}
            loading="eager"
            decoding="async"
            width={1400}
            height={420}
          />
          {/* Light-to-transparent gradient for light theme */}
          <div className="absolute inset-0 bg-gradient-to-t from-narvo-cloud via-narvo-cloud/20 to-transparent" />

          {/* Back button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-narvo-surface/80 backdrop-blur-sm border border-narvo-teal/10 rounded-full mono-ui text-[11px] text-narvo-teal hover:bg-narvo-teal hover:text-narvo-cloud transition-all"
            data-testid="back-btn"
          >
            <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
            {t('news_detail.back_to_feed')}
          </button>

          {/* Category + TruthTag pinned top-right */}
          <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap justify-end">
            <span className="px-3 py-1 bg-narvo-teal text-narvo-cloud rounded-full mono-ui text-[10px] font-bold uppercase tracking-wider">
              {news.category || 'General'}
            </span>
            <TruthTag storyId={news.id} />
          </div>

          {/* Headline over image bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-6 pt-12">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="mono-ui text-[11px] text-narvo-teal flex items-center gap-1.5 px-2 py-0.5 bg-narvo-teal/10 rounded-sm">
                <Clock weight="bold" className="w-3 h-3" />
                {readTime} MIN
              </span>
              <span className="mono-ui text-[11px] text-narvo-teal flex items-center gap-1.5 px-2 py-0.5 bg-narvo-teal/10 rounded-sm">
                <Eye weight="bold" className="w-3 h-3" />
                {formatPublishedDate(news.published)}
              </span>
              {typeof (news as Story).certainty_score === 'number' && (
                <div className="w-24">
                  <CertaintyMeter score={(news as Story).certainty_score!} />
                </div>
              )}
            </div>
            <h1
              className="font-bold text-narvo-ink leading-[1.05] tracking-tight font-display uppercase break-words"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2.75rem)' }}
              data-testid="news-title"
            >
              {news.title}
            </h1>
          </div>
        </div>

        {/* ── Article body ── */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 pb-40">

          {/* Lead — short_summary */}
          <p className="mt-8 text-narvo-teal/80 font-medium leading-[1.7] font-display border-l-4 border-narvo-teal/40 pl-6 text-lg md:text-xl break-words italic">
            {news.short_summary || news.summary}
          </p>

          {/* ── Main Audio Control Bar ── */}
          <div 
            ref={mainPlayerRef}
            className="mt-8 bg-narvo-surface border border-narvo-teal/10 p-5 flex items-center gap-5 rounded-2xl shadow-narvo-2" 
            data-testid="audio-bar"
          >
            <button
              onClick={() => playTrack(news)}
              className={`w-14 h-14 shrink-0 flex items-center justify-center rounded-full shadow-lg transition-all transform active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-narvo-teal/20 ${isCurrentlyPlaying ? 'bg-narvo-ink text-narvo-cloud' : 'bg-narvo-teal hover:bg-narvo-ink text-narvo-cloud'} ${!autoplayReady && !isCurrentlyPlaying ? 'animate-pulse opacity-80' : ''}`}
              data-testid="play-story-btn"
              aria-label={isCurrentlyPlaying ? t('news_detail.pause') : !autoplayReady ? t('news_detail.synthesizing') : t('news_detail.play')}
            >
              {!autoplayReady && !isCurrentlyPlaying ? (
                <span className="w-6 h-6 border-3 border-narvo-cloud border-t-transparent rounded-full animate-spin" aria-hidden />
              ) : isCurrentlyPlaying ? (
                <Pause weight="fill" className="w-6 h-6" />
              ) : (
                <Play weight="fill" className="w-6 h-6 ml-1" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className="mono-ui text-[10px] text-narvo-teal/60 font-bold uppercase tracking-widest mb-1">
                {!autoplayReady && !isCurrentlyPlaying
                  ? t('news_detail.synthesizing_broadcast')
                  : isCurrentlyPlaying
                    ? t('news_detail.now_playing')
                    : t('news_detail.narrative_audio')}
              </p>
              <p className="text-base font-display font-bold text-narvo-ink uppercase tracking-wide truncate" data-testid="tts-voice-label">
                {(voiceModel || 'emma').toUpperCase()} — {broadcastLanguage?.toUpperCase() || 'EN'}
              </p>
              <div className="mt-2 h-1.5 bg-narvo-teal/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-narvo-teal transition-all duration-300 relative"
                  style={{ width: `${isCurrentlyPlaying && duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-narvo-teal rounded-full shadow-sm" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { addToQueue(news); showAlert({ type: 'sync', title: 'QUEUE_UPDATED', message: 'Added to queue', code: 'Q_ADD', duration: 1800 } as AlertPresetConfig); }}
                className="w-10 h-10 rounded-full border border-narvo-teal/10 flex items-center justify-center text-narvo-teal/60 hover:text-narvo-teal hover:bg-narvo-teal/5 transition-all"
                title="Add to queue"
                data-testid="queue-btn"
              >
                <Queue weight="bold" className="w-4 h-4" />
              </button>
              <button
                onClick={shareStory}
                className="w-10 h-10 rounded-full border border-narvo-teal/10 flex items-center justify-center text-narvo-teal/60 hover:text-narvo-teal hover:bg-narvo-teal/5 transition-all"
                title="Share"
                data-testid="share-story-btn"
              >
                <ShareNetwork weight="bold" className="w-4 h-4" />
              </button>
              <button
                onClick={toggleBookmark}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${isBookmarked(news.id) ? 'bg-narvo-teal text-narvo-cloud border-narvo-teal' : 'text-narvo-teal/60 border-narvo-teal/10 hover:bg-narvo-teal/5'}`}
                data-testid="bookmark-detail-btn"
              >
                <BookmarkSimple weight={isBookmarked(news.id) ? 'fill' : 'bold'} className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Key Takeaways ── */}
          {((news as NewsDetailStory).key_takeaways?.length ?? 0) > 0 && (
            <div className="mt-10 bg-narvo-surface border border-narvo-teal/10 p-6 md:p-8 rounded-3xl relative overflow-hidden" data-testid="key-takeaways">
              <div className="absolute top-0 left-0 w-2 h-full bg-narvo-teal" />
              <h3 className="flex items-center gap-2 text-sm font-bold text-narvo-ink mb-5 font-display uppercase tracking-widest">
                <Lightbulb weight="fill" className="text-narvo-vermilion w-5 h-5 shrink-0" />
                {t('news_detail.key_takeaways')}
              </h3>
              <ul className="space-y-4">
                {((news as NewsDetailStory).key_takeaways ?? []).map((kt, i) => (
                  <li key={i} className="flex items-start gap-4 text-narvo-ink/80 text-base leading-relaxed">
                    <span className="mt-2.5 w-2 h-2 bg-narvo-teal rounded-full shrink-0" />
                    <span className="break-words font-medium">{kt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Article body with karaoke highlight ── */}
          <article className="mt-12 space-y-8 md:space-y-10" data-testid="article-body">
            {hasDetailedBody ? narrativeParagraphs.map((para, i) => (
              <p
                key={i}
                className={`font-display font-medium leading-[1.8] text-lg md:text-[21px] break-words transition-all duration-700 ${karaokeActiveIndex === i ? 'text-narvo-teal scale-[1.01] origin-left' : 'text-narvo-ink/30'}`}
              >
                {para}
              </p>
            )) : (
              <p className="text-narvo-ink font-display text-lg leading-relaxed break-words">{news.summary}</p>
            )}
          </article>
          {/* Tags */}
          {(news.tags?.length ?? 0) > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {(news.tags ?? []).map((tag, i) => (
                <TagPill key={i} tag={tag} />
              ))}
            </div>
          )}

          {/* ── Source Attribution ── */}
          <div className="mt-10 narvo-border bg-narvo-teal/[0.03] p-4 md:p-5 rounded-2xl">
            <p className="mono-ui text-[10px] text-narvo-teal/60 font-bold tracking-widest mb-3">{t('news_detail.source_attribution')}</p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-narvo-ink font-display font-bold text-sm tracking-wide uppercase">{news.source}</p>
                <p className="mono-ui text-[11px] text-narvo-teal/60 mt-0.5">{formatPublishedDate(news.published)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={shareStory}
                  className="narvo-border px-3 py-2 mono-ui text-[11px] text-forest hover:text-primary flex items-center gap-1.5 transition-colors"
                  data-testid="share-source-btn"
                >
                  <ShareNetwork weight="bold" className="w-3 h-3" />
                  {t('dashboard.share')}
                </button>
                {(news as NewsDetailStory).source_url && (
                  <a
                    href={(news as NewsDetailStory).source_url}
                    target="_blank" rel="noopener noreferrer"
                    className="narvo-border px-3 py-2 mono-ui text-[11px] text-narvo-teal/70 hover:text-narvo-teal hover:bg-narvo-teal/5 flex items-center gap-1.5 transition-colors rounded-full"
                  >
                    <ArrowSquareOut weight="bold" className="w-3 h-3" />
                    {t('news_detail.original_source')}
                  </a>
                )}
              </div>
            </div>
          </div>

          {(news as NewsDetailStory).original_sources && (news as NewsDetailStory).original_sources!.length > 0 && (
            <div className="mt-8 pt-6 border-t border-narvo-teal/10" data-testid="verified-sources">
              <p className="mono-ui text-[10px] text-narvo-teal/40 mb-3 font-bold tracking-widest uppercase">VERIFIED_SOURCES</p>
              <div className="flex flex-wrap gap-3 mb-5">
                {(news as NewsDetailStory).original_sources!.map((src, i) => (
                  <a
                    key={`${src.name}-${i}`}
                    href={src.url || '#'}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-narvo-teal hover:underline font-medium"
                  >
                    <LinkIcon size={11} />
                    {src.name}
                  </a>
                ))}
              </div>
              <SourceTimeline sources={(news as NewsDetailStory).original_sources!} />
            </div>
          )}

          <div className="lg:hidden mt-10 pb-4" data-testid="mobile-related">
            <p className="mono-ui text-[11px] text-narvo-teal/60 font-bold tracking-widest mb-4 uppercase">{t('news_detail.related_transmissions')}</p>
            {relatedNews.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedNews.slice(0, 4).map((item, i) => (
                  <div
                    key={item.id}
                    ref={setRelatedRef(i)}
                    role="button"
                    tabIndex={0}
                    className="narvo-border p-3 cursor-pointer hover:bg-narvo-surface transition-colors group rounded-xl"
                    onClick={() => navigate(`/news/${item.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/news/${item.id}`); } }}
                    aria-label={`Open ${item.title}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="mono-ui text-[10px] text-narvo-teal/60 truncate">{item.source}</span>
                      <TruthTag storyId={item.id} compact />
                    </div>
                    <h4 className="text-xs font-display font-bold text-narvo-ink group-hover:text-narvo-teal transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mono-ui text-[11px] text-narvo-teal/40">{t('news_detail.no_related')}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Right sidebar (lg+) ── */}
      <aside
        className={`w-72 xl:w-80 hidden lg:flex flex-col narvo-border-l bg-narvo-cloud shrink-0 transition-all duration-500 ${isReading ? 'opacity-30 blur-[2px] pointer-events-none translate-x-4' : 'opacity-100 blur-0 translate-x-0'}`}
        data-testid="detail-sidebar"
      >
        {/* Sidebar header */}
        <div className="h-14 xl:h-16 flex items-center px-4 xl:px-5 narvo-border-b bg-narvo-surface/50 shrink-0">
          <span className="mono-ui text-[11px] font-bold text-narvo-teal/60 tracking-widest uppercase">{t('news_detail.article_metadata')}</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-4 xl:p-5 space-y-5">
          {/* Verification */}
          <div className="narvo-border bg-narvo-teal/[0.03] border-narvo-teal/10 p-3 rounded-xl">
            <p className="mono-ui text-[10px] text-narvo-teal/40 font-bold tracking-widest mb-2">{t('news_detail.verification_status')}</p>
            <TruthTag storyId={news.id} />
          </div>

          {/* Signal metadata */}
          <div className="narvo-border bg-narvo-surface p-4 rounded-xl shadow-narvo-1">
            <p className="mono-ui text-[10px] text-narvo-teal/40 font-bold tracking-widest mb-3">{t('news_detail.signal_metadata')}</p>
            <dl className="space-y-2">
              {[
                [t('news_detail.category'), news.category?.toUpperCase() || 'GENERAL', true],
                [t('news_detail.source'), news.source?.toUpperCase() || 'UNKNOWN', false],
                [t('news_detail.region'), (news as NewsDetailStory).region?.toUpperCase() || 'AFRICA', false],
                [t('news_detail.read_time'), `${readTime} MIN`, true],
                [t('news_detail.ai_synthesis'), news.narrative ? t('news_detail.complete') : t('news_detail.pending'), true],
              ].map(([label, value, isPrimary], i) => (
                <div key={i} className="flex justify-between gap-2 mono-ui text-[10px]">
                  <dt className="text-narvo-teal/60 shrink-0">{label}</dt>
                  <dd className={`truncate text-right ${isPrimary ? 'text-narvo-teal font-bold' : 'text-narvo-ink'}`}>{value}</dd>
                </div>
              ))}
              {typeof (news as Story).certainty_score === 'number' && (
                <div className="pt-3 mt-2 border-t border-narvo-teal/10">
                  <CertaintyMeter score={(news as Story).certainty_score!} />
                </div>
              )}
            </dl>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              {
                label: 'QUEUE', icon: <Queue weight="bold" className="w-3 h-3" />,
                action: () => { addToQueue(news); showAlert({ type: 'sync', title: 'QUEUE_UPDATED', message: 'Added to queue', code: 'Q_ADD', duration: 1800 } as AlertPresetConfig); },
                testId: 'sidebar-queue-btn',
              },
              {
                label: t('dashboard.share'), icon: <ShareNetwork weight="bold" className="w-3 h-3" />,
                action: shareStory, testId: 'sidebar-share-btn',
              },
              {
                label: isBookmarked(news.id) ? t('dashboard.saved') : t('dashboard.save'),
                icon: <BookmarkSimple weight={isBookmarked(news.id) ? 'fill' : 'regular'} className="w-3 h-3" />,
                action: toggleBookmark,
                testId: 'sidebar-bookmark-btn',
                active: isBookmarked(news.id),
              },
            ].map(({ label, icon, action, testId, active }) => (
              <button
                key={testId}
                onClick={action}
                data-testid={testId}
                className={`narvo-border py-2.5 rounded-xl mono-ui text-[9px] font-bold flex flex-col items-center gap-1.5 transition-all ${active ? 'bg-narvo-teal text-narvo-cloud border-narvo-teal' : 'text-narvo-teal/60 hover:text-narvo-teal hover:bg-narvo-teal/5 border-narvo-teal/10'}`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Tags */}
          {(news.tags?.length ?? 0) > 0 && (
            <div>
              <p className="mono-ui text-[10px] text-narvo-teal/40 font-bold tracking-widest mb-2">{t('news_detail.signal_tags')}</p>
              <div className="flex flex-wrap gap-1.5">
                {(news.tags ?? []).map((tag, i) => <TagPill key={i} tag={tag} />)}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-narvo-teal/10" />

          {/* Related stories */}
          <div className="space-y-4">
            <p className="mono-ui text-[10px] text-narvo-teal/40 font-bold tracking-widest uppercase">{t('news_detail.related_transmissions')}</p>
            {relatedNews.length > 0 ? (
              <div className="space-y-3">
                {relatedNews.map((item, i) => (
                  <div
                    key={item.id}
                    ref={setRelatedRef(i)}
                    role="button"
                    tabIndex={0}
                    className="narvo-border p-3.5 rounded-xl cursor-pointer hover:bg-narvo-surface transition-all group"
                    onClick={() => navigate(`/news/${item.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/news/${item.id}`); } }}
                    aria-label={`Open ${item.title}`}
                    data-testid={`related-${item.id}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="mono-ui text-[9px] text-narvo-teal/60 truncate font-bold">{item.source}</span>
                      <TruthTag storyId={item.id} compact />
                    </div>
                    <h4 className="text-xs font-display font-bold text-narvo-ink group-hover:text-narvo-teal transition-colors line-clamp-2 leading-relaxed">
                      {item.title}
                    </h4>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mono-ui text-[10px] text-narvo-teal/40">{t('news_detail.no_related')}</p>
            )}
          </div>

          {/* Source intelligence panel */}
          {(news as NewsDetailStory).original_sources && (news as NewsDetailStory).original_sources!.length > 0 && (
            <div className="border-t border-narvo-teal/10 pt-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-narvo-teal animate-pulse" />
                <p className="mono-ui text-[10px] text-narvo-teal/60 font-bold tracking-widest">LIVE_INTEL_STREAM</p>
              </div>
              <SourceTimeline sources={(news as NewsDetailStory).original_sources!} />
              <p className="mono-ui text-[9px] text-narvo-teal/40 mt-3 leading-tight font-medium">
                Consensus across {(news as NewsDetailStory).original_sources!.length} agencies.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default NewsDetailPage;
