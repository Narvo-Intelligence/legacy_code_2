import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion as _motion } from 'framer-motion';
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
import { Broadcast } from '@phosphor-icons/react/Broadcast';
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
import { cacheAudio } from '../lib/audioCache';
import * as api from '../lib/api';
import ResponsiveImage from '../components/ResponsiveImage';
import { HERO_SIZES } from '../lib/responsiveImageUtils';
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
  const fetchDetail = useCallback((opts: { resetAutoplay?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (user?.id) params.set('user_id', user.id);
    if (broadcastLanguage) params.set('language', broadcastLanguage);
    const qs = params.toString();
    const detailUrl = qs ? `api/news/${id}?${qs}` : `api/news/${id}`;
    const detailPromise = api.get(detailUrl).then(r => (r.ok ? r.json() : null)) as Promise<NewsDetailStory | null>;
    const relatedPromise = api.get(`api/news/${id}/related`).then(r => (r.ok ? r.json() : [])).catch(() => []) as Promise<Story[]>;

    Promise.all([detailPromise, relatedPromise]).then(([newsData, related]) => {
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
      setError('not_found');
      setLoading(false);
    });
  }, [id, user?.id, broadcastLanguage]);

  // Initial load
  useEffect(() => {
    setError(null);
    hasAutoPlayed.current = false;
    fetchDetail({ resetAutoplay: true });
  }, [fetchDetail]);

  // Background refresh — silently re-fetches content every 2 min and on tab focus,
  // so audio_by_lang and translated narrative are updated without a manual reload.
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
      cacheAudio(news.id, preGeneratedUrl, { title: news.title ?? '', source: news.source ?? '' }).catch(() => {});
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
      text: text.slice(0, 4000),
      voice_id: vid,
      language: lang,
      prepend_verification: prependVerification,
      story_id: news.id,
    })
      .then(r => (r.ok ? r.json() : null) as Promise<{ audio_url?: string; translated_text?: string } | null>)
      .then(async (data) => {
        if (data?.audio_url) {
          pregenAudioUrl.current = data.audio_url;
          await cacheAudio(news.id, data.audio_url, {
            title: news.title ?? '',
            source: news.source ?? '',
          }).catch(() => {});
        }
        // If TTS translated the narrative into the target language, update the displayed text
        // so what the user reads matches what they hear.
        if (data?.translated_text && lang !== 'en' && data.translated_text !== text) {
          setNews(prev => prev ? { ...prev, narrative: data.translated_text! } : prev);
        }
        setAutoplayReady(true);
      })
      .catch(() => setAutoplayReady(true));
  }, [news, loading, voiceModel, broadcastLanguage]);

  // Prefetch TTS for recommended/related news when they enter viewport
  const setRelatedRef = useObservedAudioPrefetch(relatedNews, {
    voiceId: voiceModel,
    language: broadcastLanguage,
    limit: 5,
    rootMargin: '80px',
  });

  // Auto-play once TTS is pre-cached — pass audio_url directly to skip double-fetch
  useEffect(() => {
    if (autoplayReady && news && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      const trackWithAudio = pregenAudioUrl.current
        ? { ...news, url: pregenAudioUrl.current }
        : news;
      forcePlayTrack(trackWithAudio);
    }
  }, [autoplayReady, news, forcePlayTrack]);

  const toggleBookmark = () => {
    if (!news) return;
    if (isBookmarked(news.id)) {
      removeBookmark(news.id);
      showAlert('BOOKMARK_REMOVED');
    } else {
      addBookmark(news);
      prefetchAndCacheStory(news, voiceModel, broadcastLanguage).catch(() => {});
      showAlert('BOOKMARK_ADDED');
    }
  };

  const shareStory = async () => {
    if (!news) return;
    // Use the /api/share/ URL which has proper OG meta tags for social media
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
    } catch {
      return dateStr;
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <section className="flex-1 overflow-y-auto bg-background-dark custom-scroll flex flex-col items-center justify-center px-4 py-12" data-testid="news-detail-error">
          <p className="mono-ui text-[14px] text-forest uppercase tracking-widest mb-2">{t('news_detail.story_unavailable')}</p>
          <p className="text-content font-display text-lg mb-6 text-center max-w-md">{t('news_detail.story_unavailable_message')}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="narvo-border px-6 py-3 mono-ui text-[12px] font-bold text-primary hover:bg-primary hover:text-background-dark transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
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
        <section className="flex-1 overflow-y-auto overflow-x-hidden bg-background-dark custom-scroll" data-testid="news-detail-loading">
          <div className="max-w-3xl mx-auto py-8 md:py-12 px-4 md:px-8">
            <ArticleSkeleton />
          </div>
        </section>
        <aside className="w-80 hidden xl:flex flex-col narvo-border-l bg-background-dark shrink-0">
          <div className="h-20 narvo-border-b bg-surface/10" />
          <div className="p-6 space-y-6">
            <div className="narvo-border bg-surface/20 p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 bg-forest/10 animate-pulse" />
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

  // Swipe left to open next article from related (mobile-friendly continuous consumption)
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
    <div className="flex-1 flex min-h-0 overflow-hidden" data-testid="news-detail-page">
      <Helmet>
        <title>{news.title} — NARVO</title>
        <meta property="og:title" content={news.title} />
        <meta property="og:description" content={news.narrative?.slice(0, 160) || 'Listen on Narvo — Audio-first news for Africa'} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/news/${id}`} />
        <meta property="og:image" content={`${api.API_BASE}/api/og/${id}`} />
        <meta property="og:image:alt" content={news.title ? `${news.title} — Narvo` : 'Narvo — Audio-first news for Africa'} />
        <meta property="og:site_name" content="NARVO" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={news.title} />
        <meta name="twitter:description" content={news.narrative?.slice(0, 160) || 'Audio-first news for Africa'} />
        <meta name="twitter:image" content={`${api.API_BASE}/api/og/${id}`} />
        <meta name="twitter:image:alt" content={news.title ? `${news.title} — Narvo` : 'Narvo — Audio-first news for Africa'} />
      </Helmet>

      {/* ── Main scroll column ── */}
      <section
        ref={scrollSectionRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-background-dark custom-scroll min-w-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Hero — full-width image with gradient overlay */}
        <div className="relative w-full h-[240px] sm:h-[340px] lg:h-[420px] overflow-hidden">
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
          {/* dark-to-transparent gradient so text sits cleanly over image */}
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent" />

          {/* Back button pinned top-left */}
          <button
            onClick={() => navigate('/dashboard')}
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-background-dark/70 backdrop-blur-sm narvo-border mono-ui text-[11px] text-forest hover:text-primary transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
            {t('news_detail.back_to_feed')}
          </button>

          {/* Category + TruthTag pinned top-right */}
          <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap justify-end">
            <span className="px-2 py-1 bg-background-dark/80 backdrop-blur-sm narvo-border mono-ui text-[10px] font-bold text-primary uppercase tracking-wider">
              {news.category || 'General'}
            </span>
            <TruthTag storyId={news.id} />
          </div>

          {/* Headline over image bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-6 pt-12">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="mono-ui text-[11px] text-forest flex items-center gap-1.5">
                <Clock weight="bold" className="w-3 h-3" />
                {readTime} MIN
              </span>
              <span className="mono-ui text-[11px] text-forest flex items-center gap-1.5">
                <Eye weight="bold" className="w-3 h-3" />
                {formatPublishedDate(news.published)}
              </span>
              {typeof (news as Story).certainty_score === 'number' && (
                <div className="w-20">
                  <CertaintyMeter score={(news as Story).certainty_score!} />
                </div>
              )}
            </div>
            <h1
              className="font-bold text-white leading-[1.08] tracking-tight font-display uppercase break-words"
              style={{ fontSize: 'clamp(1.25rem, 3.5vw, 2.25rem)' }}
              data-testid="news-title"
            >
              {news.title}
            </h1>
          </div>
        </div>

        {/* ── Article body ── */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 pb-40">

          {/* Lead — short_summary */}
          <p className="mt-6 text-slate-300 font-light leading-relaxed font-display border-l-2 border-forest pl-4 md:pl-6 text-base md:text-lg break-words">
            {news.short_summary || news.summary}
          </p>

          {/* ── Audio player bar ── */}
          <div className="mt-6 narvo-border bg-surface/20 p-4 flex items-center gap-4" data-testid="audio-bar">
            <button
              onClick={() => playTrack(news)}
              className={`w-12 h-12 shrink-0 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isCurrentlyPlaying ? 'bg-white text-background-dark' : 'bg-primary hover:bg-white text-background-dark'} ${!autoplayReady && !isCurrentlyPlaying ? 'animate-pulse opacity-80' : ''}`}
              data-testid="play-story-btn"
              aria-label={isCurrentlyPlaying ? t('news_detail.pause') : !autoplayReady ? t('news_detail.synthesizing') : t('news_detail.play')}
            >
              {!autoplayReady && !isCurrentlyPlaying ? (
                <span className="w-5 h-5 border-2 border-background-dark border-t-transparent rounded-full animate-spin" aria-hidden />
              ) : isCurrentlyPlaying ? (
                <Pause weight="fill" className="w-5 h-5" />
              ) : (
                <Play weight="fill" className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className="mono-ui text-[10px] text-forest uppercase tracking-widest mb-0.5">
                {!autoplayReady && !isCurrentlyPlaying
                  ? t('news_detail.synthesizing_broadcast')
                  : isCurrentlyPlaying
                    ? t('news_detail.now_playing')
                    : t('news_detail.narrative_audio')}
              </p>
              <p className="text-sm font-display font-bold text-content uppercase tracking-wide truncate" data-testid="tts-voice-label">
                {(voiceModel || 'emma').toUpperCase()} — {broadcastLanguage?.toUpperCase() || 'EN'}
              </p>
              {isCurrentlyPlaying && duration > 0 && (
                <div className="mt-1.5 h-1 bg-forest/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { addToQueue(news); showAlert({ type: 'sync', title: 'QUEUE_UPDATED', message: 'Added to queue', code: 'Q_ADD', duration: 1800 } as AlertPresetConfig); }}
                className="narvo-border w-9 h-9 flex items-center justify-center text-forest hover:text-primary transition-colors"
                title="Add to queue"
                data-testid="queue-btn"
              >
                <Queue weight="bold" className="w-4 h-4" />
              </button>
              <button
                onClick={shareStory}
                className="narvo-border w-9 h-9 flex items-center justify-center text-forest hover:text-primary transition-colors"
                title="Share"
                data-testid="share-story-btn"
              >
                <ShareNetwork weight="bold" className="w-4 h-4" />
              </button>
              <button
                onClick={toggleBookmark}
                className={`narvo-border w-9 h-9 flex items-center justify-center transition-colors ${isBookmarked(news.id) ? 'text-primary border-primary' : 'text-forest hover:text-primary'}`}
                data-testid="bookmark-detail-btn"
              >
                <BookmarkSimple weight={isBookmarked(news.id) ? 'fill' : 'regular'} className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Key Takeaways ── */}
          {((news as NewsDetailStory).key_takeaways?.length ?? 0) > 0 && (
            <div className="mt-8 narvo-border p-4 md:p-6 relative overflow-hidden" data-testid="key-takeaways">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <h3 className="flex items-center gap-2 text-sm font-bold text-content mb-3 font-display uppercase tracking-tight">
                <Lightbulb weight="fill" className="text-primary w-4 h-4 shrink-0" />
                {t('news_detail.key_takeaways')}
              </h3>
              <ul className="space-y-2">
                {((news as NewsDetailStory).key_takeaways ?? []).map((kt, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
                    <span className="mt-2 w-1.5 h-1.5 bg-primary shrink-0 rounded-sm" />
                    <span className="break-words">{kt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Article body with karaoke highlight ── */}
          <article className="mt-8 space-y-4 md:space-y-6" data-testid="article-body">
            {hasDetailedBody ? narrativeParagraphs.map((para, i) => (
              <p
                key={i}
                className={`font-light leading-[1.85] text-base md:text-[17px] break-words transition-colors duration-300 ${karaokeActiveIndex === i ? 'text-white' : 'text-slate-400'}`}
              >
                {para}
              </p>
            )) : (
              <p className="text-slate-300 font-light leading-relaxed break-words">{news.summary}</p>
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
          <div className="mt-10 narvo-border bg-surface/10 p-4 md:p-5">
            <p className="mono-ui text-[10px] text-forest font-bold tracking-widest mb-3">{t('news_detail.source_attribution')}</p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-content font-display font-bold text-sm">{news.source}</p>
                <p className="mono-ui text-[11px] text-forest mt-0.5">{formatPublishedDate(news.published)}</p>
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
                    target="_blank"
                    rel="noopener noreferrer"
                    className="narvo-border px-3 py-2 mono-ui text-[11px] text-forest hover:text-primary flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowSquareOut weight="bold" className="w-3 h-3" />
                    {t('news_detail.original_source')}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ── Multi-source consensus log ── */}
          {(news as NewsDetailStory).original_sources && (news as NewsDetailStory).original_sources!.length > 0 && (
            <div className="mt-8 pt-6 border-t border-forest/20" data-testid="verified-sources">
              <p className="mono-ui text-[10px] text-forest mb-3 font-bold tracking-widest uppercase">VERIFIED_SOURCES</p>
              <div className="flex flex-wrap gap-3 mb-5">
                {(news as NewsDetailStory).original_sources!.map((src, i) => (
                  <a
                    key={`${src.name}-${i}`}
                    href={src.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <LinkIcon size={11} />
                    {src.name}
                  </a>
                ))}
              </div>
              <SourceTimeline sources={(news as NewsDetailStory).original_sources!} />
            </div>
          )}

          {/* ── Related stories (mobile + tablet: inline; desktop: sidebar) ── */}
          <div className="lg:hidden mt-10 pb-4" data-testid="mobile-related">
            <p className="mono-ui text-[11px] text-forest font-bold tracking-widest mb-4 uppercase">{t('news_detail.related_transmissions')}</p>
            {relatedNews.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedNews.slice(0, 4).map((item, i) => (
                  <div
                    key={item.id}
                    ref={setRelatedRef(i)}
                    role="button"
                    tabIndex={0}
                    className="narvo-border p-3 cursor-pointer hover:bg-surface/40 transition-colors group"
                    onClick={() => navigate(`/news/${item.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/news/${item.id}`); } }}
                    aria-label={`Open ${item.title}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="mono-ui text-[10px] text-primary truncate">{item.source}</span>
                      <TruthTag storyId={item.id} compact />
                    </div>
                    <h4 className="text-xs font-display font-bold text-content group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mono-ui text-[11px] text-forest">{t('news_detail.no_related')}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Right sidebar (lg+) ── */}
      <aside
        className="w-72 xl:w-80 hidden lg:flex flex-col narvo-border-l bg-background-dark shrink-0"
        data-testid="detail-sidebar"
      >
        {/* Sidebar header */}
        <div className="h-14 xl:h-16 flex items-center px-4 xl:px-5 narvo-border-b bg-surface/10 shrink-0">
          <span className="mono-ui text-[11px] font-bold text-forest tracking-widest uppercase">{t('news_detail.article_metadata')}</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-4 xl:p-5 space-y-5">
          {/* Verification */}
          <div className="narvo-border bg-primary/5 border-primary/30 p-3">
            <p className="mono-ui text-[10px] text-forest font-bold tracking-widest mb-2">{t('news_detail.verification_status')}</p>
            <TruthTag storyId={news.id} />
          </div>

          {/* Signal metadata */}
          <div className="narvo-border bg-surface/20 p-3">
            <p className="mono-ui text-[10px] text-forest font-bold tracking-widest mb-3">{t('news_detail.signal_metadata')}</p>
            <dl className="space-y-2">
              {[
                [t('news_detail.category'), news.category?.toUpperCase() || 'GENERAL', true],
                [t('news_detail.source'), news.source?.toUpperCase() || 'UNKNOWN', false],
                [t('news_detail.region'), (news as NewsDetailStory).region?.toUpperCase() || 'AFRICA', false],
                [t('news_detail.read_time'), `${readTime} MIN`, true],
                [t('news_detail.ai_synthesis'), news.narrative ? t('news_detail.complete') : t('news_detail.pending'), true],
              ].map(([label, value, isPrimary], i) => (
                <div key={i} className="flex justify-between gap-2 mono-ui text-[10px]">
                  <dt className="text-forest shrink-0">{label}</dt>
                  <dd className={`truncate text-right ${isPrimary ? 'text-primary font-bold' : 'text-content'}`}>{value}</dd>
                </div>
              ))}
              {typeof (news as Story).certainty_score === 'number' && (
                <div className="pt-2 mt-1 border-t border-forest/10">
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
                className={`narvo-border py-2 mono-ui text-[10px] flex flex-col items-center gap-1 transition-colors ${active ? 'text-primary border-primary' : 'text-forest hover:text-primary hover:border-primary'}`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Tags */}
          {(news.tags?.length ?? 0) > 0 && (
            <div>
              <p className="mono-ui text-[10px] text-forest font-bold tracking-widest mb-2">{t('news_detail.signal_tags')}</p>
              <div className="flex flex-wrap gap-1.5">
                {(news.tags ?? []).map((tag, i) => <TagPill key={i} tag={tag} />)}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-forest/10" />

          {/* Related stories */}
          <div>
            <p className="mono-ui text-[10px] text-forest font-bold tracking-widest mb-3">{t('news_detail.related_transmissions')}</p>
            {relatedNews.length > 0 ? (
              <div className="space-y-2">
                {relatedNews.map((item, i) => (
                  <div
                    key={item.id}
                    ref={setRelatedRef(i)}
                    role="button"
                    tabIndex={0}
                    className="narvo-border p-3 cursor-pointer hover:bg-surface/40 transition-colors group"
                    onClick={() => navigate(`/news/${item.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/news/${item.id}`); } }}
                    aria-label={`Open ${item.title}`}
                    data-testid={`related-${item.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="mono-ui text-[10px] text-primary truncate">{item.source}</span>
                      <TruthTag storyId={item.id} compact />
                    </div>
                    <h4 className="text-xs font-display font-bold text-content group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mono-ui text-[10px] text-forest">{t('news_detail.no_related')}</p>
            )}
          </div>

          {/* Source intelligence panel */}
          {(news as NewsDetailStory).original_sources && (news as NewsDetailStory).original_sources!.length > 0 && (
            <div className="border-t border-forest/10 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="mono-ui text-[10px] text-forest tracking-widest">LIVE_INTEL_STREAM</p>
              </div>
              <SourceTimeline sources={(news as NewsDetailStory).original_sources!} />
              <p className="mono-ui text-[9px] text-forest/50 mt-3 leading-tight">
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
