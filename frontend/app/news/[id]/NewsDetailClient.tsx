'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Pause,
  Share2,
  MessageSquare,
  Clock,
  Globe2,
  ChevronRight,
  ChevronDown,
  Info,
  CheckCircle2,
  Download,
  Bookmark,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { AuthenticatedAppShell } from '@/components/app/AuthenticatedAppShell';
import { useNarvoFeedback } from '@/components/app/NarvoFeedbackProvider';
import { useAudioPlayer } from '@/components/AudioPlayerContext';
import { TruthTag } from '@/components/TruthTag';
import { CertaintyMeter } from '@/components/CertaintyMeter';
import { SourceTimeline } from '@/components/SourceTimeline';
import { useOfflineDownload } from '@/components/OfflineDownloadContext';
import { COPY, libraryListenReadTimeLine } from '@/lib/narvo-app-copy';
import {
  fetchNewsDetail,
  fetchRelatedNews,
  formatFeedTimeLabel,
  NarvoApiError,
  pickAudioUrlFromDetail,
  postTtsGenerate,
  type ApiNewsDetail,
  type ApiNewsListItem,
} from '@/lib/narvo-api';
import { storyUrlOnSite } from '@/lib/site-url';
import {
  confidenceFromDetail,
  sourcesCountFromDetail,
  truthTagFromDetail,
} from '@/lib/truth-map';
import { getPreferredBroadcastLanguage } from '@/lib/listening-preferences';
import { getSupabaseUserId } from '@/lib/supabase-browser';
import {
  addMyBookmark,
  getMyBookmarks,
  hasMeAuth,
  removeMyBookmark,
} from '@/lib/me-api';
import { loadPreferences, NARVO_ACCESS_TOKEN_CHANGED } from '@/lib/narvo-session';
import {
  migrateLegacyOnboardingVoice,
  onboardingRowForYarnVoice,
  ONBOARDING_LANG_ROWS,
} from '@/lib/onboarding-narrators';
import { useUserTableRealtime } from '@/hooks/useUserTableRealtime';
import { useNarvoAuthBridge } from '@/hooks/use-narvo-auth-bridge';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 20 };

type RelatedArticlePreview = {
  id: string;
  title: string;
  source: string;
  time: string;
  category: string;
};

type DetailView = {
  id: string;
  category: string;
  title: string;
  source: string;
  time: string;
  /** Primary AI short summary paragraph (`short_summary` or list `summary` fallback). */
  summaryParagraph: string;
  /** Bullet key takeaways when present (shown under / instead of a single paragraph). */
  summaryBullets: string[];
  /** Long narrative; shown only inside expanded “full article” when distinct from summary. */
  fullArticle: string;
  publishedAt: string;
  tags: string[];
  author: string;
  confidence: number;
  sourcesCount: number;
  truth: ReturnType<typeof truthTagFromDetail>;
  audioUrl?: string;
  sourcesUsed: string[];
  imageUrl?: string;
  audioByLang?: Record<string, string>;
  region?: string;
};

/** Text for on-demand TTS when `audio_by_lang` is not ready yet. */
function buildSpeakableText(d: ApiNewsDetail): string {
  const parts: string[] = [];
  const short = (d.short_summary && String(d.short_summary).trim()) || '';
  const nar = (d.narrative && String(d.narrative).trim()) || '';
  if (short) parts.push(short);
  if (nar) {
    const budget = 12000 - parts.join('\n\n').length;
    if (budget > 400) parts.push(nar.slice(0, Math.max(400, budget)));
  }
  if (parts.length === 0 && Array.isArray(d.key_takeaways) && d.key_takeaways.length > 0) {
    const joined = d.key_takeaways.map(String).filter(Boolean).join('. ');
    if (joined) parts.push(joined.endsWith('.') ? joined : `${joined}.`);
  }
  const summaryFallback = (d.summary && String(d.summary).trim()) || '';
  if (parts.length === 0 && summaryFallback) parts.push(summaryFallback);
  return parts.join('\n\n').trim();
}

function normDetailText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function mapRelated(items: ApiNewsListItem[]): RelatedArticlePreview[] {
  return items.map((r) => ({
    id: r.id,
    title: r.title || 'Untitled',
    source: r.source || 'Narvo',
    time: formatFeedTimeLabel(r.published),
    category: (r.category || 'General').toUpperCase(),
  }));
}

function detailToView(d: ApiNewsDetail, preferredAudioLangCode: string): DetailView {
  const shortSummary = (d.short_summary && String(d.short_summary).trim()) || '';
  const listSummary = (d.summary && String(d.summary).trim()) || '';
  const narrative = (d.narrative && String(d.narrative).trim()) || '';
  const summaryBullets =
    Array.isArray(d.key_takeaways) && d.key_takeaways.length > 0
      ? d.key_takeaways.map(String).filter(Boolean)
      : [];

  let summaryParagraph = shortSummary;
  if (!summaryParagraph && summaryBullets.length === 0 && listSummary) {
    summaryParagraph = listSummary;
  }

  let fullArticle = '';
  if (narrative) {
    const nn = normDetailText(narrative);
    const sp = normDetailText(summaryParagraph);
    const ls = normDetailText(listSummary);
    const joinedBullets = normDetailText(summaryBullets.join(' '));
    const dup =
      nn === sp ||
      nn === ls ||
      (joinedBullets.length > 0 && nn === joinedBullets);
    if (!dup) {
      fullArticle = narrative;
    }
  }

  if (!summaryParagraph && summaryBullets.length === 0 && narrative) {
    summaryParagraph = narrative;
    fullArticle = '';
  }

  const img =
    typeof d.image_url === 'string' && d.image_url.trim().length > 0 ? d.image_url.trim() : undefined;
  const byLang =
    d.audio_by_lang && typeof d.audio_by_lang === 'object'
      ? Object.fromEntries(
          Object.entries(d.audio_by_lang).filter(
            ([, v]) => typeof v === 'string' && (v as string).trim().length > 0
          ) as [string, string][]
        )
      : undefined;
  return {
    id: d.id,
    category: (d.category || 'General').toUpperCase(),
    title: d.title?.trim() || 'Untitled',
    source: d.source?.trim() || 'Narvo',
    time: formatFeedTimeLabel(d.published),
    summaryParagraph,
    summaryBullets,
    fullArticle,
    publishedAt: d.published || new Date().toISOString(),
    tags: Array.isArray(d.truth_tags) ? d.truth_tags.map(String) : [],
    author: d.source?.trim() || 'Narvo Intelligence',
    confidence: confidenceFromDetail(d),
    sourcesCount: sourcesCountFromDetail(d),
    truth: truthTagFromDetail(d),
    audioUrl: pickAudioUrlFromDetail(d, preferredAudioLangCode),
    sourcesUsed: Array.isArray(d.sources_used) ? d.sources_used.map(String) : [],
    imageUrl: img,
    audioByLang: byLang && Object.keys(byLang).length > 0 ? byLang : undefined,
    region: typeof d.region === 'string' && d.region.trim() ? d.region.trim() : undefined,
  };
}

