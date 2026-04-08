/**
 * Post-onboarding feature tour shown on first dashboard visit.
 * Copy lives in `narvo-app-copy`; this module defines the step model only.
 */

import { COPY } from '@/lib/narvo-app-copy';

export type FeatureTourStepId = 'briefing' | 'truth' | 'language' | 'notify';

export type FeatureTourStep = {
  id: FeatureTourStepId;
  title: string;
  /** One short paragraph — sets context before bullets. */
  lead: string;
  /** Tight, scannable points (2–3 per step). */
  bullets: readonly string[];
};

function step(
  id: FeatureTourStepId,
  title: string,
  lead: string,
  bullets: readonly string[]
): FeatureTourStep {
  return { id, title, lead, bullets };
}

/** Ordered steps for the dashboard feature tour. */
export function getFeatureTourSteps(): readonly FeatureTourStep[] {
  return [
    step(
      'briefing',
      COPY.tutorial_step_briefing_title,
      COPY.tutorial_step_briefing_lead,
      [COPY.tutorial_step_briefing_b1, COPY.tutorial_step_briefing_b2, COPY.tutorial_step_briefing_b3]
    ),
    step(
      'truth',
      COPY.tutorial_step_truth_title,
      COPY.tutorial_step_truth_lead,
      [COPY.tutorial_step_truth_b1, COPY.tutorial_step_truth_b2]
    ),
    step(
      'language',
      COPY.tutorial_step_language_title,
      COPY.tutorial_step_language_lead,
      [COPY.tutorial_step_language_b1, COPY.tutorial_step_language_b2]
    ),
    step(
      'notify',
      COPY.tutorial_step_notify_title,
      COPY.tutorial_step_notify_lead,
      [COPY.tutorial_step_notify_b1, COPY.tutorial_step_notify_b2]
    ),
  ];
}

export const FEATURE_TOUR_LS_KEY = 'narvo_feature_tutorial_v2_done';

/** Earlier tour — if set, treat as completed and fold into `FEATURE_TOUR_LS_KEY`. */
export const FEATURE_TOUR_LS_KEY_LEGACY = 'narvo_feature_tutorial_v1_done';

export function isFeatureTourDismissedInStorage(): boolean {
  if (typeof window === 'undefined') return true;
  if (localStorage.getItem(FEATURE_TOUR_LS_KEY) === '1') return true;
  if (localStorage.getItem(FEATURE_TOUR_LS_KEY_LEGACY) === '1') {
    localStorage.setItem(FEATURE_TOUR_LS_KEY, '1');
    return true;
  }
  return false;
}
