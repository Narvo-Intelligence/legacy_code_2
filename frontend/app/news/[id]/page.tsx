'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Pause,
  Share2,
  Clock,
  Globe2,
  ChevronRight,
  Info,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { TruthTag } from '@/components/TruthTag';
import { CertaintyMeter } from '@/components/CertaintyMeter';
import { SourceTimeline } from '@/components/SourceTimeline';
import { useOfflineDownload } from '@/components/OfflineDownloadContext';
import { DEFAULT_NEWS, type RelatedArticlePreview } from '@/lib/news-data';
import { COPY, libraryListenReadTimeLine } from '@/lib/narvo-app-copy';
import {
  fetchNewsDetail,
  fetchRelatedNews,
  formatFeedTimeLabel,
  getSharePageUrlForStory,
  NarvoApiError,
  pickAudioUrlFromDetail,
  type ApiNewsDetail,
  type ApiNewsListItem,
} from '@/lib/narvo-api';
import {
  confidenceFromDetail,
  sourcesCountFromDetail,
  truthTagFromDetail,
} from '@/lib/truth-map';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

type DetailView = {
  id: string;
  category: string;
  title: string;
  source: string;
  time: string;
  summary: string[];
  content: string;
  publishedAt: string;
  tags: string[];
  author: string;
  confidence: number;
  sourcesCount: number;
  truth: ReturnType<typeof truthTagFromDetail>;
  audioUrl?: string;
  sourcesUsed: string[];
};

function mapRelated(items: ApiNewsListItem[]): RelatedArticlePreview[] {
  return items.map((r) => ({
    id: r.id,
    title: r.title || 'Untitled',
    source: r.source || 'Narvo',
    time: formatFeedTimeLabel(r.published),
    category: (r.category || 'General').toUpperCase(),
  }));
}

