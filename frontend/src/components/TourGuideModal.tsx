import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { Icon } from '@phosphor-icons/react/lib';
import { X } from '@phosphor-icons/react/X';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { Broadcast } from '@phosphor-icons/react/Broadcast';
import { GearSix } from '@phosphor-icons/react/GearSix';
import { Headphones } from '@phosphor-icons/react/Headphones';
import { Waveform } from '@phosphor-icons/react/Waveform';
import { PlayCircle } from '@phosphor-icons/react/PlayCircle';
import { BookmarkSimple } from '@phosphor-icons/react/BookmarkSimple';
import { ChartLineUp } from '@phosphor-icons/react/ChartLineUp';
import { Lightning } from '@phosphor-icons/react/Lightning';
import { useContentSources } from '../contexts/ContentSourcesContext';

interface TourStep {
  target: string;
  title: string;
  body: string;
  tip?: string;
  icon: Icon;
}

function getTourSteps(totalSources: number): TourStep[] {
  const sourceLabel = totalSources > 0 ? `${totalSources}+ ` : '';
  return [
  {
    target: '[data-testid="nav-dashboard"]',
    title: 'LIVE_FEED',
    body: `Your personalized news stream powered by ${sourceLabel}RSS feeds and aggregator sources. Stories are sorted by recency and boosted by your interests.`,
    tip: 'Tap any story card to read the full article and generate an audio broadcast.',
    icon: Broadcast,
  },
  {
    target: '[data-testid="source-filter-toggle"]',
    title: 'SOURCE_FILTERS',
    body: 'Control your feed by toggling between ALL sources, RSS-only feeds, or aggregator articles from Mediastack and NewsData.io.',
    tip: 'Use the NEW/OLD sort button to flip between latest and oldest stories.',
    icon: Waveform,
  },
  {
    target: '[data-testid="featured-play-btn"]',
    title: 'AUDIO_PLAYBACK',
    body: 'Every story can be converted into an audio broadcast using AI voices. Hit the play button to listen while multitasking.',
    tip: 'Use the speed control (1x, 1.25x, 1.5x, 2x) on the audio player bar to adjust playback.',
    icon: PlayCircle,
  },
  {
    target: '[data-testid="nav-discover"]',
    title: 'DISCOVER',
    body: 'Explore curated podcasts from top shows, live African radio stations, and wire news from multiple aggregators.',
    tip: 'Search across all content types in one unified query from the search page.',
    icon: Headphones,
  },
  {
    target: '[data-testid="recommendations-section"]',
    title: 'FOR_YOU',
    body: 'Narvo learns from your listening history to recommend relevant stories. The more you listen, the smarter recommendations get.',
    tip: 'Your top categories and topics are analyzed with AI to surface stories you might have missed.',
    icon: Lightning,
  },
  {
    target: '[data-testid="featured-bookmark-btn"]',
    title: 'SAVE_&_BOOKMARK',
    body: 'Bookmark stories for later reading or save articles for offline access when you have no connectivity.',
    tip: 'View all saved and offline content in the Library (sidebar).',
    icon: BookmarkSimple,
  },
  {
    target: '[data-testid="mobile-nav-menu"]',
    title: 'INSIGHTS',
    body: 'History and Analytics live in one place. The History tab shows every broadcast you played; the Analytics tab shows listens, streak, and trends.',
    tip: 'Open the menu (☰) for Insights, Library, Briefing, and more.',
    icon: ChartLineUp,
  },
  {
    target: '[data-testid="nav-system"]',
    title: 'SETTINGS_HUB',
    body: 'Configure your voice model, broadcast language, sound theme, news interests, and notification preferences.',
    tip: 'Set your Interest Matrix in System Settings to prioritize specific news categories on your feed.',
    icon: GearSix,
  },
];
}

const STORAGE_KEY = 'narvo_tour_completed';
const STORAGE_SKIPPED_KEY = 'narvo_tour_skipped';
export const TOUR_EVENT = 'narvo-open-tour';

export function openTourGuide(): void {
  window.dispatchEvent(new Event(TOUR_EVENT));
}

