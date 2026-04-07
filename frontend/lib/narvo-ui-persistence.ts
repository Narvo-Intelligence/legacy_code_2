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

// —— Reading / typography (news detail + optional app-wide) — sync keys with `/api/me/settings` JSON

const READING_KEY = 'narvo-reading-appearance';

export type NarvoDisplayDensity = 'compact' | 'standard' | 'spacious';

/** Preset for article body typeface (design system–aware). */
export type NarvoArticleFontPreset = 'narvo_editorial' | 'readable_sans' | 'newspaper_serif';

/** `app` scales root `font-size`; `article` limits scaling to `.narvo-reading-surface`. */
export type NarvoReadingScope = 'article' | 'app';

export type NarvoReadingAppearance = {
  font_scale: number;
  display_density: NarvoDisplayDensity;
  article_font_preset: NarvoArticleFontPreset;
  reading_scope: NarvoReadingScope;
};

const DEFAULT_READING: NarvoReadingAppearance = {
  font_scale: 100,
  display_density: 'standard',
  article_font_preset: 'narvo_editorial',
  reading_scope: 'article',
};

function clampFontScale(n: number): number {
  if (Number.isNaN(n)) return DEFAULT_READING.font_scale;
  return Math.min(130, Math.max(85, Math.round(n)));
}

export function readReadingAppearance(): NarvoReadingAppearance {
  if (typeof window === 'undefined') return { ...DEFAULT_READING };
  try {
    const raw = localStorage.getItem(READING_KEY);
    if (!raw) return { ...DEFAULT_READING };
    const p = JSON.parse(raw) as Partial<NarvoReadingAppearance>;
    let display_density = p.display_density;
    if ((display_density as string) === 'expanded') display_density = 'spacious';
    return {
      font_scale: clampFontScale(Number(p.font_scale)),
      display_density:
        display_density === 'compact' || display_density === 'standard' || display_density === 'spacious'
          ? display_density
          : DEFAULT_READING.display_density,
      article_font_preset:
        p.article_font_preset === 'readable_sans' || p.article_font_preset === 'newspaper_serif'
          ? p.article_font_preset
          : p.article_font_preset === 'narvo_editorial'
            ? 'narvo_editorial'
            : DEFAULT_READING.article_font_preset,
      reading_scope: p.reading_scope === 'app' ? 'app' : DEFAULT_READING.reading_scope,
    };
  } catch {
    return { ...DEFAULT_READING };
  }
}

export function writeReadingAppearance(patch: Partial<NarvoReadingAppearance>): NarvoReadingAppearance {
  const prev = readReadingAppearance();
  const next: NarvoReadingAppearance = {
    font_scale: patch.font_scale != null ? clampFontScale(patch.font_scale) : prev.font_scale,
    display_density: patch.display_density ?? prev.display_density,
    article_font_preset: patch.article_font_preset ?? prev.article_font_preset,
    reading_scope: patch.reading_scope ?? prev.reading_scope,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(READING_KEY, JSON.stringify(next));
    applyReadingAppearanceToDom(next);
    window.dispatchEvent(new Event('narvo-reading-appearance-changed'));
  }
  return next;
}

export function applyReadingAppearanceToDom(r: NarvoReadingAppearance): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--narvo-reading-font-scale', String(r.font_scale / 100));
  root.dataset.narvoDensity = r.display_density;
  root.dataset.narvoArticleFont = r.article_font_preset;
  root.classList.toggle('narvo-reading-global', r.reading_scope === 'app');
}

/** After GET `/api/me/settings` — merge server keys into local reading prefs. */
export function hydrateReadingFromServer(settings: Record<string, unknown> | null | undefined): void {
  if (!settings || typeof settings !== 'object') return;
  const patch: Partial<NarvoReadingAppearance> = {};
  const fs = Number(settings.font_scale);
  if (fs >= 85 && fs <= 130) patch.font_scale = fs;
  let dd = settings.display_density;
  if (dd === 'expanded') dd = 'spacious';
  if (dd === 'compact' || dd === 'standard' || dd === 'spacious') patch.display_density = dd;
  const af = settings.article_font_preset;
  if (af === 'narvo_editorial' || af === 'readable_sans' || af === 'newspaper_serif') {
    patch.article_font_preset = af;
  }
  const rs = settings.reading_scope;
  if (rs === 'article' || rs === 'app') patch.reading_scope = rs;
  if (Object.keys(patch).length > 0) writeReadingAppearance(patch);
  else applyReadingAppearanceToDom(readReadingAppearance());
}
