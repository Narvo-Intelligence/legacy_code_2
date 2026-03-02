import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Play, Pause, BookmarkSimple, ArrowSquareOut, ArrowLeft, Lightbulb, ShareNetwork, Clock, Eye, Broadcast, Queue, CaretDown, CaretUp } from '@phosphor-icons/react';
import { useAudio } from '../contexts/AudioContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useHapticAlert } from '../components/HapticAlerts';
import { ArticleSkeleton } from '../components/Skeleton';
import TruthTag from '../components/TruthTag';
import { TagPill } from '../components/HashtagText';
import * as api from '../lib/api';

const MobileMetadata = ({ news, readTime, relatedNews, isBookmarked, toggleBookmark, addToQueue, shareStory, navigate, showAlert, t, formatPublishedDate }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="lg:hidden mt-8 narvo-border" data-testid="mobile-article-metadata">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full p-4 flex items-center justify-between bg-surface/10 hover:bg-surface/20 transition-colors"
        data-testid="mobile-metadata-toggle"
      >
        <span className="mono-ui text-[12px] text-forest font-bold tracking-widest uppercase">{t('news_detail.article_metadata')}</span>
        {open ? <CaretUp weight="bold" className="w-4 h-4 text-forest" /> : <CaretDown weight="bold" className="w-4 h-4 text-forest" />}
      </button>
      {open && (
        <div className="p-4 space-y-5 narvo-border-t">
          {/* Verification */}
          <div className="narvo-border bg-primary/5 p-3 border-primary/30">
            <span className="mono-ui text-[11px] text-forest block mb-2 font-bold tracking-widest">{t('news_detail.verification_status')}</span>
            <TruthTag storyId={news.id} />
          </div>
          {/* Signal Metadata */}
          <div className="narvo-border bg-surface/20 p-3">
            <span className="mono-ui text-[11px] text-forest block mb-2 font-bold tracking-widest">{t('news_detail.signal_metadata')}</span>
            <div className="space-y-2">
              {[
                [t('news_detail.category'), news.category?.toUpperCase() || 'GENERAL', true],
                [t('news_detail.source'), news.source?.toUpperCase() || 'UNKNOWN', false],
                [t('news_detail.region'), news.region?.toUpperCase() || 'AFRICA', false],
                [t('news_detail.read_time'), `${readTime} MIN`, true],
                [t('news_detail.ai_synthesis'), news.narrative ? t('news_detail.complete') : t('news_detail.pending'), true],
              ].map(([label, value, isPrimary], i) => (
                <div key={i} className="flex justify-between mono-ui text-[11px]">
                  <span className="text-forest">{label}</span>
                  <span className={isPrimary ? 'text-primary font-bold' : 'text-content'}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { addToQueue(news); showAlert({ type: 'sync', title: 'QUEUE_UPDATED', message: 'Added to playlist queue', code: 'Q_ADD', duration: 2000 }); }}
              className="flex-1 narvo-border py-2 mono-ui text-[11px] text-forest hover:text-primary hover:border-primary flex items-center justify-center gap-2 transition-colors"
              data-testid="mobile-queue-btn"
            >
              <Queue weight="bold" className="w-3 h-3" />
              QUEUE
            </button>
            <button
              onClick={shareStory}
              className="flex-1 narvo-border py-2 mono-ui text-[11px] text-forest hover:text-primary hover:border-primary flex items-center justify-center gap-2 transition-colors"
              data-testid="mobile-share-btn"
            >
              <ShareNetwork weight="bold" className="w-3 h-3" />
              SHARE
            </button>
            <button
              onClick={toggleBookmark}
              className={`flex-1 narvo-border py-2 mono-ui text-[11px] flex items-center justify-center gap-2 transition-colors ${isBookmarked(news.id) ? 'text-primary border-primary' : 'text-forest hover:text-primary hover:border-primary'}`}
              data-testid="mobile-bookmark-btn"
            >
              <BookmarkSimple weight={isBookmarked(news.id) ? 'fill' : 'regular'} className="w-3 h-3" />
              {isBookmarked(news.id) ? t('dashboard.saved') : t('dashboard.save')}
            </button>
          </div>
          {/* Tags */}
          {news.tags?.length > 0 && (
            <div>
              <span className="mono-ui text-[11px] text-forest block mb-3 font-bold tracking-widest">{t('news_detail.signal_tags')}</span>
              <div className="flex flex-wrap gap-1.5">
                {news.tags.map((tag, i) => (
                  <TagPill key={i} tag={tag} />
                ))}
              </div>
            </div>
          )}
          {/* Related / Recommended */}
          <div>
            <span className="mono-ui text-[11px] text-forest block mb-3 font-bold tracking-widest">{t('news_detail.related_transmissions')}</span>
            {relatedNews.length > 0 ? (
              <div className="space-y-2">
                {relatedNews.map((item) => (
                  <div
                    key={item.id}
                    className="narvo-border p-3 cursor-pointer hover:bg-surface/40 transition-colors group"
                    onClick={() => navigate(`/news/${item.id}`)}
                    data-testid={`mobile-related-${item.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="mono-ui text-[10px] text-primary">{item.source}</span>
                      <TruthTag storyId={item.id} compact />
                    </div>
                    <h4 className="text-xs text-content font-display font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
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
      )}
    </div>
  );
};

const NewsDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedNews, setRelatedNews] = useState([]);
  const [readTime, setReadTime] = useState(0);
  const { playTrack, forcePlayTrack, addToQueue, currentTrack, isPlaying, voiceModel, broadcastLanguage, settingsLoaded } = useAudio();
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { showAlert } = useHapticAlert();
  const { t } = useTranslation();
  const hasAutoPlayed = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    hasAutoPlayed.current = false;

    Promise.all([
      api.get(`api/news/${id}`).then(r => (r.ok ? r.json() : null)),
      api.get('api/news?limit=12').then(r => r.json()).catch(() => []),
    ]).then(([newsData, related]) => {
      if (!newsData) {
        setError('not_found');
        setLoading(false);
        return;
      }
      setNews(newsData);

      const sameCategory = related.filter(r => r.id !== id && r.category === newsData.category);
      const otherNews = related.filter(r => r.id !== id && r.category !== newsData.category);
      setRelatedNews([...sameCategory, ...otherNews].slice(0, 5));

      const text = (newsData.narrative || newsData.summary || '');
      const wordCount = text.split(/\s+/).length;
      setReadTime(Math.max(1, Math.ceil(wordCount / 200)));

      setLoading(false);
    }).catch(() => {
      setError('not_found');
      setLoading(false);
    });
  }, [id]);

  const [autoplayReady, setAutoplayReady] = useState(false);
  const pregenAudioUrl = useRef(null);

  // Pre-generate TTS audio as soon as news loads AND settings are ready
  useEffect(() => {
    if (!news || loading || !settingsLoaded) return;
    const text = news.narrative || news.summary || news.title || '';
    if (!text) return;
    
    const vid = voiceModel || 'emma';
    const lang = broadcastLanguage || 'en';
    
    api.post('api/tts/generate', { text: text.slice(0, 4000), voice_id: vid, language: lang })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.audio_url) pregenAudioUrl.current = data.audio_url;
        setAutoplayReady(true);
      })
      .catch(() => setAutoplayReady(true));
  }, [news, loading, settingsLoaded, voiceModel, broadcastLanguage]);

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
    if (isBookmarked(news.id)) {
      removeBookmark(news.id);
      showAlert('BOOKMARK_REMOVED');
    } else {
      addBookmark(news);
      showAlert('BOOKMARK_ADDED');
    }
  };

  const shareStory = async () => {
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
        if (err.name !== 'AbortError') {
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

  const formatPublishedDate = (dateStr) => {
    if (!dateStr) return 'Today';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
      
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

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      <Helmet>
        <title>{news.title} — NARVO</title>
        <meta property="og:title" content={news.title} />
        <meta property="og:description" content={news.narrative?.slice(0, 160) || `Listen on Narvo — Audio-first news for Africa`} />
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
      {/* Main Article Content */}
      <section className="flex-1 overflow-y-auto overflow-x-hidden relative bg-background-dark custom-scroll" data-testid="news-detail-page">
        <div className="max-w-3xl mx-auto py-8 md:py-12 px-4 md:px-8 pb-32 md:pb-40 narvo-article-scale">
          {/* Back + Truth Tag Header */}
          <div className="mb-4 md:mb-6 flex items-center justify-between">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="mono-ui text-[12px] md:text-xs text-forest hover:text-primary flex items-center gap-2 transition-colors" 
              data-testid="back-btn"
            >
              <ArrowLeft weight="bold" className="w-4 h-4" />
              <span>{t('news_detail.back_to_feed')}</span>
            </button>
            <div className="flex items-center gap-3">
              <TruthTag storyId={news.id} />
            </div>
          </div>

          {/* Category Pills + Meta */}
          <div className="mb-6 md:mb-10 min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 mb-4 md:mb-6 min-w-0">
              <div className="flex gap-0 narvo-border w-fit">
                <span className="px-2 md:px-3 py-1 narvo-border-r text-[11px] md:text-[12px] font-bold uppercase tracking-wider text-primary bg-background-dark font-mono">
                  {news.category || 'General'}
                </span>
                {news.tags?.slice(0, 1).map((tag, i) => (
                  <TagPill key={i} tag={tag} className="border-0 bg-background-dark text-primary text-[11px] md:text-[12px] px-2 md:px-3 py-1 tracking-wider" />
                ))}
              </div>
              <div className="flex items-center gap-4 mono-ui text-[11px] md:text-[12px] text-forest">
                <span className="flex items-center gap-1.5">
                  <Clock weight="bold" className="w-3 h-3" />
                  {readTime} MIN READ
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye weight="bold" className="w-3 h-3" />
                  {formatPublishedDate(news.published)}
                </span>
              </div>
            </div>

            {/* Headline — scales with accessibility font setting */}
            <h1 className="font-bold text-content leading-[1.1] tracking-tight mb-4 md:mb-6 font-display uppercase break-words min-w-0" data-testid="news-title">
              {news.title}
            </h1>

            {/* Lead — AI short_summary (concise) or fallback to summary; scales with font setting */}
            <p className="narvo-article-lead text-slate-300 font-light leading-relaxed font-display border-l-2 border-forest pl-4 md:pl-6 min-w-0 overflow-hidden break-words">
              {news.short_summary || news.summary}
            </p>
          </div>

          {/* Hero Image */}
          <figure className="mb-4 md:mb-8 narvo-border relative group">
            <img
              alt={news.title || 'Story'}
              className="w-full h-[200px] sm:h-[300px] md:h-[400px] object-cover opacity-90 grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
              src={news.image_url || '/narvo-icon-512.png'}
              loading="lazy"
              decoding="async"
              width={1200}
              height={400}
            />
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-background-dark narvo-border-t w-fit ml-auto">
              <figcaption className="mono-ui text-[11px] md:text-[12px] text-primary uppercase tracking-wider">
                FIG 1.0 — {news.source || 'Source'} / {news.category || 'General'}
              </figcaption>
            </div>
          </figure>

          {/* Mobile: Now Playing bar (redesigned) — only when this story is playing */}
          {isCurrentlyPlaying && (
            <div className="lg:hidden narvo-border bg-primary/15 border-primary mb-4 p-3 flex items-center gap-3" data-testid="mobile-now-playing-bar">
              <button
                onClick={() => playTrack(news)}
                className="min-w-[48px] min-h-[48px] flex items-center justify-center bg-primary text-background-dark hover:bg-white transition-colors shrink-0 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                aria-label={t('news_detail.pause')}
                data-testid="mobile-now-playing-pause"
              >
                <Pause weight="fill" className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="mono-ui text-[10px] text-primary font-bold uppercase tracking-widest">
                  {t('news_detail.now_playing')}
                </span>
                <span className="font-display text-sm font-bold text-content uppercase tracking-tight truncate">
                  {news.title}
                </span>
              </div>
              <Broadcast weight="fill" className="w-5 h-5 text-primary shrink-0 animate-pulse" aria-hidden />
            </div>
          )}

          {/* Audio Controls Bar */}
          <div className="narvo-border bg-surface/30 p-3 md:p-5 mb-8 md:mb-12 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
            <button
              onClick={() => playTrack(news)}
              className={`min-w-[48px] min-h-[48px] md:w-12 md:h-12 flex items-center justify-center transition-all shrink-0 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${isCurrentlyPlaying ? 'bg-white text-background-dark' : 'bg-primary hover:bg-white text-background-dark'}`}
              data-testid="play-story-btn"
              aria-label={isCurrentlyPlaying ? t('news_detail.pause') : t('news_detail.play')}
            >
              {isCurrentlyPlaying ? <Pause weight="fill" className="w-5 h-5" /> : <Play weight="fill" className="w-5 h-5 ml-0.5" />}
            </button>
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <span className="mono-ui text-[11px] md:text-[12px] text-forest uppercase tracking-widest mb-1">
                {isCurrentlyPlaying ? t('news_detail.now_playing') : t('news_detail.narrative_audio')}
              </span>
              <span className="text-xs md:text-sm text-content font-display font-medium uppercase tracking-wide truncate break-words">
                {news.title}
              </span>
              <span className="mono-ui text-[10px] md:text-[11px] text-forest mt-0.5" data-testid="tts-voice-label">
                {t('news_detail.tts_voice')}: {(voiceModel || 'emma').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto sm:ml-auto">
              <button
                onClick={shareStory}
                className="narvo-border w-10 h-10 flex items-center justify-center text-forest hover:text-primary transition-colors"
                title="Share Story"
                data-testid="share-story-btn"
              >
                <ShareNetwork weight="bold" className="w-5 h-5" />
              </button>
              <button
                onClick={toggleBookmark}
                className={`narvo-border w-10 h-10 flex items-center justify-center transition-colors ${isBookmarked(news.id) ? 'text-primary border-primary' : 'text-forest hover:text-primary'}`}
                data-testid="bookmark-detail-btn"
              >
                {<BookmarkSimple weight={isBookmarked(news.id) ? "fill" : "regular"} className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Key Takeaways — always show section; content contained to prevent overflow */}
          <div className="narvo-border bg-transparent p-4 md:p-6 mb-8 md:mb-12 relative overflow-hidden min-w-0" data-testid="key-takeaways">
            <div className="absolute top-0 left-0 w-1 h-full bg-forest" />
            <h3 className="text-base md:text-lg font-bold text-content mb-3 md:mb-4 flex items-center gap-2 font-display uppercase tracking-tight">
              <Lightbulb weight="fill" className="text-primary w-4 h-4 md:w-5 md:h-5 shrink-0" />
              {t('news_detail.key_takeaways')}
            </h3>
            {news.key_takeaways?.length > 0 ? (
              <ul className="space-y-2 md:space-y-3 min-w-0">
                {news.key_takeaways.map((takeaway, i) => (
                  <li key={i} className="flex items-start gap-2 md:gap-3 text-slate-300 text-sm md:text-base leading-relaxed min-w-0">
                    <span className="mt-1.5 md:mt-2 w-1.5 h-1.5 bg-primary shrink-0" />
                    <span className="min-w-0 break-words">{takeaway}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mono-ui text-[11px] md:text-[12px] text-forest">{t('news_detail.no_key_takeaways')}</p>
            )}
          </div>

          {/* Article Body — detailed narrative; font scales with accessibility setting */}
          <article className="narvo-article-body prose prose-invert max-w-none min-w-0 overflow-hidden" data-testid="article-body">
            {hasDetailedBody ? narrativeParagraphs.map((para, i) => (
              <p key={i} className="text-slate-300 font-light leading-relaxed mb-4 md:mb-6 break-words">{para}</p>
            )) : (
              <p className="text-slate-300 font-light leading-relaxed break-words">{news.summary}</p>
            )}
          </article>

          {/* Source Attribution */}
          <div className="mt-8 md:mt-12 narvo-border bg-surface/20 p-4 md:p-6">
            <span className="mono-ui text-[11px] md:text-[12px] text-forest block mb-2 md:mb-3 font-bold tracking-widest">{t('news_detail.source_attribution')}</span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-content font-display font-bold text-sm md:text-base">{news.source}</span>
                <span className="mono-ui text-[11px] md:text-[12px] text-forest block mt-1">{formatPublishedDate(news.published)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={shareStory}
                  className="narvo-border px-3 md:px-4 py-2 mono-ui text-[11px] md:text-[12px] text-forest hover:text-primary flex items-center gap-2 transition-colors"
                  data-testid="share-source-btn"
                >
                  <ShareNetwork weight="bold" className="w-3 h-3" />
                  <span>{t('dashboard.share')}</span>
                </button>
                {news.source_url && (
                  <a 
                    href={news.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="narvo-border px-3 md:px-4 py-2 mono-ui text-[11px] md:text-[12px] text-forest hover:text-primary flex items-center gap-2 transition-colors"
                  >
                    <ArrowSquareOut weight="bold" className="w-3 h-3" />
                    <span>{t('news_detail.original_source')}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Article Metadata - visible only on smaller screens */}
          <MobileMetadata
            news={news}
            readTime={readTime}
            relatedNews={relatedNews}
            isBookmarked={isBookmarked}
            toggleBookmark={toggleBookmark}
            addToQueue={addToQueue}
            shareStory={shareStory}
            navigate={navigate}
            showAlert={showAlert}
            t={t}
            formatPublishedDate={formatPublishedDate}
          />
        </div>
      </section>

      {/* Right Sidebar: Related & Metadata - hidden on mobile/tablet */}
      <aside className="w-72 xl:w-80 hidden lg:flex flex-col narvo-border-l bg-background-dark shrink-0" data-testid="detail-sidebar">
        <div className="h-16 xl:h-20 flex items-center px-4 xl:px-6 narvo-border-b bg-surface/10">
          <span className="mono-ui text-[12px] xl:text-xs font-bold text-forest tracking-widest uppercase">{t('news_detail.article_metadata')}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 xl:p-6 space-y-6 xl:space-y-8 custom-scroll">
          {/* Truth Tag Display */}
          <div className="narvo-border bg-primary/5 p-3 xl:p-4 border-primary/30">
            <span className="mono-ui text-[11px] xl:text-[12px] text-forest block mb-2 xl:mb-3 font-bold tracking-widest">{t('news_detail.verification_status')}</span>
            <TruthTag storyId={news.id} />
          </div>

          {/* Article Info */}
          <div className="narvo-border bg-surface/20 p-3 xl:p-4">
            <span className="mono-ui text-[11px] xl:text-[12px] text-forest block mb-2 xl:mb-3 font-bold tracking-widest">{t('news_detail.signal_metadata')}</span>
            <div className="space-y-2 xl:space-y-3">
              <div className="flex justify-between mono-ui text-[11px] xl:text-[12px]">
                <span className="text-forest">{t('news_detail.category')}</span>
                <span className="text-primary font-bold">{news.category?.toUpperCase() || 'GENERAL'}</span>
              </div>
              <div className="flex justify-between mono-ui text-[11px] xl:text-[12px]">
                <span className="text-forest">{t('news_detail.source')}</span>
                <span className="text-content">{news.source?.toUpperCase() || 'UNKNOWN'}</span>
              </div>
              <div className="flex justify-between mono-ui text-[11px] xl:text-[12px]">
                <span className="text-forest">{t('news_detail.region')}</span>
                <span className="text-content">{news.region?.toUpperCase() || 'AFRICA'}</span>
              </div>
              <div className="flex justify-between mono-ui text-[11px] xl:text-[12px]">
                <span className="text-forest">{t('news_detail.read_time')}</span>
                <span className="text-primary font-bold">{readTime} MIN</span>
              </div>
              <div className="flex justify-between mono-ui text-[11px] xl:text-[12px]">
                <span className="text-forest">{t('news_detail.ai_synthesis')}</span>
                <span className="text-primary font-bold">{news.narrative ? t('news_detail.complete') : t('news_detail.pending')}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { addToQueue(news); showAlert({ type: 'sync', title: 'QUEUE_UPDATED', message: 'Added to playlist queue', code: 'Q_ADD', duration: 2000 }); }}
              className="flex-1 narvo-border py-2 mono-ui text-[11px] xl:text-[12px] text-forest hover:text-primary hover:border-primary flex items-center justify-center gap-2 transition-colors"
              data-testid="sidebar-queue-btn"
            >
              <Queue weight="bold" className="w-3 h-3" />
              QUEUE
            </button>
            <button
              onClick={shareStory}
              className="flex-1 narvo-border py-2 mono-ui text-[11px] xl:text-[12px] text-forest hover:text-primary hover:border-primary flex items-center justify-center gap-2 transition-colors"
              data-testid="sidebar-share-btn"
            >
              <ShareNetwork weight="bold" className="w-3 h-3" />
              SHARE
            </button>
            <button
              onClick={toggleBookmark}
              className={`flex-1 narvo-border py-2 mono-ui text-[11px] xl:text-[12px] flex items-center justify-center gap-2 transition-colors ${isBookmarked(news.id) ? 'text-primary border-primary' : 'text-forest hover:text-primary hover:border-primary'}`}
              data-testid="sidebar-bookmark-btn"
            >
              {<BookmarkSimple weight={isBookmarked(news.id) ? "fill" : "regular"} className="w-3 h-3" />}
              {isBookmarked(news.id) ? t('dashboard.saved') : t('dashboard.save')}
            </button>
          </div>

          {/* Tags */}
          {news.tags?.length > 0 && (
            <div>
              <span className="mono-ui text-[11px] xl:text-[12px] text-forest block mb-3 xl:mb-4 font-bold tracking-widest">{t('news_detail.signal_tags')}</span>
              <div className="flex flex-wrap gap-1.5 xl:gap-2">
                {news.tags.map((tag, i) => (
                  <TagPill key={i} tag={tag} className="xl:px-2 xl:text-[11px]" />
                ))}
              </div>
            </div>
          )}

          {/* Related / Recommended */}
          <div>
            <span className="mono-ui text-[11px] xl:text-[12px] text-forest block mb-3 xl:mb-4 font-bold tracking-widest">{t('news_detail.related_transmissions')}</span>
            {relatedNews.length > 0 ? (
              <div className="space-y-2 xl:space-y-3">
                {relatedNews.map((item) => (
                  <div
                    key={item.id}
                    className="narvo-border p-3 xl:p-4 cursor-pointer hover:bg-surface/40 transition-colors group"
                    onClick={() => navigate(`/news/${item.id}`)}
                    data-testid={`related-${item.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1 xl:mb-2">
                      <span className="mono-ui text-[10px] xl:text-[11px] text-primary">{item.source}</span>
                      <TruthTag storyId={item.id} compact />
                    </div>
                    <h4 className="text-xs xl:text-sm text-content font-display font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mono-ui text-[11px] xl:text-[12px] text-forest">{t('news_detail.no_related')}</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default NewsDetailPage;