export function resetTourGuide(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_SKIPPED_KEY);
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const TourGuideModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const location = useLocation();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const { getTotalSources } = useContentSources();
  const tourSteps = useMemo(() => getTourSteps(getTotalSources()), [getTotalSources]);

  const isDashboardArea = [
    '/dashboard',
    '/discover',
    '/search',
    '/briefing',
    '/library',
    '/insights',
    '/settings',
    '/system',
  ].some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (!isDashboardArea) return;
    const completed = localStorage.getItem(STORAGE_KEY);
    const skipped = localStorage.getItem(STORAGE_SKIPPED_KEY);
    if (!completed && !skipped) {
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isDashboardArea]);

  useEffect(() => {
    const handler = () => {
      setStep(0);
      setIsOpen(true);
    };
    window.addEventListener(TOUR_EVENT, handler);
    return () => window.removeEventListener(TOUR_EVENT, handler);
  }, []);

  const complete = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.removeItem(STORAGE_SKIPPED_KEY);
  }, []);

  const skip = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_SKIPPED_KEY, 'true');
  }, []);

  const next = () => {
    if (step < tourSteps.length - 1) setStep((s) => s + 1);
    else complete();
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  useEffect(() => {
    if (!isOpen) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
    const el = modalRef.current;
    if (el) {
      const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length) focusable[0].focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skip();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!focusable.length) return;
      const i = focusable.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (i <= 0) {
          e.preventDefault();
          focusable[focusable.length - 1].focus();
        }
      } else {
        if (i === -1 || i >= focusable.length - 1) {
          e.preventDefault();
          focusable[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousActiveRef.current && typeof previousActiveRef.current.focus === 'function') {
        previousActiveRef.current.focus();
      }
    };
  }, [isOpen, skip]);

  if (!isOpen) return null;

  const current = tourSteps[step];
  const Icon = current.icon;
  const progress = ((step + 1) / tourSteps.length) * 100;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
      data-testid="tour-guide-modal"
      aria-hidden="false"
    >
      <div className="absolute inset-0 bg-background-dark/90" onClick={skip} aria-hidden />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="relative w-full max-w-sm narvo-border bg-background-dark overflow-hidden animate-in fade-in zoom-in duration-300"
      >
        <div className="h-[1px] bg-forest">
          <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between px-4 py-4 md:px-6 md:py-4 border-b border-forest">
          <div className="flex items-center gap-3">
            <Broadcast weight="fill" className="w-5 h-5 text-primary shrink-0" aria-hidden />
            <span className="mono-ui text-[11px] text-content-secondary font-bold tracking-widest">NARVO_TOUR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono-ui text-[11px] text-content-dim-accessible">
              {step + 1}/{tourSteps.length}
            </span>
            <button
              type="button"
              onClick={skip}
              aria-label="Close tour"
              className="min-w-[48px] min-h-[48px] flex items-center justify-center -m-2 text-forest hover:text-content transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              data-testid="tour-close"
            >
              <X weight="bold" className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div className="w-12 h-12 narvo-border bg-primary/10 flex items-center justify-center shrink-0">
            <Icon weight="fill" className="w-6 h-6 text-primary" aria-hidden />
          </div>
          <div>
            <h3
              id="tour-title"
              className="font-display text-xl font-bold text-content uppercase tracking-tight"
              style={{ lineHeight: 1.25 }}
            >
              {current.title}
            </h3>
            <p
              id="tour-body"
              className="mt-2 mono-ui text-[12px] text-content-secondary leading-[1.5]"
              style={{ lineHeight: 'var(--line-height-body, 1.5)' }}
            >
              {current.body}
            </p>
            {current.tip && (
              <div className="mt-4 p-3 narvo-border bg-surface/50">
                <p className="mono-ui text-[11px] text-primary leading-[1.5]">TIP: {current.tip}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 pb-4 md:pb-6 list-none" role="tablist" aria-label="Tour steps">
          {tourSteps.map((_, i) => (
            <div key={i}>
              <button
                type="button"
                role="tab"
                aria-selected={i === step}
                aria-label={`Step ${i + 1} of ${tourSteps.length}`}
                onClick={() => setStep(i)}
                className="min-w-[48px] min-h-[48px] flex items-center justify-center transition-all focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                data-testid={`tour-dot-${i}`}
              >
                <span
                  className={`block transition-all ${i === step ? 'bg-primary w-4 h-1.5' : i < step ? 'bg-primary/40 w-1.5 h-1.5' : 'bg-forest/30 w-1.5 h-1.5'}`}
                  aria-hidden
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-4 md:px-6 md:py-4 border-t border-forest">
          <button
            type="button"
            onClick={skip}
            className="mono-ui text-[11px] text-content-dim-accessible hover:text-content-secondary min-h-[48px] flex items-center pr-2 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            data-testid="tour-skip"
          >
            [SKIP_TOUR]
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={prev}
                aria-label="Previous step"
                className="min-w-[48px] min-h-[48px] narvo-border flex items-center justify-center text-forest hover:text-content hover:border-forest transition-all focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                data-testid="tour-prev"
              >
                <ArrowLeft weight="bold" className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={next}
              aria-label={step === tourSteps.length - 1 ? 'Start listening' : 'Next step'}
              className="min-h-[48px] px-4 md:px-6 bg-primary text-background-dark narvo-border border-primary mono-ui text-[11px] font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              data-testid="tour-next"
            >
              {step === tourSteps.length - 1 ? '[START_LISTENING]' : '[NEXT]'}
              {step < tourSteps.length - 1 && <ArrowRight weight="bold" className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