function NewsListeningCard() {
  const langCode = getPreferredBroadcastLanguage();
  const langRow =
    ONBOARDING_LANG_ROWS.find((r) => r.broadcastCode === langCode) ?? ONBOARDING_LANG_ROWS[0];
  const prefs = loadPreferences();
  const voice = prefs ? migrateLegacyOnboardingVoice(prefs.voice, prefs.language) : 'emma';
  const voiceRow = onboardingRowForYarnVoice(voice);

  return (
    <div className="rounded-2xl border border-narvo-ink/10 bg-narvo-mist/40 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-narvo-teal dark:text-narvo-mint">
        {COPY.news_listening_prefs_kicker}
      </p>
      <p className="mt-2 text-sm font-medium text-narvo-ink dark:text-white">
        {langRow.name} · {voiceRow?.narratorName ?? voiceRow?.name ?? '—'}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-narvo-ink/55 dark:text-white/50">
        {COPY.news_listening_prefs_hint}
      </p>
      <Link
        href="/settings?tab=voice"
        className="mt-3 inline-block text-xs font-bold text-narvo-teal dark:text-narvo-mint underline underline-offset-2 hover:no-underline"
      >
        {COPY.news_listening_change_link}
      </Link>
    </div>
  );
}

function NewsMetaBlock({
  story,
  sourceUrl,
  className = '',
}: {
  story: DetailView;
  sourceUrl?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-narvo-ink/10 bg-[var(--bg-card)]/80 p-5 dark:border-white/10 dark:bg-narvo-ink/35 ${className}`}
    >
      <h2 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-ink/40 dark:text-white/40">
        {COPY.news_meta_heading}
      </h2>
      <div className="space-y-4">
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
            {new Date(story.publishedAt).toLocaleString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        {story.region ? (
          <div>
            <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
              {COPY.news_meta_region}
            </p>
            <p className="font-medium text-narvo-ink dark:text-white">{story.region}</p>
          </div>
        ) : null}
        {sourceUrl?.trim() ? (
          <a
            href={sourceUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center text-sm font-bold text-narvo-teal dark:text-narvo-mint underline underline-offset-2"
          >
            {COPY.news_open_original}
          </a>
        ) : null}
        {story.tags && story.tags.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-narvo-ink/40 dark:text-white/40">
              {COPY.news_meta_tags}
            </p>
            <div className="flex flex-wrap gap-2">
              {story.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-narvo-mist px-3 py-1 text-xs font-medium text-narvo-ink/65 dark:bg-white/10 dark:text-white/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NewsTrustPanel({ story }: { story: DetailView }) {
  const sourcesForTimeline =
    story.sourcesUsed.length > 0 ? story.sourcesUsed : story.truth.sources;

  return (
    <div className="rounded-[24px] border border-narvo-ink/10 bg-narvo-mist/40 p-5 shadow-[0_12px_40px_-16px_rgba(23,50,74,0.08)] dark:border-white/10 dark:bg-white/[0.04] sm:rounded-[28px] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
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

      <h3 className="mb-2 font-serif text-lg font-semibold tracking-tight text-narvo-ink dark:text-white sm:text-xl">
        {COPY.news_truth_headline}
      </h3>
      <p className="mb-6 text-sm leading-relaxed text-narvo-ink/60 dark:text-white/55">
        {COPY.news_truth_intro.replace('{n}', String(Math.max(0, story.sourcesCount)))}
      </p>

      <CertaintyMeter value={story.confidence} variant="light" className="mb-6" />

      <div className="rounded-2xl border border-narvo-ink/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
        <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-narvo-ink/45 dark:text-white/45">
          {COPY.news_cross_checked}
        </p>
        <p className="font-serif text-xl font-bold text-narvo-ink dark:text-white">
          {COPY.news_sources_count_label.replace('{n}', String(Math.max(0, story.sourcesCount)))}
        </p>
        <SourceTimeline className="mt-4" variant="light" sources={sourcesForTimeline} />
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-snug text-narvo-ink/45 dark:text-white/45">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>{COPY.news_confidence_footnote}</span>
      </p>
    </div>
  );
}

function RelatedList({
  items,
  compact,
}: {
  items: RelatedArticlePreview[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className={compact ? 'space-y-2' : 'grid gap-4'}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/news/${item.id}`}
          className={
            compact
              ? 'flex items-start gap-2 rounded-xl border border-narvo-ink/8 p-3 transition-colors hover:border-narvo-teal/35 dark:border-white/10 dark:hover:border-narvo-mint/35'
              : 'group rounded-3xl border border-narvo-ink/5 bg-white p-6 transition-all hover:border-narvo-teal/30 dark:border-white/5 dark:bg-white/5 dark:hover:border-narvo-teal/30'
          }
        >
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-narvo-vermilion">
              {item.category}
            </span>
            <h4
              className={`font-serif font-medium group-hover:text-narvo-teal dark:group-hover:text-narvo-mint ${compact ? 'mt-0.5 text-sm leading-snug' : 'mb-2 mt-1 text-lg'}`}
            >
              {item.title}
            </h4>
            {!compact ? <p className="text-xs font-medium text-narvo-ink/40 dark:text-white/40">{item.source}</p> : null}
            <p className={`text-[11px] text-narvo-ink/45 dark:text-white/40 ${compact ? 'mt-1' : 'mt-2'} flex items-center gap-1`}>
              <Clock size={12} aria-hidden /> {libraryListenReadTimeLine(item.time)}
            </p>
          </div>
          <ChevronRight
            size={compact ? 16 : 20}
            className="shrink-0 text-narvo-ink/25 transition-colors group-hover:text-narvo-teal dark:text-white/25 dark:group-hover:text-narvo-mint"
          />
        </Link>
      ))}
    </div>
  );
}

