'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Pause,
  Share2,
  ShieldCheck,
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
            setLoadError(msg || 'Could not load this story.');
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
        title: 'Something went wrong',
        source: 'Narvo',
        time: '—',
        summary: [loadError],
        content: 'Try again in a moment, or return home.',
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
      title: 'Loading…',
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
        alert('Sharing is not supported on this browser.');
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
    <div className="min-h-screen bg-[#f9f6ef] dark:bg-narvo-ink text-narvo-ink dark:text-white pb-32 transition-colors">
      <nav className="sticky top-0 z-50 bg-[#f9f6ef]/80 dark:bg-narvo-ink/80 backdrop-blur-md border-b border-narvo-ink/5 dark:border-white/5 px-6 py-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-narvo-ink/5 dark:hover:bg-white/5 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
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
              title="Share"
            >
              <Share2 size={20} />
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

      <main className="max-w-3xl mx-auto px-6 pt-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-full bg-narvo-vermilion/10 text-narvo-vermilion text-[10px] font-bold tracking-widest uppercase">
              {story.category}
            </span>
            <span className="text-xs text-narvo-ink/40 dark:text-white/40 font-medium flex items-center gap-1">
              <Clock size={14} aria-hidden /> {libraryListenReadTimeLine(story.time)}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-medium leading-tight mb-8">{story.title}</h1>

          <div className="flex items-center justify-between p-6 rounded-[32px] bg-white dark:bg-white/5 border border-narvo-ink/5 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-narvo-mist dark:bg-white/10 flex items-center justify-center text-narvo-ink/60 dark:text-white/60 shrink-0">
                <Globe2 size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-narvo-ink dark:text-white truncate">{story.source}</p>
                <p className="text-[10px] font-mono text-narvo-ink/40 dark:text-white/40 uppercase tracking-wider">
                  Original Source
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePlay}
              className="shrink-0 flex items-center gap-3 px-6 py-3 bg-narvo-vermilion text-white rounded-full font-bold hover:scale-105 transition-transform shadow-lg shadow-narvo-vermilion/20"
            >
              {isCurrentTrack && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              <span>{isCurrentTrack && isPlaying ? 'Pause Gist' : 'Hear the Gist'}</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12 p-8 rounded-[40px] bg-narvo-teal text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck size={120} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <TruthTag
                status={story.truth.status}
                sources={story.truth.sources}
                details={story.truth.details}
                lastChecked={story.truth.lastChecked}
              />
              <span className="text-xs font-medium text-white/60">Narvo Truth layer</span>
            </div>

            <h3 className="text-2xl font-serif font-medium mb-4">What we could verify</h3>
            <p className="text-white/70 text-sm mb-8 max-w-md">
              Narvo compared reporting from {story.sourcesCount} sources. Here is why we trust this story.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <CertaintyMeter value={story.confidence} />
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Cross-checked</p>
                <p className="text-2xl font-serif font-bold text-white">{story.sourcesCount} sources</p>
                <SourceTimeline
                  className="mt-4"
                  sources={
                    story.sourcesUsed.length > 0 ? story.sourcesUsed : story.truth.sources
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/40">
              <Info size={14} />
              <span>Confidence is based on source diversity and factual alignment.</span>
            </div>
          </div>
        </motion.div>

        <div className="space-y-12 mb-20">
          <section>
            <h2 className="text-xs font-mono font-bold text-narvo-vermilion uppercase tracking-[0.2em] mb-6">Key Takeaways</h2>
            <ul className="space-y-4">
              {story.summary.map((point: string, i: number) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex gap-4 p-5 rounded-2xl bg-white dark:bg-white/5 border border-narvo-ink/5 dark:border-white/5"
                >
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-narvo-vermilion shrink-0" />
                  <p className="text-narvo-ink/80 dark:text-white/80 leading-relaxed">{point}</p>
                </motion.li>
              ))}
            </ul>
          </section>

          <section className="prose prose-narvo dark:prose-invert max-w-none">
            <h2 className="text-xs font-mono font-bold text-narvo-vermilion uppercase tracking-[0.2em] mb-6">The Full Story</h2>
            <div className="text-lg leading-relaxed text-narvo-ink/70 dark:text-white/70 whitespace-pre-line font-serif">
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

        <section className="border-t border-narvo-ink/10 dark:border-white/10 pt-12">
          <h2 className="text-xs font-mono font-bold text-narvo-ink/40 dark:text-white/40 uppercase tracking-[0.2em] mb-6">Story Details</h2>
          <div className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-narvo-ink/5 dark:border-white/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-[10px] font-mono text-narvo-ink/40 dark:text-white/40 uppercase tracking-widest mb-1">Author</p>
                <p className="font-medium text-narvo-ink dark:text-white">{story.author}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-narvo-ink/40 dark:text-white/40 uppercase tracking-widest mb-1">Published</p>
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
                <p className="text-[10px] font-mono text-narvo-ink/40 dark:text-white/40 uppercase tracking-widest mb-2">Tags</p>
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

      <footer className="mt-20 px-8 py-12 text-center border-t border-narvo-ink/5 dark:border-white/5">
        <div className="flex items-center justify-center gap-2 text-narvo-ink/40 dark:text-white/40 font-mono text-[10px] tracking-widest uppercase">
          <CheckCircle2 size={14} />
          <span>Petrol Teal structures the signal</span>
        </div>
      </footer>
    </div>
  );
}
