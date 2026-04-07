/**
 * Local persistence for theme + display toggles. Cloud sync uses `/api/me/settings` when JWT present.
 */

export type NarvoThemeChoice = 'light' | 'dark' | 'system';

const THEME_KEY = 'narvo-theme';
const UI_KEY = 'narvo-ui-settings';

export type NarvoLocalDisplayToggles = {
  haptic_sync: boolean;
  high_contrast: boolean;
  reduced_motion: boolean;
};

const DEFAULT_TOGGLES: NarvoLocalDisplayToggles = {
  haptic_sync: true,
  high_contrast: false,
  reduced_motion: false,
};

export function readStoredTheme(): NarvoThemeChoice {
  if (typeof window === 'undefined') return 'light';
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'light';
}

export function writeStoredTheme(t: NarvoThemeChoice): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, t);
  window.dispatchEvent(new Event('narvo-theme-changed'));
}

export function readDisplayToggles(): NarvoLocalDisplayToggles {
  if (typeof window === 'undefined') return { ...DEFAULT_TOGGLES };
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return { ...DEFAULT_TOGGLES };
    const p = JSON.parse(raw) as Partial<NarvoLocalDisplayToggles>;
    return {
      haptic_sync: typeof p.haptic_sync === 'boolean' ? p.haptic_sync : DEFAULT_TOGGLES.haptic_sync,
      high_contrast: typeof p.high_contrast === 'boolean' ? p.high_contrast : DEFAULT_TOGGLES.high_contrast,
      reduced_motion: typeof p.reduced_motion === 'boolean' ? p.reduced_motion : DEFAULT_TOGGLES.reduced_motion,
    };
  } catch {
    return { ...DEFAULT_TOGGLES };
  }
}

export function writeDisplayToggles(patch: Partial<NarvoLocalDisplayToggles>): NarvoLocalDisplayToggles {
  const next = { ...readDisplayToggles(), ...patch };
  if (typeof window !== 'undefined') {
    localStorage.setItem(UI_KEY, JSON.stringify(next));
    applyDisplayTogglesToDom(next);
    window.dispatchEvent(new Event('narvo-display-toggles-changed'));
  }
  return next;
}

export function applyDisplayTogglesToDom(t: NarvoLocalDisplayToggles): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('narvo-high-contrast', t.high_contrast);
  root.classList.toggle('narvo-reduced-motion', t.reduced_motion);
}