/**
 * Sticky sidebar scroll area: full viewport column height with bottom fade + label when more content exists below.
 */
function SidebarScrollRegion({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [showMoreHint, setShowMoreHint] = React.useState(false);

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const epsilon = 12;
    setShowMoreHint(scrollHeight > clientHeight + epsilon && scrollTop + clientHeight < scrollHeight - epsilon);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, children]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={ref}
        onScroll={update}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-5 sm:py-6 [-webkit-overflow-scrolling:touch]"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="space-y-8">{children}</div>
      </div>
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-14 rounded-b-[inherit] bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)]/92 to-transparent transition-opacity duration-200 ${
          showMoreHint ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute bottom-2 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-narvo-ink/45 transition-opacity duration-200 dark:text-white/45 ${
          showMoreHint ? 'opacity-100' : 'opacity-0'
        }`}
        aria-live="polite"
      >
        <ChevronDown size={12} className="shrink-0" aria-hidden />
        <span>{COPY.news_sidebar_more_below}</span>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-hidden>
      <div className="h-6 w-24 rounded-full bg-narvo-ink/10 dark:bg-white/10" />
      <div className="h-10 w-full max-w-2xl rounded-xl bg-narvo-ink/10 dark:bg-white/10" />
      <div className="aspect-[2/1] w-full max-w-3xl rounded-[24px] bg-narvo-ink/10 dark:bg-white/10" />
      <div className="h-32 w-full rounded-[24px] bg-narvo-ink/10 dark:bg-white/10" />
      <div className="h-48 w-full rounded-[24px] bg-narvo-ink/10 dark:bg-white/10" />
    </div>
  );
}

/** Renders under `AuthenticatedAppShell` → `NarvoFeedbackProvider` only (hook must not run on parent). */
function StoryFeedbackActionButton({ storyId }: { storyId: string }) {
  const { openFeedback } = useNarvoFeedback();
  return (
    <button
      type="button"
      onClick={() => openFeedback({ kind: 'story', storyId })}
      className="flex h-11 w-11 items-center justify-center rounded-full text-narvo-ink/60 dark:text-white/55 hover:bg-narvo-ink/5 dark:hover:bg-white/10 transition-colors"
      title={COPY.news_feedback_story_a11y}
      aria-label={COPY.news_feedback_story_a11y}
    >
      <MessageSquare size={20} aria-hidden />
    </button>
  );
}

export function NewsDetailClient() {
  const params = useParams();
  const router = useRouter();
  const authBridge = useNarvoAuthBridge();
  const id = params.id as string;
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const { downloadStory, progressById, errorById, savedFlashId, clearError, retryStory } =
    useOfflineDownload();

  const [detail, setDetail] = useState<ApiNewsDetail | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticlePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [fetchGen, setFetchGen] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);
  const [fullArticleExpanded, setFullArticleExpanded] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const bumpFetch = useCallback(() => setFetchGen((g) => g + 1), []);

  useEffect(() => {
    const onAuth = () => bumpFetch();
    const onTok = () => bumpFetch();
    const onPrefs = () => bumpFetch();
    window.addEventListener('narvo-auth-changed', onAuth);
    window.addEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
    window.addEventListener('narvo-preferences-changed', onPrefs);
    return () => {
      window.removeEventListener('narvo-auth-changed', onAuth);
      window.removeEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
      window.removeEventListener('narvo-preferences-changed', onPrefs);
    };
  }, [bumpFetch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);

    const lang = getPreferredBroadcastLanguage();

    void (async () => {
      const uid = await getSupabaseUserId();
      try {
        const [d, rel] = await Promise.all([
          fetchNewsDetail(id, { language: lang, userId: uid ?? undefined }),
          fetchRelatedNews(id, 5).catch(() => [] as ApiNewsListItem[]),
        ]);
        if (!cancelled) {
          setDetail(d);
          setRelatedArticles(mapRelated(Array.isArray(rel) ? rel : []));
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setDetail(null);
          setRelatedArticles([]);
          if (e instanceof NarvoApiError && e.status === 404) setNotFound(true);
          else {
            const msg = e instanceof Error ? e.message : String(e);
            setLoadError(msg || COPY.news_load_failed);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, fetchGen]);

  /** Background refresh while prefill adds `audio_by_lang` (first open after synthesis). */
  useEffect(() => {
    if (!detail?.id) return;
    const abl = detail.audio_by_lang;
    if (abl && typeof abl === 'object' && Object.keys(abl).length > 0) return;
    const nar = typeof detail.narrative === 'string' ? detail.narrative.trim() : '';
    if (!nar) return;

    let cancelled = false;
    let attempts = 0;
    let tid: number | undefined;
    const maxAttempts = 12;
    const schedule = () => {
      if (cancelled) return;
      const delay = attempts === 0 ? 2500 : 4000;
      tid = window.setTimeout(async () => {
        if (cancelled) return;
        attempts += 1;
        if (attempts > maxAttempts) return;
        try {
          const uid = await getSupabaseUserId();
          const lang = getPreferredBroadcastLanguage();
          const d = await fetchNewsDetail(detail.id, { language: lang, userId: uid ?? undefined });
          if (cancelled) return;
          const nowAudio = d.audio_by_lang && Object.keys(d.audio_by_lang).length > 0;
          if (nowAudio || (d.narrative && String(d.narrative).trim() !== nar)) {
            setDetail(d);
            if (nowAudio) return;
          }
        } catch {
          /* ignore transient errors */
        }
        if (!cancelled) schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      if (tid !== undefined) window.clearTimeout(tid);
    };
  }, [detail?.id, detail?.narrative, detail?.audio_by_lang]);

  useEffect(() => {
    setFullArticleExpanded(false);
  }, [id]);

  const refreshBookmarkFlag = useCallback(() => {
    if (!hasMeAuth() || !id) {
      setBookmarked(false);
      return;
    }
    void getMyBookmarks().then((rows) => {
      setBookmarked(rows.some((r) => r.story_id === id));
    });
  }, [id]);

  useEffect(() => {
    refreshBookmarkFlag();
  }, [detail?.id, refreshBookmarkFlag]);

  useEffect(() => {
    const onTok = () => void refreshBookmarkFlag();
    window.addEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
    return () => window.removeEventListener(NARVO_ACCESS_TOKEN_CHANGED, onTok);
  }, [refreshBookmarkFlag]);

  useUserTableRealtime('bookmarks', refreshBookmarkFlag, hasMeAuth());

  const prefLang = getPreferredBroadcastLanguage();

  const story: DetailView | null = useMemo(() => {
    if (!detail) return null;
    return detailToView(detail, prefLang);
  }, [detail, prefLang]);

  const audioLangKeys = useMemo(() => {
    const m = story?.audioByLang;
    if (!m) return [];
    return Object.keys(m).filter((k) => typeof m[k] === 'string' && m[k]!.trim().length > 0);
  }, [story?.audioByLang]);

  const [preferredAudioLang, setPreferredAudioLang] = useState<string | null>(null);

  useEffect(() => {
    const m = detail?.audio_by_lang;
    if (!m || typeof m !== 'object') {
      setPreferredAudioLang(null);
      return;
    }
    const keys = Object.keys(m).filter(
      (k) => typeof (m as Record<string, string>)[k] === 'string' && String((m as Record<string, string>)[k]).trim()
    );
    const pref = getPreferredBroadcastLanguage();
    if (keys.includes(pref)) setPreferredAudioLang(pref);
    else if (keys.includes('en')) setPreferredAudioLang('en');
    else setPreferredAudioLang(keys[0] ?? null);
  }, [detail?.id, detail?.audio_by_lang]);

  useEffect(() => {
    setAudioError(null);
  }, [id, detail?.id, preferredAudioLang]);

  const resolvedAudioUrl = useMemo(() => {
    const m = detail?.audio_by_lang;
    if (m && preferredAudioLang && typeof m[preferredAudioLang] === 'string') {
      const u = m[preferredAudioLang].trim();
      if (u) return u;
    }
    return story?.audioUrl;
  }, [detail?.audio_by_lang, preferredAudioLang, story?.audioUrl]);

  const isCurrentTrack = story && currentTrack?.id === story.id;
  const dlProgress = story ? progressById[story.id] : undefined;
  const dlError = story ? errorById[story.id] : undefined;
  const circumference = 2 * Math.PI * 10;
  const strokeDash =
    dlProgress != null ? circumference * (1 - dlProgress / 100) : circumference;

  const handlePlay = async () => {
    if (!story || !detail) return;
    setAudioError(null);

    let url = resolvedAudioUrl?.trim() || '';

    if (isCurrentTrack) {
      const sameStream =
        !url ||
        !currentTrack?.audioUrl?.trim() ||
        currentTrack.audioUrl.trim() === url;
      if (sameStream) {
        togglePlayPause();
        return;
      }
    }

    let detailForTts: ApiNewsDetail = detail;
    if (!url) {
      try {
        const uid = await getSupabaseUserId();
        const lang = preferredAudioLang ?? prefLang;
        const d = await fetchNewsDetail(id, { language: lang, userId: uid ?? undefined });
        detailForTts = d;
        setDetail(d);
        url = pickAudioUrlFromDetail(d, preferredAudioLang ?? lang)?.trim() || '';
      } catch {
        /* on-demand TTS below */
      }
    }

    if (!url) {
      const speakText = buildSpeakableText(detailForTts);
      if (!speakText) {
        setAudioError(COPY.news_audio_no_script);
        return;
      }
      setAudioBusy(true);
      try {
        const prefs = loadPreferences();
        const voiceId = prefs ? migrateLegacyOnboardingVoice(prefs.voice, prefs.language) : 'emma';
        const lang = (preferredAudioLang ?? prefLang).trim() || 'en';
        const res = await postTtsGenerate({
          text: speakText,
          voiceId,
          language: lang,
          storyId: story.id,
          skipTranslation: lang === 'en',
        });
        url = (res.audio_url || '').trim();
        if (!url) {
          setAudioError(COPY.news_audio_failed);
          return;
        }
      } catch {
        setAudioError(COPY.news_audio_failed);
        return;
      } finally {
        setAudioBusy(false);
      }
    }

    playTrack({
      id: story.id,
      title: story.title,
      source: story.source,
      category: story.category,
      audioUrl: url,
    });
  };

  const handleShare = async () => {
    if (!story) return;
    const shareUrl =
      typeof window !== 'undefined' ? window.location.href : storyUrlOnSite(story.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: story.title,
          text: `Check out this story on Narvo: ${story.title}`,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        alert(COPY.news_share_unsupported);
      }
    }
  };

  const handleDownload = () => {
    if (!story) return;
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
    if (!story) return;
    retryStory({
      id: story.id,
      title: story.title,
      source: story.source,
      category: story.category,
      time: story.time,
    });
  };

  const handleBookmarkToggle = async () => {
    if (!story || !detail) return;
    if (!authBridge.hydrated) return;
    if (!authBridge.hasApiToken) {
      setBookmarkToast(
        authBridge.hasSession ? COPY.news_bookmark_cloud_paused : COPY.news_bookmark_need_sign_in
      );
      setTimeout(() => setBookmarkToast(null), 4000);
      return;
    }
    setBookmarkBusy(true);
    setBookmarkToast(null);
    try {
      if (bookmarked) {
        await removeMyBookmark(story.id);
        setBookmarked(false);
        setBookmarkToast(COPY.news_bookmark_removed);
      } else {
        const summary =
          (Array.isArray(detail.key_takeaways) && detail.key_takeaways[0]?.toString()) ||
          detail.short_summary?.toString() ||
          detail.summary?.toString() ||
          '';
        await addMyBookmark({
          story_id: story.id,
          title: story.title,
          summary,
          narrative: typeof detail.narrative === 'string' ? detail.narrative : '',
          source: story.source,
          category: story.category || 'General',
          source_url: typeof detail.source_url === 'string' ? detail.source_url : '',
          image_url:
            typeof detail.image_url === 'string' && detail.image_url.trim()
              ? detail.image_url
              : null,
        });
        setBookmarked(true);
        setBookmarkToast(COPY.news_bookmark_added);
      }
    } catch {
      setBookmarkToast(COPY.news_load_failed);
    } finally {
      setBookmarkBusy(false);
      setTimeout(() => setBookmarkToast(null), 3500);
    }
  };

  const headerBack = (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-narvo-ink/10 dark:border-white/10 text-narvo-ink dark:text-white hover:bg-narvo-ink/5 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/35"
      aria-label={COPY.news_back_a11y}
    >
      <ArrowLeft size={22} aria-hidden />
    </button>
  );

  const storySubHeader =
    dlError && story ? (
      <div className="flex flex-wrap items-center gap-2 text-xs text-narvo-vermilion px-1">
        <span>{dlError}</span>
        <button type="button" onClick={handleRetryDownload} className="font-bold underline underline-offset-2">
          {COPY.offline_retry}
        </button>
      </div>
    ) : savedFlashId === story?.id ? (
      <p
        className="flex items-center gap-2 text-xs font-medium text-narvo-teal dark:text-narvo-mint px-1"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={16} className="shrink-0" aria-hidden />
        {COPY.offline_saved}
      </p>
    ) : bookmarkToast ? (
      <p className="text-xs text-narvo-ink/65 dark:text-white/55 px-1" role="status">
        {bookmarkToast}
      </p>
    ) : undefined;

  if (!loading && notFound) {
    return (
      <AuthenticatedAppShell
        header={{
          title: COPY.news_not_found_title,
          kicker: COPY.brand_subtitle,
          startAdornment: headerBack,
          endAdornment: (
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-bold text-narvo-teal dark:text-narvo-mint hover:underline"
            >
              {COPY.auth_back_home}
            </Link>
          ),
        }}
      >
        <main className="mx-auto max-w-md px-4 pt-16 text-center sm:px-6 sm:pt-24 pb-32">
          <h1 className="mb-4 font-serif text-2xl font-medium tracking-tight text-narvo-ink dark:text-white sm:text-3xl">
            {COPY.news_not_found_title}
          </h1>
          <p className="mb-10 text-sm leading-relaxed text-narvo-ink/60 dark:text-white/55">
            {COPY.news_not_found_body}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-narvo-vermilion px-8 py-3 text-sm font-bold text-white shadow-lg shadow-narvo-vermilion/25"
          >
            {COPY.auth_back_home}
          </Link>
        </main>
      </AuthenticatedAppShell>
    );
  }

  if (!loading && loadError && !detail) {
    return (
      <AuthenticatedAppShell
        header={{
          title: COPY.news_error_title,
          kicker: COPY.brand_subtitle,
          startAdornment: headerBack,
        }}
      >
        <main className="mx-auto max-w-lg px-4 pt-12 pb-32 sm:px-6 sm:pt-16">
          <p className="text-sm leading-relaxed text-narvo-ink/70 dark:text-white/60">{loadError}</p>
          <button
            type="button"
            onClick={() => bumpFetch()}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-narvo-teal/40 px-6 py-2.5 text-sm font-bold text-narvo-teal dark:text-narvo-mint"
          >
            {COPY.offline_retry}
          </button>
        </main>
      </AuthenticatedAppShell>
    );
  }

  if (loading && !story) {
    return (
      <AuthenticatedAppShell
        header={{
          title: COPY.news_loading_title,
          kicker: COPY.brand_subtitle,
          startAdornment: headerBack,
        }}
      >
        <main className="mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 sm:pt-10 lg:px-10 pb-32">
          <PageSkeleton />
        </main>
      </AuthenticatedAppShell>
    );
  }

  if (!story) return null;

  const sourceUrl = typeof detail?.source_url === 'string' ? detail.source_url : undefined;
  const storyDateline = new Date(story.publishedAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const storyContentActions = detail ? (
    <div
      role="toolbar"
      aria-label="Story actions"
      className="mb-8 flex flex-wrap items-center gap-0.5 border-y border-narvo-ink/15 bg-narvo-mist/30 px-0 py-1 dark:border-white/12 dark:bg-white/[0.03] sm:px-1"
    >
      <button
        type="button"
        onClick={() => void handleBookmarkToggle()}
        disabled={bookmarkBusy}
        className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors disabled:opacity-50 sm:rounded-sm ${
          bookmarked
            ? 'text-narvo-vermilion'
            : 'text-narvo-ink/60 dark:text-white/55 hover:bg-narvo-ink/5 dark:hover:bg-white/10'
        }`}
        title={bookmarked ? COPY.news_bookmark_remove_a11y : COPY.news_bookmark_a11y}
        aria-label={bookmarked ? COPY.news_bookmark_remove_a11y : COPY.news_bookmark_a11y}
        aria-pressed={bookmarked}
      >
        <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} aria-hidden />
      </button>
      <button
        type="button"
        onClick={handleDownload}
        disabled={dlProgress != null && dlProgress < 100}
        className="relative flex h-11 w-11 items-center justify-center rounded-md text-narvo-ink/60 transition-colors hover:bg-narvo-ink/5 disabled:opacity-60 dark:text-white/55 dark:hover:bg-white/10 sm:rounded-sm"
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
          <Download size={20} aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="flex h-11 w-11 items-center justify-center rounded-md text-narvo-ink/60 transition-colors hover:bg-narvo-ink/5 dark:text-white/55 dark:hover:bg-white/10 sm:rounded-sm"
        title={COPY.news_share_a11y}
        aria-label={COPY.news_share_a11y}
      >
        <Share2 size={20} aria-hidden />
      </button>
      <StoryFeedbackActionButton storyId={story.id} />
    </div>
  ) : null;

  return (
    <AuthenticatedAppShell
      header={{
        title: story.title,
        kicker: COPY.brand_subtitle,
        startAdornment: headerBack,
        subHeader: storySubHeader,
      }}
    >
      <main className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-28 sm:px-6 sm:pt-10 lg:px-10 lg:pb-24">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(360px,32%)] lg:items-stretch lg:gap-10 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-14">
          {/* —— Main column: article + consumption —— */}
          <article className="narvo-reading-surface min-w-0 lg:min-h-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING}
              className="mb-8 sm:mb-10"
            >
              <header className="border-t-[3px] border-narvo-ink pt-6 dark:border-white/85 sm:pt-8">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-narvo-ink/12 pb-4 dark:border-white/10 sm:mb-6 sm:pb-5">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-narvo-vermilion">
                      {story.category}
                    </span>
                    {story.region ? (
                      <>
                        <span className="hidden h-3 w-px bg-narvo-ink/20 sm:block dark:bg-white/20" aria-hidden />
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-narvo-ink/50 dark:text-white/45">
                          {story.region}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3 text-narvo-ink/45 dark:text-white/40">
                    <time
                      className="font-mono text-[10px] uppercase tracking-[0.14em]"
                      dateTime={story.publishedAt}
                    >
                      {storyDateline}
                    </time>
                    <span className="hidden h-3 w-px bg-narvo-ink/20 sm:block dark:bg-white/20" aria-hidden />
                    <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
                      <Clock size={12} aria-hidden /> {libraryListenReadTimeLine(story.time)}
                    </span>
                  </div>
                </div>

                <h1 className="font-serif text-[1.75rem] font-semibold leading-[1.06] tracking-[-0.02em] text-narvo-ink dark:text-white sm:text-4xl md:text-[2.6rem]">
                  {story.title}
                </h1>
                <div className="mt-4 space-y-1 border-b-2 border-narvo-ink/80 pb-4 dark:border-white/70 sm:mt-5 sm:pb-5">
                  <div className="h-px w-full max-w-[4.5rem] bg-narvo-vermilion/90" aria-hidden />
                </div>

                <p className="mt-4 text-sm leading-snug text-narvo-ink/70 dark:text-white/65">
                  <span className="font-semibold text-narvo-ink dark:text-white">{story.source}</span>
                  {story.author && story.author !== story.source ? (
                    <>
                      <span className="text-narvo-ink/35 dark:text-white/35"> · </span>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-narvo-ink/50 dark:text-white/45">
                        {story.author}
                      </span>
                    </>
                  ) : null}
                </p>
              </header>

              {storyContentActions}

              {story.imageUrl ? (
                <figure className="mb-7 sm:mb-8">
                  <div className="relative aspect-[16/9] w-full max-h-[min(48vh,440px)] overflow-hidden border border-narvo-ink/12 bg-narvo-mist/40 dark:border-white/12 dark:bg-white/[0.04] md:aspect-[2/1] md:max-h-[min(52vh,480px)]">
                    <Image
                      src={story.imageUrl}
                      alt={`${COPY.news_detail_image_alt}: ${story.title.slice(0, 80)}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 62vw"
                      unoptimized
                      priority={false}
                    />
                  </div>
                  <figcaption className="mt-3 max-w-2xl border-l-2 border-narvo-vermilion/70 pl-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-narvo-ink/50 dark:text-white/45">
                    {COPY.news_detail_image_alt}
                    <span className="mx-1.5 text-narvo-ink/25 dark:text-white/25">—</span>
                    {story.source}
                  </figcaption>
                </figure>
              ) : null}

              <div className="sticky top-0 z-[4] -mx-1 mb-6 sm:static sm:mx-0 sm:mb-8">
                <div className="flex flex-col gap-4 border border-narvo-ink/12 border-l-4 border-l-narvo-vermilion bg-[var(--bg-card)] p-4 shadow-[0_12px_40px_-18px_rgba(23,50,74,0.2)] dark:border-white/12 dark:shadow-black/25 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 sm:shadow-md">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-narvo-ink/10 bg-narvo-mist/80 text-narvo-ink/55 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/55">
                      <Globe2 size={20} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base font-semibold text-narvo-ink dark:text-white">
                        {story.source}
                      </p>
                      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-narvo-ink/40 dark:text-white/40">
                        {COPY.news_source_label}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
                    {audioLangKeys.length > 1 ? (
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-narvo-ink/40 dark:text-white/40">
                          {COPY.news_audio_language_label}
                        </span>
                        {audioLangKeys.map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setPreferredAudioLang(code)}
                            className={`border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                              preferredAudioLang === code
                                ? 'border-narvo-teal bg-narvo-teal text-white dark:border-narvo-mint dark:bg-narvo-mint dark:text-narvo-ink'
                                : 'border-narvo-ink/12 bg-transparent text-narvo-ink/75 hover:bg-narvo-ink/[0.06] dark:border-white/15 dark:text-white/75 dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            {code.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handlePlay()}
                      disabled={audioBusy}
                      className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 bg-narvo-vermilion px-6 py-3 text-sm font-bold text-white shadow-md shadow-narvo-vermilion/25 transition-transform active:scale-[0.97] disabled:cursor-wait disabled:opacity-80 sm:px-7"
                    >
                      {audioBusy ? (
                        <Loader2 size={18} className="animate-spin" aria-hidden />
                      ) : isCurrentTrack && isPlaying ? (
                        <Pause size={18} fill="currentColor" aria-hidden />
                      ) : (
                        <Play size={18} fill="currentColor" aria-hidden />
                      )}
                      <span>
                        {audioBusy
                          ? COPY.news_audio_loading
                          : isCurrentTrack && isPlaying
                            ? COPY.news_pause_gist
                            : COPY.news_play_gist}
                      </span>
                    </button>
                    {audioError ? (
                      <p className="text-center text-xs font-medium text-narvo-vermilion dark:text-narvo-mint sm:text-right" role="alert">
                        {audioError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mobile / tablet: trust before long read */}
            <div className="mb-10 lg:hidden">
              <NewsTrustPanel story={story} />
            </div>

            <div className="mx-auto mb-16 w-full max-w-2xl space-y-10 sm:space-y-12 lg:mx-0 lg:mb-20 lg:max-w-[42rem] xl:max-w-[44rem]">
              {!story.summaryParagraph && story.summaryBullets.length === 0 && !story.fullArticle ? (
                <section className="rounded-2xl border border-dashed border-narvo-teal/30 bg-narvo-teal/[0.04] p-6 text-center dark:border-narvo-mint/25 dark:bg-narvo-mint/[0.06] sm:p-8">
                  <p className="text-sm leading-relaxed text-narvo-ink/75 dark:text-white/70">{COPY.news_content_preparing}</p>
                  <button
                    type="button"
                    onClick={() => bumpFetch()}
                    className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-narvo-teal/40 px-5 py-2 text-sm font-bold text-narvo-teal dark:border-narvo-mint/50 dark:text-narvo-mint"
                  >
                    {COPY.offline_retry}
                  </button>
                </section>
              ) : null}
              {story.summaryParagraph || story.summaryBullets.length > 0 ? (
                <section className="border-t border-narvo-ink/10 pt-8 dark:border-white/10 sm:pt-10">
                  <div className="mb-6 flex items-center gap-3 sm:mb-7">
                    <span className="h-px w-10 shrink-0 bg-narvo-teal/50 dark:bg-narvo-mint/50" aria-hidden />
                    <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-narvo-teal dark:text-narvo-mint">
                      {COPY.news_summary_heading}
                    </h2>
                    <span className="h-px min-w-[2rem] flex-1 bg-narvo-ink/10 dark:bg-white/10" aria-hidden />
                  </div>
                  {story.summaryParagraph ? (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING}
                      className="mb-7 border-l-2 border-narvo-teal/45 pl-4 text-lg font-medium leading-snug tracking-[-0.01em] text-narvo-ink/92 first-letter:float-left first-letter:mr-2 first-letter:mt-0.5 first-letter:font-serif first-letter:text-[2.35rem] first-letter:font-bold first-letter:leading-none first-letter:text-narvo-vermilion dark:border-narvo-mint/40 dark:text-white/88 sm:mb-8 sm:pl-5 sm:text-xl"
                    >
                      {story.summaryParagraph}
                    </motion.p>
                  ) : null}
                  {story.summaryBullets.length > 0 ? (
                    <>
                      {story.summaryParagraph ? (
                        <h3 className="mb-4 border-b border-narvo-ink/10 pb-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-narvo-ink/50 dark:border-white/10 dark:text-white/45">
                          {COPY.news_key_points_subheading}
                        </h3>
                      ) : null}
                      <ul className="narvo-reading-takeaways divide-y divide-narvo-ink/[0.08] border border-narvo-ink/10 dark:divide-white/[0.08] dark:border-white/10">
                        {story.summaryBullets.map((point: string, i: number) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...SPRING, delay: 0.05 * i }}
                            className="flex gap-3 bg-[var(--bg-card)]/60 px-3 py-3.5 sm:gap-4 sm:px-4 sm:py-4 dark:bg-white/[0.02]"
                          >
                            <span
                              className="w-7 shrink-0 pt-0.5 text-right font-mono text-[11px] font-bold tabular-nums text-narvo-vermilion dark:text-narvo-vermilion"
                              aria-hidden
                            >
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <p className="min-w-0 flex-1 font-serif text-[0.95rem] leading-relaxed text-narvo-ink/85 dark:text-white/82 sm:text-base">
                              {point}
                            </p>
                          </motion.li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </section>
              ) : null}

              {story.fullArticle ? (
                <section className="border border-narvo-ink/12 bg-[var(--bg-card)]/70 p-4 dark:border-white/12 dark:bg-white/[0.03] sm:p-6">
                  <button
                    type="button"
                    id="news-full-article-toggle"
                    aria-expanded={fullArticleExpanded}
                    aria-controls="news-full-article-panel"
                    onClick={() => setFullArticleExpanded((v) => !v)}
                    className="flex w-full min-h-[52px] items-center justify-between gap-3 border border-narvo-teal/30 bg-narvo-teal/[0.05] px-4 py-3 text-left text-sm font-bold text-narvo-teal transition-colors hover:bg-narvo-teal/[0.09] dark:border-narvo-mint/35 dark:bg-narvo-mint/[0.06] dark:text-narvo-mint dark:hover:bg-narvo-mint/[0.1] sm:px-5"
                  >
                    <span>
                      {fullArticleExpanded
                        ? COPY.news_collapse_full_article
                        : COPY.news_expand_full_article}
                    </span>
                    <ChevronDown
                      size={22}
                      className={`shrink-0 transition-transform duration-200 ${
                        fullArticleExpanded ? 'rotate-180' : ''
                      }`}
                      aria-hidden
                    />
                  </button>
                  {fullArticleExpanded ? (
                    <div
                      id="news-full-article-panel"
                      role="region"
                      aria-labelledby="news-full-article-toggle"
                      className="prose prose-narvo mt-6 max-w-none dark:prose-invert"
                    >
                      <h2 className="mb-5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-narvo-teal dark:text-narvo-mint sm:mb-6">
                        {COPY.news_body_heading}
                      </h2>
                      <p className="mb-4 flex items-start gap-2 text-xs leading-snug text-narvo-ink/50 dark:text-white/45 not-prose">
                        <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
                        <span>{COPY.news_ai_synthesis_note}</span>
                      </p>
                      <div className="narvo-reading-body whitespace-pre-line text-base text-narvo-ink/75 dark:text-white/75 sm:text-lg">
                        {story.fullArticle}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>

            <div className="space-y-8 lg:hidden">
              <NewsListeningCard />
              <NewsMetaBlock story={story} sourceUrl={sourceUrl} />
              {relatedArticles.length > 0 ? (
                <section>
                  <h2 className="mb-4 font-serif text-xl font-medium text-narvo-ink dark:text-white">
                    {COPY.news_sidebar_related}
                  </h2>
                  <RelatedList items={relatedArticles} />
                </section>
              ) : null}
            </div>
          </article>

          {/* —— Desktop sidebar: stretches to row height so `sticky` has a tall containing block —— */}
          <aside className="relative hidden min-h-0 min-w-0 lg:block">
            <div
              className="sticky top-0 z-[5] flex w-full flex-col overflow-hidden rounded-[28px] border border-narvo-ink/10 bg-[var(--bg-card)]/90 shadow-[0_8px_40px_-12px_rgba(23,50,74,0.14)] dark:border-white/10 dark:bg-narvo-ink/40 dark:shadow-black/30"
              style={{
                height: 'calc(100dvh - 6.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
                maxHeight: 'calc(100dvh - 5.5rem)',
              }}
            >
              <SidebarScrollRegion>
                <NewsTrustPanel story={story} />
                <NewsListeningCard />
                <NewsMetaBlock story={story} sourceUrl={sourceUrl} />
                {relatedArticles.length > 0 ? (
                  <section>
                    <h2 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-ink/40 dark:text-white/40">
                      {COPY.news_sidebar_related}
                    </h2>
                    <RelatedList items={relatedArticles.slice(0, 5)} compact />
                  </section>
                ) : null}
              </SidebarScrollRegion>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-narvo-ink/10 bg-narvo-mist/40 dark:border-white/10 dark:bg-narvo-ink/25">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-10">
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:gap-x-8"
            aria-label={COPY.brand_name}
          >
            <Link
              href="/dashboard"
              className="min-h-[44px] inline-flex items-center text-sm font-semibold text-narvo-ink/75 transition-colors hover:text-narvo-teal dark:text-white/70 dark:hover:text-narvo-mint"
            >
              {COPY.dashboard_page_title}
            </Link>
            <Link
              href="/listen"
              className="min-h-[44px] inline-flex items-center text-sm font-semibold text-narvo-ink/75 transition-colors hover:text-narvo-teal dark:text-white/70 dark:hover:text-narvo-mint"
            >
              {COPY.listen_page_title}
            </Link>
            <Link
              href="/discover"
              className="min-h-[44px] inline-flex items-center text-sm font-semibold text-narvo-ink/75 transition-colors hover:text-narvo-teal dark:text-white/70 dark:hover:text-narvo-mint"
            >
              {COPY.discover_page_title}
            </Link>
            <Link
              href="/briefing"
              className="min-h-[44px] inline-flex items-center text-sm font-semibold text-narvo-ink/75 transition-colors hover:text-narvo-teal dark:text-white/70 dark:hover:text-narvo-mint"
            >
              {COPY.briefing_title}
            </Link>
            <Link
              href="/library"
              className="min-h-[44px] inline-flex items-center text-sm font-semibold text-narvo-ink/75 transition-colors hover:text-narvo-teal dark:text-white/70 dark:hover:text-narvo-mint"
            >
              {COPY.library_page_title}
            </Link>
            <Link
              href="/search"
              className="min-h-[44px] inline-flex items-center text-sm font-semibold text-narvo-ink/75 transition-colors hover:text-narvo-teal dark:text-white/70 dark:hover:text-narvo-mint"
            >
              {COPY.search_page_title}
            </Link>
            <Link
              href="/settings"
              className="min-h-[44px] inline-flex items-center text-sm font-semibold text-narvo-ink/75 transition-colors hover:text-narvo-teal dark:text-white/70 dark:hover:text-narvo-mint"
            >
              {COPY.settings_title}
            </Link>
          </nav>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-narvo-ink/8 pt-8 dark:border-white/10">
            <button
              type="button"
              className="min-h-[44px] px-1 text-xs font-medium text-narvo-ink/50 transition-colors hover:text-narvo-teal dark:text-white/45 dark:hover:text-narvo-mint"
            >
              {COPY.landing_footer_privacy}
            </button>
            <button
              type="button"
              className="min-h-[44px] px-1 text-xs font-medium text-narvo-ink/50 transition-colors hover:text-narvo-teal dark:text-white/45 dark:hover:text-narvo-mint"
            >
              {COPY.landing_footer_terms}
            </button>
            <button
              type="button"
              className="min-h-[44px] px-1 text-xs font-medium text-narvo-ink/50 transition-colors hover:text-narvo-teal dark:text-white/45 dark:hover:text-narvo-mint"
            >
              {COPY.landing_footer_contact}
            </button>
          </div>

          <p className="mt-6 text-center font-serif text-sm text-narvo-ink/55 dark:text-white/50">{COPY.brand_subtitle}</p>
          <p className="mt-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-ink/30 dark:text-white/30">
            {COPY.landing_footer_copyright}
          </p>
        </div>
      </footer>
    </AuthenticatedAppShell>
  );
}