function detailToView(d: ApiNewsDetail): DetailView {
  const takeaways = Array.isArray(d.key_takeaways) && d.key_takeaways.length > 0
    ? d.key_takeaways.map(String)
    : d.short_summary
      ? [String(d.short_summary)]
      : d.summary
        ? [String(d.summary)]
        : [''];
  const narrative = (d.narrative && String(d.narrative).trim()) || '';
  const content = narrative || String(d.summary || '');
  return {
    id: d.id,
    category: (d.category || 'General').toUpperCase(),
    title: d.title?.trim() || 'Untitled',
    source: d.source?.trim() || 'Narvo',
    time: formatFeedTimeLabel(d.published),
    summary: takeaways.filter(Boolean),
    content,
    publishedAt: d.published || new Date().toISOString(),
    tags: Array.isArray(d.truth_tags) ? d.truth_tags.map(String) : [],
    author: d.source?.trim() || 'Narvo Intelligence',
    confidence: confidenceFromDetail(d),
    sourcesCount: sourcesCountFromDetail(d),
    truth: truthTagFromDetail(d),
    audioUrl: pickAudioUrlFromDetail(d),
    sourcesUsed: Array.isArray(d.sources_used) ? d.sources_used.map(String) : [],
  };
}

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const { downloadStory, progressById, errorById, savedFlashId, clearError, retryStory } =
    useOfflineDownload();

  const [detail, setDetail] = useState<ApiNewsDetail | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticlePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    void Promise.all([
      fetchNewsDetail(id),
      fetchRelatedNews(id, 5).catch(() => [] as ApiNewsListItem[]),
    ])
      .then(([d, rel]) => {
        if (!cancelled) {
          setDetail(d);
          setRelatedArticles(mapRelated(Array.isArray(rel) ? rel : []));
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setRelatedArticles([]);
          if (e instanceof NarvoApiError && e.status === 404) setNotFound(true);
          else {
            const msg = e instanceof Error ? e.message : String(e);
            setLoadError(msg || COPY.news_load_failed);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const story: DetailView = useMemo(() => {
    if (detail) return detailToView(detail);
    if (notFound) {
      return {
        id,
        category: DEFAULT_NEWS.category,
        title: DEFAULT_NEWS.title,
        source: DEFAULT_NEWS.source,
        time: DEFAULT_NEWS.time,
        summary: DEFAULT_NEWS.summary,
        content: DEFAULT_NEWS.content,
        publishedAt: DEFAULT_NEWS.publishedAt,
        tags: DEFAULT_NEWS.tags,
        author: DEFAULT_NEWS.author,
        confidence: DEFAULT_NEWS.confidence,
        sourcesCount: DEFAULT_NEWS.sourcesCount,
        sourcesUsed: [],
        truth: {
          status: 'unverified' as const,
          sources: [DEFAULT_NEWS.source],
          details: DEFAULT_NEWS.summary[0],
        },
        audioUrl: undefined,
      };
    }
    if (loadError && !loading) {
      return {
        id,
        category: 'GENERAL',
        title: COPY.news_error_title,
        source: 'Narvo',
        time: '—',
        summary: [loadError],
        content: COPY.news_error_body,
        publishedAt: new Date().toISOString(),
        tags: [],
        author: 'Narvo',
        confidence: 0,
        sourcesCount: 0,
        sourcesUsed: [],
        truth: {
          status: 'unverified' as const,
          sources: [],
          details: loadError,
        },
        audioUrl: undefined,
      };
    }
    return {
      id,
      category: 'GENERAL',
      title: COPY.news_loading_title,
      source: 'Narvo',
      time: '—',
      summary: [''],
      content: '',
      publishedAt: new Date().toISOString(),
      tags: [],
      author: 'Narvo',
      confidence: 0,
      sourcesCount: 0,
      sourcesUsed: [],
      truth: {
        status: 'unverified' as const,
        sources: [],
        details: undefined,
      },
      audioUrl: undefined,
    };
  }, [detail, notFound, loadError, loading, id]);

  const isCurrentTrack = currentTrack?.id === story.id;
  const dlProgress = progressById[story.id];
  const dlError = errorById[story.id];
  const circumference = 2 * Math.PI * 10;
  const strokeDash =
    dlProgress != null ? circumference * (1 - dlProgress / 100) : circumference;

  const handlePlay = () => {
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playTrack({
        id: story.id,
        title: story.title,
        source: story.source,
        category: story.category,
        audioUrl: 'audioUrl' in story ? story.audioUrl : undefined,
      });
    }
  };

  const handleShare = async () => {
    const richUrl = getSharePageUrlForStory(story.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: story.title,
          text: `Check out this story on Narvo: ${story.title}`,
          url: richUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(richUrl);
      } catch {
        alert(COPY.news_share_unsupported);
      }
    }
  };

  const handleDownload = () => {
    clearError(story.id);
    void downloadStory({
      id: story.id,
      title: story.title,
      source: story.source,
      category: story.category,
      time: story.time,
    });
  };

  const handleRetryDownload = () => {
    retryStory({
      id: story.id,
      title: story.title,
      source: story.source,
      category: story.category,
      time: story.time,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-32 transition-colors">
      <nav className="sticky top-0 z-50 border-b border-narvo-ink/8 bg-narvo-cloud/85 backdrop-blur-md dark:border-white/10 dark:bg-narvo-ink/85 px-4 py-3 sm:px-6 sm:py-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-narvo-ink/5 dark:hover:bg-white/5 rounded-full transition-colors"
            aria-label={COPY.news_back_a11y}
          >
            <ArrowLeft size={24} aria-hidden />
          </button>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={dlProgress != null && dlProgress < 100}
              className="relative p-2 hover:bg-narvo-ink/5 dark:hover:bg-white/5 rounded-full transition-colors disabled:opacity-60"
              title={COPY.news_download_save}
              aria-label={dlProgress != null && dlProgress < 100 ? COPY.offline_downloading : COPY.news_download_save}
            >
              {dlProgress != null && dlProgress < 100 ? (
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24" aria-hidden>
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    className="stroke-narvo-ink/15 dark:stroke-white/15"
                    strokeWidth="2"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    className="stroke-narvo-teal"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDash}
                  />
                </svg>
              ) : (
                <Download size={20} />
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="p-2 hover:bg-narvo-ink/5 dark:hover:bg-white/5 rounded-full transition-colors"
              title={COPY.news_share_a11y}
              aria-label={COPY.news_share_a11y}
            >
              <Share2 size={20} aria-hidden />
            </button>
          </div>
        </div>
        {dlError ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-narvo-vermilion px-1">
            <span>{dlError}</span>
            <button type="button" onClick={handleRetryDownload} className="font-bold underline underline-offset-2">
              {COPY.offline_retry}
            </button>
          </div>
        ) : savedFlashId === story.id ? (
          <p
            className="flex items-center gap-2 text-xs font-medium text-narvo-teal dark:text-narvo-mint px-1"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 size={16} className="shrink-0" aria-hidden />
            {COPY.offline_saved}
          </p>
        ) : null}
      </nav>

      <main className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="mb-10 sm:mb-12">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-narvo-vermilion/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-narvo-vermilion">
              {story.category}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-narvo-ink/40 dark:text-white/40">
              <Clock size={14} aria-hidden /> {libraryListenReadTimeLine(story.time)}
            </span>
          </div>

          <h1 className="mb-8 font-serif text-[1.75rem] font-medium leading-[1.2] tracking-tight text-narvo-ink dark:text-white sm:text-4xl md:text-[2.5rem] md:leading-tight">
            {story.title}
          </h1>

          <div className="flex flex-col gap-4 rounded-[24px] border border-narvo-ink/10 bg-narvo-cloud/90 p-4 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.1)] dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:rounded-[28px] sm:p-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-narvo-mist text-narvo-ink/60 dark:bg-white/10 dark:text-white/60">
                <Globe2 size={20} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-narvo-ink dark:text-white">{story.source}</p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-narvo-ink/40 dark:text-white/40">
                  {COPY.news_source_label}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePlay}
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-narvo-vermilion px-6 py-3 text-sm font-bold text-white shadow-lg shadow-narvo-vermilion/25 transition-transform active:scale-[0.96] sm:px-7"
            >
              {isCurrentTrack && isPlaying ? (
                <Pause size={18} fill="currentColor" aria-hidden />
              ) : (
                <Play size={18} fill="currentColor" aria-hidden />
              )}
              <span>{isCurrentTrack && isPlaying ? COPY.news_pause_gist : COPY.news_play_gist}</span>
            </button>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.06 }}
          className="mb-10 rounded-[24px] border border-narvo-ink/10 bg-narvo-mist/40 p-6 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.08)] dark:border-white/10 dark:bg-white/[0.04] sm:mb-12 sm:rounded-[28px] sm:p-8"
          aria-labelledby="news-truth-heading"
        >
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <TruthTag
              status={story.truth.status}
              sources={story.truth.sources}
              details={story.truth.details}
              lastChecked={story.truth.lastChecked}
            />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-narvo-ink/40 dark:text-white/40">
              {COPY.news_truth_kicker}
            </span>
          </div>

          <h3
            id="news-truth-heading"
            className="mb-3 font-serif text-xl font-semibold tracking-tight text-narvo-ink dark:text-white sm:text-2xl"
          >
            {COPY.news_truth_headline}
          </h3>
          <p className="mb-8 max-w-xl text-sm leading-relaxed text-narvo-ink/60 dark:text-white/55">
            {COPY.news_truth_intro.replace('{n}', String(Math.max(0, story.sourcesCount)))}
          </p>

          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
            <CertaintyMeter value={story.confidence} variant="light" />
            <div className="rounded-2xl border border-narvo-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
              <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-narvo-ink/45 dark:text-white/45">
                {COPY.news_cross_checked}
              </p>
              <p className="font-serif text-2xl font-bold text-narvo-ink dark:text-white">
                {COPY.news_sources_count_label.replace('{n}', String(Math.max(0, story.sourcesCount)))}
              </p>
              <SourceTimeline
                className="mt-4"
                variant="light"
                sources={story.sourcesUsed.length > 0 ? story.sourcesUsed : story.truth.sources}
              />
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs leading-snug text-narvo-ink/45 dark:text-white/45">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>{COPY.news_confidence_footnote}</span>
          </p>
        </motion.section>

        <div className="mb-20 space-y-10 sm:space-y-12">
          <section>
            <h2 className="mb-5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint sm:mb-6">
              {COPY.news_takeaways_heading}
            </h2>
            <ul className="space-y-3 sm:space-y-4">
              {story.summary.map((point: string, i: number) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING, delay: 0.05 * i }}
                  className="flex gap-4 rounded-2xl border border-narvo-ink/[0.06] bg-white/90 p-4 dark:border-white/[0.08] dark:bg-white/[0.04] sm:p-5"
                >
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-narvo-teal/80 dark:bg-narvo-mint/80" />
                  <p className="leading-relaxed text-narvo-ink/80 dark:text-white/80">{point}</p>
                </motion.li>
              ))}
            </ul>
          </section>

          <section className="prose prose-narvo max-w-none dark:prose-invert">
            <h2 className="mb-5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint sm:mb-6">
              {COPY.news_body_heading}
            </h2>
            <div className="whitespace-pre-line font-serif text-base leading-[1.65] text-narvo-ink/75 dark:text-white/75 sm:text-lg">
              {story.content}
            </div>
          </section>
        </div>

        {relatedArticles.length > 0 ? (
          <section className="border-t border-narvo-ink/10 dark:border-white/10 pt-12 mb-12">
            <h2 className="text-2xl font-serif font-medium mb-8">{COPY.news_related_heading}</h2>
            <div className="grid gap-4">
              {relatedArticles.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  className="p-6 rounded-3xl bg-white dark:bg-white/5 border border-narvo-ink/5 dark:border-white/5 hover:border-narvo-teal/30 dark:hover:border-narvo-teal/30 transition-all group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <span className="font-mono text-[9px] font-bold tracking-widest text-narvo-vermilion uppercase">
                        {item.category}
                      </span>
                      <h4 className="font-serif font-medium text-lg mb-2 mt-1 group-hover:text-narvo-teal transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-narvo-ink/40 dark:text-white/40 font-medium">{item.source}</p>
                      <p className="text-[11px] text-narvo-ink/45 dark:text-white/40 mt-2 flex items-center gap-1">
                        <Clock size={12} aria-hidden /> {libraryListenReadTimeLine(item.time)}
                      </p>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-narvo-ink/20 dark:text-white/20 group-hover:text-narvo-teal transition-colors shrink-0"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="border-t border-narvo-ink/10 pt-12 dark:border-white/10">
          <h2 className="mb-6 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-narvo-ink/40 dark:text-white/40">
            {COPY.news_meta_heading}
          </h2>
          <div className="rounded-3xl border border-narvo-ink/[0.06] bg-narvo-cloud/50 p-6 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
                  {COPY.news_meta_author}
                </p>
                <p className="font-medium text-narvo-ink dark:text-white">{story.author}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
                  {COPY.news_meta_published}
                </p>
                <p className="font-medium text-narvo-ink dark:text-white">
                  {new Date(story.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'UTC',
                  })}
                </p>
              </div>
            </div>
            {story.tags && story.tags.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
                  {COPY.news_meta_tags}
                </p>
                <div className="flex flex-wrap gap-2">
                  {story.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-narvo-mist dark:bg-white/10 text-narvo-ink/60 dark:text-white/60 text-xs font-medium rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-narvo-ink/8 px-6 py-10 text-center dark:border-white/10 sm:mt-20 sm:py-12">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-ink/35 dark:text-white/35">
          {COPY.brand_subtitle}
        </p>
      </footer>
    </div>
  );
}
