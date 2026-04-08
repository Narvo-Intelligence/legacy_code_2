'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, X } from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';
import {
  isFeedbackHighlightPeriodActive,
  readFeedbackHintDismissed,
  writeFeedbackHintDismissed,
} from '@/lib/narvo-feedback-promo';
import { NarvoApiError, postFeedback, type PostFeedbackPayload } from '@/lib/narvo-api';

export type NarvoFeedbackPreset = {
  kind: 'story' | 'app';
  storyId?: string;
};

type NarvoFeedbackContextValue = {
  openFeedback: (preset?: NarvoFeedbackPreset) => void;
  dismissFeedbackHint: () => void;
  /** One-time hint banner under the header (until dismissed or user opens feedback). */
  feedbackHintShow: boolean;
};

const NarvoFeedbackContext = createContext<NarvoFeedbackContextValue | null>(null);

export function useNarvoFeedback(): NarvoFeedbackContextValue {
  const ctx = useContext(NarvoFeedbackContext);
  if (!ctx) {
    throw new Error('useNarvoFeedback must be used within NarvoFeedbackProvider');
  }
  return ctx;
}

function NarvoFeedbackDialog({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset: NarvoFeedbackPreset;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);

  const [kind, setKind] = useState<'story' | 'app'>(preset.kind);
  const [storyId, setStoryId] = useState(preset.storyId ?? '');
  const [category, setCategory] = useState<'general' | 'bug' | 'idea' | 'accuracy' | 'other'>('general');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<'idle' | 'ok' | 'err'>('idle');
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind(preset.kind);
    setStoryId(preset.storyId ?? '');
    setCategory('general');
    setMessage('');
    setContact('');
    setBusy(false);
    setBanner('idle');
    setFieldError(null);
  }, [open, preset.kind, preset.storyId]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) {
        el.showModal();
        queueMicrotask(() => firstFieldRef.current?.focus());
      }
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => onOpenChange(false);
    el.addEventListener('close', onClose);
    return () => el.removeEventListener('close', onClose);
  }, [onOpenChange]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFieldError(null);
    if (kind === 'story' && !storyId.trim()) {
      setFieldError(COPY.feedback_story_required);
      return;
    }
    const msg = message.trim();
    if (msg.length < 3) {
      setFieldError(COPY.feedback_message_too_short);
      return;
    }
    setBusy(true);
    setBanner('idle');
    try {
      await postFeedback({
        kind,
        message: msg,
        story_id: kind === 'story' ? storyId.trim() : undefined,
        category: category === 'general' ? undefined : category,
        contact_email: contact.trim() || undefined,
        client_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
      setBanner('ok');
      setMessage('');
      setTimeout(() => onOpenChange(false), 1600);
    } catch (err) {
      const detail =
        err instanceof NarvoApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : COPY.feedback_error;
      setBanner('err');
      console.error('[feedback]', detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[100] w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-narvo-ink/12 bg-[var(--bg-primary)] p-0 text-narvo-ink shadow-2xl backdrop:bg-black/45 dark:border-white/12 dark:text-white open:flex open:flex-col dark:backdrop:bg-black/60"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(ev) => {
        ev.preventDefault();
        onOpenChange(false);
      }}
    >
      <form onSubmit={(e) => void onSubmit(e)} className="flex max-h-[min(90dvh,640px)] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-narvo-ink/10 px-4 py-3 dark:border-white/10 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-serif text-lg font-semibold tracking-tight">
              {COPY.feedback_dialog_title}
            </h2>
            <p id={descId} className="mt-1 text-xs leading-relaxed text-narvo-ink/55 dark:text-white/50">
              {COPY.feedback_dialog_subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-narvo-ink/60 transition-colors hover:bg-narvo-ink/8 dark:text-white/55 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40"
            aria-label={COPY.feedback_close_a11y}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-widest text-narvo-teal dark:text-narvo-mint">
              {COPY.feedback_what_about}
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label={COPY.feedback_what_about}>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-narvo-ink/10 px-3 py-2 text-sm font-bold has-[:checked]:border-narvo-teal has-[:checked]:bg-narvo-teal/10 dark:border-white/12 dark:has-[:checked]:border-narvo-mint/50 dark:has-[:checked]:bg-narvo-mint/10">
                <input
                  type="radio"
                  name="fb-kind"
                  className="accent-narvo-teal"
                  checked={kind === 'app'}
                  onChange={() => setKind('app')}
                />
                {COPY.feedback_kind_app}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-narvo-ink/10 px-3 py-2 text-sm font-bold has-[:checked]:border-narvo-teal has-[:checked]:bg-narvo-teal/10 dark:border-white/12 dark:has-[:checked]:border-narvo-mint/50 dark:has-[:checked]:bg-narvo-mint/10">
                <input
                  type="radio"
                  name="fb-kind"
                  className="accent-narvo-teal"
                  checked={kind === 'story'}
                  onChange={() => setKind('story')}
                />
                {COPY.feedback_kind_story}
              </label>
            </div>
          </fieldset>

          {kind === 'story' ? (
            <div>
              <label htmlFor="narvo-fb-story" className="text-xs font-bold text-narvo-ink/70 dark:text-white/55">
                Story ID
              </label>
              <input
                id="narvo-fb-story"
                type="text"
                value={storyId}
                onChange={(e) => setStoryId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-narvo-ink/12 bg-white/80 px-3 py-2 text-sm dark:border-white/12 dark:bg-narvo-ink/40"
                autoComplete="off"
                aria-required="true"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="narvo-fb-cat" className="text-xs font-bold text-narvo-ink/70 dark:text-white/55">
              {COPY.feedback_category_label}
            </label>
            <select
              id="narvo-fb-cat"
              value={category ?? 'general'}
              onChange={(e) =>
                setCategory(e.target.value as 'general' | 'bug' | 'idea' | 'accuracy' | 'other')
              }
              className="mt-1 w-full rounded-xl border border-narvo-ink/12 bg-white/80 px-3 py-2 text-sm dark:border-white/12 dark:bg-narvo-ink/40"
            >
              <option value="general">{COPY.feedback_category_general}</option>
              <option value="bug">{COPY.feedback_category_bug}</option>
              <option value="idea">{COPY.feedback_category_idea}</option>
              <option value="accuracy">{COPY.feedback_category_accuracy}</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="narvo-fb-msg" className="text-xs font-bold text-narvo-ink/70 dark:text-white/55">
              {COPY.feedback_message_label}
            </label>
            <textarea
              ref={firstFieldRef}
              id="narvo-fb-msg"
              required
              minLength={3}
              maxLength={4000}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={COPY.feedback_message_placeholder}
              className="mt-1 w-full resize-y rounded-xl border border-narvo-ink/12 bg-white/80 px-3 py-2 text-sm dark:border-white/12 dark:bg-narvo-ink/40"
            />
          </div>

          <div>
            <label htmlFor="narvo-fb-email" className="text-xs font-bold text-narvo-ink/70 dark:text-white/55">
              {COPY.feedback_contact_label}
            </label>
            <input
              id="narvo-fb-email"
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={COPY.feedback_contact_placeholder}
              className="mt-1 w-full rounded-xl border border-narvo-ink/12 bg-white/80 px-3 py-2 text-sm dark:border-white/12 dark:bg-narvo-ink/40"
              autoComplete="email"
              name="narvo-feedback-email"
              suppressHydrationWarning
            />
          </div>

          {banner === 'ok' ? (
            <p className="text-sm font-medium text-narvo-teal dark:text-narvo-mint" role="status">
              {COPY.feedback_success}
            </p>
          ) : null}
          {banner === 'err' ? (
            <p className="text-sm font-medium text-narvo-vermilion" role="alert">
              {COPY.feedback_error}
            </p>
          ) : null}
          {fieldError ? (
            <p className="text-sm font-medium text-narvo-vermilion" role="alert">
              {fieldError}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-narvo-ink/10 px-4 py-3 dark:border-white/10 sm:px-5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] rounded-full px-4 text-sm font-bold text-narvo-ink/70 hover:bg-narvo-ink/6 dark:text-white/55 dark:hover:bg-white/8"
          >
            {COPY.feedback_cancel}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-[44px] rounded-full bg-narvo-teal px-5 text-sm font-bold text-white shadow-md shadow-narvo-teal/25 disabled:opacity-50 dark:bg-narvo-mint dark:text-narvo-ink"
          >
            {busy ? COPY.feedback_submitting : COPY.feedback_submit}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function NarvoFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<NarvoFeedbackPreset>({ kind: 'app' });
  const [feedbackHintShow, setFeedbackHintShow] = useState(false);

  useEffect(() => {
    setFeedbackHintShow(!readFeedbackHintDismissed());
  }, []);

  const dismissFeedbackHint = useCallback(() => {
    writeFeedbackHintDismissed();
    setFeedbackHintShow(false);
  }, []);

  const openFeedback = useCallback((p?: NarvoFeedbackPreset) => {
    writeFeedbackHintDismissed();
    setFeedbackHintShow(false);
    setPreset(p ?? { kind: 'app' });
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openFeedback, dismissFeedbackHint, feedbackHintShow }),
    [openFeedback, dismissFeedbackHint, feedbackHintShow]
  );

  return (
    <NarvoFeedbackContext.Provider value={value}>
      {children}
      <NarvoFeedbackDialog open={open} onOpenChange={setOpen} preset={preset} />
    </NarvoFeedbackContext.Provider>
  );
}

/** Slim one-time row under the main header bar (inside `NarvoFeedbackProvider`). */
export function NarvoFeedbackHintBanner() {
  const { feedbackHintShow, dismissFeedbackHint } = useNarvoFeedback();
  if (!feedbackHintShow) return null;
  return (
    <div
      className="border-b border-narvo-teal/20 bg-narvo-teal/[0.07] px-3 py-2.5 dark:border-narvo-mint/25 dark:bg-narvo-mint/[0.09] sm:px-5 lg:px-6"
      role="status"
    >
      <div className="mx-auto flex max-w-[1800px] w-full items-start gap-2 sm:items-center">
        <p className="min-w-0 flex-1 text-left text-[11px] leading-snug text-narvo-ink/85 sm:text-sm dark:text-white/78">
          {COPY.feedback_first_hint_body}
        </p>
        <button
          type="button"
          onClick={dismissFeedbackHint}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-narvo-ink/55 transition-colors hover:bg-narvo-ink/10 hover:text-narvo-ink dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label={COPY.feedback_first_hint_dismiss_a11y}
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Header control: opens feedback with story context when pathname is `/news/[id]`. */
export function NarvoFeedbackHeaderButton() {
  const pathname = usePathname();
  const { openFeedback } = useNarvoFeedback();
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    setShowPulse(isFeedbackHighlightPeriodActive());
  }, []);

  const onClick = () => {
    const m = pathname?.match(/^\/news\/([^/]+)/);
    const sid = m ? decodeURIComponent(m[1]) : undefined;
    if (sid) openFeedback({ kind: 'story', storyId: sid });
    else openFeedback({ kind: 'app' });
  };

  const onStoryPage = Boolean(pathname?.match(/^\/news\/[^/]+/));
  const ariaLabel = onStoryPage ? COPY.feedback_button_a11y_story : COPY.feedback_button_a11y;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex max-w-full min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-left shadow-none outline-none transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-narvo-teal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
    >
      <span
        className={`inline-flex items-center gap-1 text-narvo-vermilion sm:gap-1.5 ${showPulse ? 'narvo-feedback-inline-pulse' : ''}`}
      >
        <MessageSquare
          className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5"
          strokeWidth={2}
          aria-hidden
        />
        <span className="max-w-[3rem] truncate text-[10px] font-semibold uppercase tracking-wide sm:max-w-[3.5rem] sm:text-[11px]">
          {COPY.feedback_header_label}
        </span>
      </span>
    </button>
  );
}
