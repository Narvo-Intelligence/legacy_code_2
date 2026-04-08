/**
 * One-time feedback hint (localStorage) + time-boxed header pulse/badge after a UX release.
 * Bump FEEDBACK_HIGHLIGHT_RELEASE_ISO when shipping a noticeable feedback UI change.
 */

export const LS_FEEDBACK_HINT_DISMISSED = 'narvo-feedback-hint-dismissed';

/** ISO instant when the current feedback header treatment shipped; pulse/dot ends 7 days later. */
export const FEEDBACK_HIGHLIGHT_RELEASE_ISO = '2026-04-08T00:00:00.000Z';

const HIGHLIGHT_DAYS = 7;

function highlightEndMs(): number {
  const t = Date.parse(FEEDBACK_HIGHLIGHT_RELEASE_ISO);
  if (Number.isNaN(t)) return 0;
  return t + HIGHLIGHT_DAYS * 86400000;
}

/** Soft pulse + badge while within the post-release window (client-only check). */
export function isFeedbackHighlightPeriodActive(): boolean {
  if (typeof window === 'undefined') return false;
  return Date.now() < highlightEndMs();
}

export function readFeedbackHintDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(LS_FEEDBACK_HINT_DISMISSED) === '1';
  } catch {
    return true;
  }
}

export function writeFeedbackHintDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_FEEDBACK_HINT_DISMISSED, '1');
  } catch {
    /* ignore */
  }
}
