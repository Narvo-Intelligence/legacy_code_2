import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  ArrowSquareOut,
  BookmarkSimple,
  Clock,
  Eye,
  Lightbulb,
  Link as LinkIcon,
  Pause,
  Play,
  Queue,
  ShareNetwork,
} from '@phosphor-icons/react';

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

const formatRelativePublished = (dateStr?: string): string => {
  if (!dateStr) return 'Today';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (error) {
    logger.debug('[NewsDetailPage] Failed to format published date', error);
    return dateStr;
  }
};

const formatLongPublished = (dateStr?: string): string => {
  if (!dateStr) return 'Today';
  try {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    logger.debug('[NewsDetailPage] Failed to format long published date', error);
    return dateStr;
  }
};

const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const stateStory = (location.state as { story?: Story })?.story;

  const [news, setNews] = useState<NewsDetailStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedNews, setRelatedNews] = useState<Story[]>([]);
  const [readTime, setReadTime] = useState(0);

  const {
    playTrack,
    forcePlayTrack,
    togglePlay,
    addToQueue,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    voiceModel,
    broadcastLanguage,
  } = useAudio();
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { showAlert } = useHapticAlert();

  const hasAutoPlayed = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const mountedRef = useRef(true);
  const pregenAudioUrl = useRef<string | null>(null);
  const [autoplayReady, setAutoplayReady] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  const fetchDetail = useCallback(() => {
    const params = new URLSearchParams();
    if (user?.id) params.set('user_id', user.id);
    if (broadcastLanguage) params.set('language', broadcastLanguage);
    const query = params.toString();
    const detailUrl = query ? `api/news/${id}?${query}` : `api/news/${id}`;

    const detailPromise = api.get(detailUrl)
      .then(async (response) => {
        if (!response.ok) return null;
        const json = await response.json();
        return isStory(json) ? (json as NewsDetailStory) : null;
      }) as Promise<NewsDetailStory | null>;

    const relatedPromise = api.get(`api/news/${id}/related`)
      .then(async (response) => {
        const json = response.ok ? await response.json() : [];
        return asArray<Story>(json, isStory);
      })
      .catch(() => []) as Promise<Story[]>;

    Promise.all([detailPromise, relatedPromise])
      .then(([detail, related]) => {
        if (!mountedRef.current) return;
        if (!detail) {
          setError('not_found');
          setLoading(false);
          return;
        }

        setNews(detail);
        setRelatedNews(Array.isArray(related) ? related.slice(0, 5) : []);

        const text = detail.narrative || detail.summary || '';
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        setReadTime(Math.max(1, Math.ceil(wordCount / 200)));
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setError('not_found');
        setLoading(false);
      });
  }, [broadcastLanguage, id, user?.id]);

  useEffect(() => {
    setError(null);
    hasAutoPlayed.current = false;
    setAutoplayReady(false);
    pregenAudioUrl.current = null;
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      fetchDetail();
    };

    const intervalId = window.setInterval(refresh, 2 * 60 * 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchDetail]);

  useEffect(() => {
    if (!news || loading) return;

    const lang = broadcastLanguage || 'en';
    const preGeneratedUrl = news.audio_by_lang?.[lang];

    if (preGeneratedUrl) {
      pregenAudioUrl.current = preGeneratedUrl;
      downloadAndCacheAudio(news.id, preGeneratedUrl, {
        title: news.title ?? '',
        source: news.source ?? '',
      }).catch((error) => {
        logger.debug('[NewsDetailPage] Failed to cache pre-generated audio', error);
      });
      setAutoplayReady(true);
      return;
    }

    const text = news.narrative || news.summary || news.title || '';
    if (!text) {
      setAutoplayReady(true);
      return;
    }

    const prependVerification = Array.isArray(news.original_sources) && news.original_sources.length > 1;
    api.post('api/tts/generate', {
      text,
      voice_id: voiceModel || 'emma',
      language: lang,
      prepend_verification: prependVerification,
      story_id: news.id,
    })
      .then((response) => (response.ok ? response.json() : null) as Promise<{ audio_url?: string; translated_text?: string } | null>)
      .then(async (payload) => {
        if (payload?.audio_url) {
          pregenAudioUrl.current = payload.audio_url;
          await downloadAndCacheAudio(news.id, payload.audio_url, {
            title: news.title ?? '',
            source: news.source ?? '',
          }).catch((error) => {
            logger.debug('[NewsDetailPage] Failed to cache generated audio', error);
          });
        }
        if (payload?.translated_text && lang !== 'en' && payload.translated_text !== text) {
          setNews((prev) => (prev ? { ...prev, narrative: payload.translated_text! } : prev));
        }
        setAutoplayReady(true);
      })
      .catch((error) => {
        logger.debug('[NewsDetailPage] Failed to generate TTS audio', error);
        setAutoplayReady(true);
      });
  }, [broadcastLanguage, loading, news, voiceModel]);

  const setRelatedRef = useObservedAudioPrefetch(relatedNews, {
    voiceId: voiceModel,
    language: broadcastLanguage,
    limit: 8,
    rootMargin: '300px',
  });

  useEffect(() => {
    if (autoplayReady && news && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      const track = pregenAudioUrl.current ? { ...news, url: pregenAudioUrl.current } : news;
      forcePlayTrack(track);
    }
  }, [autoplayReady, forcePlayTrack, news]);

  const toggleBookmark = useCallback(() => {
    if (!news) return;
    if (isBookmarked(news.id)) {
      removeBookmark(news.id);
      showAlert('BOOKMARK_REMOVED');
      return;
    }

    addBookmark(news);
    prefetchAndCacheStory(news, voiceModel, broadcastLanguage).catch((error) => {
      logger.debug('[NewsDetailPage] Failed to prefetch bookmarked audio', error);
    });
    showAlert('BOOKMARK_ADDED');
  }, [addBookmark, broadcastLanguage, isBookmarked, news, removeBookmark, showAlert, voiceModel]);

  const shareStory = useCallback(async () => {
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
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    }

    await navigator.clipboard.writeText(shareUrl);
    showAlert({
      type: 'sync',
      title: 'LINK_COPIED',
      message: 'Story link copied to clipboard.',
      code: 'CLIP_OK',
    });
  }, [news, showAlert]);

  const trackForPlayback = useMemo(() => {
    if (!news) return null;
    return pregenAudioUrl.current ? { ...news, url: pregenAudioUrl.current } : news;
  }, [news]);

  const handlePlayStory = useCallback(() => {
    if (!trackForPlayback) return;
    if (currentTrack?.id === trackForPlayback.id) {
      togglePlay();
      return;
    }
    playTrack(trackForPlayback, true);
  }, [currentTrack?.id, playTrack, togglePlay, trackForPlayback]);

  const queueStory = useCallback(() => {
    if (!trackForPlayback) return;
    addToQueue(trackForPlayback);
    showAlert({
      type: 'sync',
      title: 'QUEUE_UPDATED',
      message: 'Added to queue',
      code: 'Q_ADD',
      duration: 1800,
    } as AlertPresetConfig);
  }, [addToQueue, showAlert, trackForPlayback]);

  const narrativeParagraphs = useMemo(
    () => (news?.narrative || '').split('\n').filter((paragraph) => paragraph.trim()),
    [news?.narrative]
  );
  const hasDetailedBody = narrativeParagraphs.length > 0;
  const isCurrentlyPlaying = currentTrack?.id === news?.id && isPlaying;
  const isThisTrack = currentTrack?.id === news?.id;
  const totalChars = useMemo(
    () => narrativeParagraphs.reduce((acc, paragraph) => acc + paragraph.length, 0),
    [narrativeParagraphs]
  );
  const paragraphRanges = useMemo(() => {
    if (!isThisTrack || duration <= 0 || totalChars <= 0) return null;
    let elapsed = 0;
    return narrativeParagraphs.map((paragraph) => {
      const start = elapsed;
      elapsed += (paragraph.length / totalChars) * duration;
      return { start, end: elapsed };
    });
  }, [duration, isThisTrack, narrativeParagraphs, totalChars]);
  const rawActiveParagraph = paragraphRanges?.findIndex((range) => currentTime >= range.start && currentTime < range.end) ?? -1;
  const karaokeActiveIndex =
    rawActiveParagraph >= 0
      ? rawActiveParagraph
      : paragraphRanges && narrativeParagraphs.length > 0 && currentTime >= (paragraphRanges[paragraphRanges.length - 1]?.start ?? 0)
        ? narrativeParagraphs.length - 1
        : -1;

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || relatedNews.length === 0) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (deltaX < -60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const next = relatedNews[0];
      navigate(`/news/${next.id}`, { state: { story: next } });
    }
  };

  if (error) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden bg-bg">
        <section className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center" data-testid="news-detail-error">
          <p className="meta-eyebrow">{t('news_detail.story_unavailable')}</p>
          <h1 className="section-heading mt-3 text-[36px] text-content md:text-[48px]">
            {t('news_detail.story_unavailable_message')}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-content transition-colors hover:border-primary hover:text-primary"
            data-testid="back-to-feed-btn"
          >
            <ArrowLeft size={16} weight="bold" />
            {t('news_detail.back_to_feed')}
          </button>
        </section>
      </div>
    );
  }

  if (loading || !news) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden bg-bg">
        <section className="flex-1 overflow-y-auto no-scrollbar" data-testid="news-detail-loading">
          <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
            <ArticleSkeleton />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-bg" data-testid="news-detail-page">
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

      <section
        className="flex-1 overflow-y-auto no-scrollbar pb-28"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto max-w-[1360px] px-4 py-4 md:px-6 lg:px-8">
          <div className="shell-panel overflow-hidden p-0">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-5 md:p-8">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-content-secondary transition-colors hover:border-primary hover:text-primary"
                  data-testid="back-btn"
                >
                  <ArrowLeft size={14} weight="bold" />
                  {t('news_detail.back_to_feed')}
                </button>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary-deep px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                    {news.category || 'General'}
                  </span>
                  <TruthTag storyId={news.id} />
                </div>

                <h1
                  className="section-heading mt-5 text-[38px] text-content md:text-[58px]"
                  data-testid="news-title"
                >
                  {news.title}
                </h1>

                <p className="mt-5 max-w-3xl font-display text-[22px] leading-[1.6] text-content-secondary italic md:text-[26px]">
                  {news.short_summary || news.summary}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-[var(--shadow-1)]">
                    <Clock size={14} weight="bold" className="text-primary" />
                    <span className="text-[12px] font-semibold text-content-secondary">{readTime} min read</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-[var(--shadow-1)]">
                    <Eye size={14} weight="bold" className="text-primary" />
                    <span className="text-[12px] font-semibold text-content-secondary">{formatRelativePublished(news.published)}</span>
                  </div>
                  {typeof news.certainty_score === 'number' ? (
                    <div className="min-w-[180px] rounded-[18px] border border-border bg-white px-4 py-3 shadow-[var(--shadow-1)]">
                      <CertaintyMeter score={news.certainty_score} />
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePlayStory}
                    className={`inline-flex h-[56px] items-center gap-3 rounded-full px-6 text-sm font-semibold text-white shadow-[var(--shadow-2)] transition-transform hover:-translate-y-0.5 ${
                      autoplayReady || isCurrentlyPlaying ? 'bg-alert' : 'bg-primary'
                    }`}
                    data-testid="play-story-btn"
                    aria-label={isCurrentlyPlaying ? t('news_detail.pause') : t('news_detail.play')}
                  >
                    {!autoplayReady && !isCurrentlyPlaying ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : isCurrentlyPlaying ? (
                      <Pause size={16} weight="fill" />
                    ) : (
                      <Play size={16} weight="fill" />
                    )}
                    {!autoplayReady && !isCurrentlyPlaying ? t('news_detail.synthesizing') : isCurrentlyPlaying ? t('news_detail.pause') : t('news_detail.play')}
                  </button>

                  <button
                    type="button"
                    onClick={queueStory}
                    className="inline-flex h-[52px] items-center justify-center rounded-full border border-border bg-white px-4 text-content-secondary transition-colors hover:border-primary hover:text-primary"
                    data-testid="queue-btn"
                    title="Add to queue"
                  >
                    <Queue size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={shareStory}
                    className="inline-flex h-[52px] items-center justify-center rounded-full border border-border bg-white px-4 text-content-secondary transition-colors hover:border-primary hover:text-primary"
                    data-testid="share-story-btn"
                    title="Share"
                  >
                    <ShareNetwork size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleBookmark}
                    className={`inline-flex h-[52px] items-center justify-center rounded-full border px-4 transition-colors ${
                      isBookmarked(news.id)
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-white text-content-secondary hover:border-primary hover:text-primary'
                    }`}
                    data-testid="bookmark-detail-btn"
                  >
                    <BookmarkSimple size={16} weight={isBookmarked(news.id) ? 'fill' : 'bold'} />
                  </button>
                </div>

                {isCurrentlyPlaying && duration > 0 ? (
                  <div className="mt-5 max-w-[420px]">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-content-secondary">
                      <span>{t('news_detail.now_playing')}</span>
                      <span>{Math.round((currentTime / duration) * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-primary/8">
                      <div className="h-full rounded-full bg-alert transition-all duration-300" style={{ width: `${(currentTime / duration) * 100}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative min-h-[280px] overflow-hidden lg:min-h-full">
                <ResponsiveImage
                  src={news.image_url || '/narvo-icon-512.png'}
                  alt={news.title ?? 'Story'}
                  className="h-full w-full object-cover"
                  sizes={HERO_SIZES}
                  loading="eager"
                  decoding="async"
                  width={1400}
                  height={420}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,50,74,0.18)] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 rounded-[22px] border border-white/12 bg-[rgba(255,255,255,0.9)] px-4 py-3 backdrop-blur-md">
                  <div className="meta-eyebrow">Source</div>
                  <div className="mt-2 text-sm font-semibold text-content">{news.source || 'Narvo'}</div>
                  <div className="mt-1 text-xs text-content-secondary">{formatLongPublished(news.published)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
            <main className="min-w-0 space-y-6">
              {((news as NewsDetailStory).key_takeaways?.length ?? 0) > 0 ? (
                <section className="shell-card-soft p-5 md:p-6" data-testid="key-takeaways">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={18} weight="fill" className="text-alert" />
                    <div className="meta-eyebrow">{t('news_detail.key_takeaways')}</div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {((news as NewsDetailStory).key_takeaways ?? []).map((takeaway, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-[20px] bg-white/86 px-4 py-4">
                        <span className="mt-2 h-2 w-2 rounded-full bg-primary" />
                        <span className="text-sm leading-7 text-content-secondary">{takeaway}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <article className="shell-card p-5 md:p-8" data-testid="article-body">
                <div className="meta-eyebrow">Full gist</div>
                <div className="mt-6 space-y-7">
                  {hasDetailedBody ? (
                    narrativeParagraphs.map((paragraph, index) => (
                      <p
                        key={index}
                        className={`text-[18px] leading-[1.95] text-content transition-colors md:text-[20px] ${
                          karaokeActiveIndex === index
                            ? 'rounded-[18px] bg-primary/8 px-4 py-3 text-content'
                            : index >= 0 && karaokeActiveIndex > index
                              ? 'text-content-secondary'
                              : 'text-content'
                        }`}
                      >
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="text-[18px] leading-[1.95] text-content md:text-[20px]">{news.summary}</p>
                  )}
                </div>
              </article>

              {(news.tags?.length ?? 0) > 0 ? (
                <section className="shell-card-soft p-5">
                  <div className="meta-eyebrow">{t('news_detail.signal_tags')}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(news.tags ?? []).map((tag, index) => (
                      <TagPill key={index} tag={tag} />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="shell-card p-5 md:p-6">
                <div className="meta-eyebrow">{t('news_detail.source_attribution')}</div>
                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-semibold tracking-tight text-content">{news.source || 'Narvo'}</div>
                    <div className="mt-2 text-sm text-content-secondary">{formatLongPublished(news.published)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={shareStory}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-content-secondary transition-colors hover:border-primary hover:text-primary"
                      data-testid="share-source-btn"
                    >
                      <ShareNetwork size={14} weight="bold" />
                      {t('dashboard.share')}
                    </button>
                    {(news as NewsDetailStory).source_url ? (
                      <a
                        href={(news as NewsDetailStory).source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-content-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <ArrowSquareOut size={14} weight="bold" />
                        {t('news_detail.original_source')}
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>

              {news.original_sources && news.original_sources.length > 0 ? (
                <section className="shell-card p-5 md:p-6" data-testid="verified-sources">
                  <div className="meta-eyebrow">Verified sources</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {news.original_sources.map((source, index) => (
                      <a
                        key={`${source.name}-${index}`}
                        href={source.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2 text-xs font-semibold text-content-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <LinkIcon size={11} />
                        {source.name}
                      </a>
                    ))}
                  </div>
                  <SourceTimeline sources={news.original_sources} />
                </section>
              ) : null}

              <section className="lg:hidden shell-card-soft p-5" data-testid="mobile-related">
                <div className="meta-eyebrow">{t('news_detail.related_transmissions')}</div>
                {relatedNews.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {relatedNews.slice(0, 4).map((item, index) => (
                      <div
                        key={item.id}
                        ref={setRelatedRef(index)}
                        role="button"
                        tabIndex={0}
                        className="rounded-[22px] border border-border bg-white p-4 shadow-[var(--shadow-1)] transition-colors hover:border-primary/20"
                        onClick={() => navigate(`/news/${item.id}`, { state: { story: item } })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/news/${item.id}`, { state: { story: item } });
                          }
                        }}
                        aria-label={`Open ${item.title}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-content-secondary">{item.source}</span>
                          <TruthTag storyId={item.id} compact />
                        </div>
                        <h3 className="mt-3 text-base font-semibold leading-7 text-content">{item.title}</h3>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-content-secondary">{t('news_detail.no_related')}</p>
                )}
              </section>
            </main>

            <aside className="hidden lg:block">
              <div className="sticky top-6 space-y-5" data-testid="detail-sidebar">
                <section className="shell-card-soft p-5">
                  <div className="meta-eyebrow">{t('news_detail.verification_status')}</div>
                  <div className="mt-4">
                    <TruthTag storyId={news.id} />
                  </div>
                  {typeof news.certainty_score === 'number' ? (
                    <div className="mt-5 rounded-[20px] border border-border bg-white px-4 py-4 shadow-[var(--shadow-1)]">
                      <CertaintyMeter score={news.certainty_score} />
                    </div>
                  ) : null}
                </section>

                <section className="shell-card p-5">
                  <div className="meta-eyebrow">{t('news_detail.signal_metadata')}</div>
                  <dl className="mt-4 space-y-3">
                    {[
                      [t('news_detail.category'), news.category?.toUpperCase() || 'GENERAL'],
                      [t('news_detail.source'), news.source?.toUpperCase() || 'UNKNOWN'],
                      [t('news_detail.region'), (news as NewsDetailStory).region?.toUpperCase() || 'AFRICA'],
                      [t('news_detail.read_time'), `${readTime} MIN`],
                      [t('news_detail.ai_synthesis'), news.narrative ? t('news_detail.complete') : t('news_detail.pending')],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex items-start justify-between gap-3">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-content-secondary">{label}</dt>
                        <dd className="text-right text-[12px] font-semibold text-content">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section className="shell-card p-5">
                  <div className="meta-eyebrow">Quick actions</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={queueStory}
                      data-testid="sidebar-queue-btn"
                      className="flex flex-col items-center gap-2 rounded-[18px] border border-border bg-white px-3 py-4 text-[11px] font-semibold text-content-secondary transition-colors hover:border-primary hover:text-primary"
                    >
                      <Queue size={16} weight="bold" />
                      Queue
                    </button>
                    <button
                      type="button"
                      onClick={shareStory}
                      data-testid="sidebar-share-btn"
                      className="flex flex-col items-center gap-2 rounded-[18px] border border-border bg-white px-3 py-4 text-[11px] font-semibold text-content-secondary transition-colors hover:border-primary hover:text-primary"
                    >
                      <ShareNetwork size={16} weight="bold" />
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={toggleBookmark}
                      data-testid="sidebar-bookmark-btn"
                      className={`flex flex-col items-center gap-2 rounded-[18px] border px-3 py-4 text-[11px] font-semibold transition-colors ${
                        isBookmarked(news.id)
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-white text-content-secondary hover:border-primary hover:text-primary'
                      }`}
                    >
                      <BookmarkSimple size={16} weight={isBookmarked(news.id) ? 'fill' : 'bold'} />
                      {isBookmarked(news.id) ? t('dashboard.saved') : t('dashboard.save')}
                    </button>
                  </div>
                </section>

                <section className="shell-card p-5">
                  <div className="meta-eyebrow">{t('news_detail.related_transmissions')}</div>
                  {relatedNews.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {relatedNews.map((item, index) => (
                        <div
                          key={item.id}
                          ref={setRelatedRef(index)}
                          role="button"
                          tabIndex={0}
                          className="rounded-[22px] border border-border bg-white p-4 shadow-[var(--shadow-1)] transition-colors hover:border-primary/20"
                          onClick={() => navigate(`/news/${item.id}`, { state: { story: item } })}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              navigate(`/news/${item.id}`, { state: { story: item } });
                            }
                          }}
                          aria-label={`Open ${item.title}`}
                          data-testid={`related-${item.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-content-secondary">{item.source}</span>
                            <TruthTag storyId={item.id} compact />
                          </div>
                          <h3 className="mt-3 text-base font-semibold leading-7 text-content">{item.title}</h3>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-content-secondary">{t('news_detail.no_related')}</p>
                  )}
                </section>

                {news.original_sources && news.original_sources.length > 0 ? (
                  <section className="shell-card-soft p-5">
                    <div className="meta-eyebrow">Source intelligence</div>
                    <SourceTimeline sources={news.original_sources} />
                  </section>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewsDetailPage;
