'use client';

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Cloud,
  CloudRain,
  DollarSign,
  Loader2,
  Sun,
  CloudFog,
  Zap,
} from 'lucide-react';
import { COPY } from '@/lib/narvo-app-copy';
import {
  fetchMultiCityWeather,
  fetchNgnRates,
  formatNgnInt,
  type WidgetFxRow,
  type WidgetWeatherCity,
  weatherConditionLabel,
} from '@/lib/dashboard-widgets-api';
import { useVisibleIntervalRefetch } from '@/hooks/use-visible-interval-refetch';

const WEATHER_REFRESH_MS = 900_000;
const FX_REFRESH_MS = 1_800_000;

/** Modular card surface — Narvo_Design_Master: `--bg-card`, calm browse/dashboard context */
const STANDARD_CARD =
  'rounded-[24px] border border-narvo-ink/8 dark:border-white/10 bg-[var(--bg-card)] shadow-sm';

const MOBILE_AUTO_ADVANCE_MS = 3000;
const MOBILE_SLIDE_COUNT = 4;

export type DashboardMobileCarouselSlides = {
  clock: ReactNode;
  briefing: ReactNode;
};

type DashboardSidebarWidgetsProps =
  | { variant: 'sidebar' }
  | { variant: 'mobile'; mobileSlides: DashboardMobileCarouselSlides };

function WeatherGlyph({ code }: { code: number }) {
  if (code === 0) return <Sun className="h-4 w-4 shrink-0 text-narvo-butter" aria-hidden />;
  if (code <= 3) return <Sun className="h-4 w-4 shrink-0 text-narvo-butter/90" aria-hidden />;
  if (code <= 48) return <CloudFog className="h-4 w-4 shrink-0 text-narvo-ink/45 dark:text-white/45" aria-hidden />;
  if (code <= 67) return <CloudRain className="h-4 w-4 shrink-0 text-narvo-teal" aria-hidden />;
  if (code <= 82) return <CloudRain className="h-4 w-4 shrink-0 text-narvo-teal" aria-hidden />;
  if (code <= 99) return <Zap className="h-4 w-4 shrink-0 text-narvo-vermilion" aria-hidden />;
  return <Cloud className="h-4 w-4 shrink-0 text-narvo-ink/40 dark:text-white/40" aria-hidden />;
}

function WeatherBody({
  cities,
  error,
  dense,
}: {
  cities: WidgetWeatherCity[] | null;
  error: boolean;
  dense?: boolean;
}) {
  if (error) {
    return (
      <p className="text-xs text-narvo-ink/50 dark:text-white/45 leading-snug">
        {COPY.dashboard_widgets_error}
      </p>
    );
  }
  if (!cities) {
    return (
      <div className="flex items-center gap-2 text-narvo-ink/45 dark:text-white/40">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        <span className="text-xs">{COPY.dashboard_widgets_loading}</span>
      </div>
    );
  }
  return (
    <ul className={dense ? 'space-y-2' : 'space-y-2.5'}>
      {cities.map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between gap-3 text-sm text-narvo-ink/85 dark:text-white/80"
        >
          <div className="flex items-center gap-2 min-w-0">
            <WeatherGlyph code={c.code} />
            <div className="min-w-0">
              <p className="font-semibold truncate">{c.label}</p>
              <p className="text-[10px] font-mono uppercase tracking-wide text-narvo-ink/40 dark:text-white/38">
                {weatherConditionLabel(c.code)}
              </p>
            </div>
          </div>
          <span className="font-mono tabular-nums font-bold text-narvo-teal dark:text-narvo-mint shrink-0">
            {Number.isFinite(c.tempC) ? `${Math.round(c.tempC)}°C` : '—'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FxBody({ rows, error }: { rows: WidgetFxRow[] | null; error: boolean }) {
  if (error) {
    return (
      <p className="text-xs text-narvo-ink/50 dark:text-white/45 leading-snug">
        {COPY.dashboard_widgets_error}
      </p>
    );
  }
  if (!rows) {
    return (
      <div className="flex items-center gap-2 text-narvo-ink/45 dark:text-white/40">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        <span className="text-xs">{COPY.dashboard_widgets_loading}</span>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.code}
          title={r.label}
          className="flex items-baseline justify-between gap-2 text-sm border-b border-narvo-ink/[0.06] dark:border-white/[0.08] last:border-0 pb-2 last:pb-0"
        >
          <span className="font-mono text-[11px] font-bold text-narvo-ink/70 dark:text-white/65 shrink-0 w-9">
            {r.displayCode}
          </span>
          <span className="text-right min-w-0 flex-1 font-mono tabular-nums text-narvo-ink/88 dark:text-white/85">
            1 {r.displayCode} ≈{' '}
            <span className="font-bold text-narvo-vermilion dark:text-narvo-butter">
              ₦{formatNgnInt(r.ngnPerUnit)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardSidebarWidgets(props: DashboardSidebarWidgetsProps) {
  const variant = props.variant;
  const mobileSlides = props.variant === 'mobile' ? props.mobileSlides : undefined;

  const [weather, setWeather] = useState<WidgetWeatherCity[] | null>(null);
  const [fx, setFx] = useState<WidgetFxRow[] | null>(null);
  const [weatherErr, setWeatherErr] = useState(false);
  const [fxErr, setFxErr] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const loadWeather = useCallback(async () => {
    try {
      const w = await fetchMultiCityWeather();
      setWeather(w);
      setWeatherErr(false);
    } catch {
      setWeatherErr(true);
    }
  }, []);

  const loadFx = useCallback(async () => {
    try {
      const f = await fetchNgnRates();
      setFx(f);
      setFxErr(false);
    } catch {
      setFxErr(true);
    }
  }, []);

  useEffect(() => {
    void loadWeather();
    void loadFx();
  }, [loadWeather, loadFx]);

  useVisibleIntervalRefetch(() => void loadWeather(), { intervalMs: WEATHER_REFRESH_MS });
  useVisibleIntervalRefetch(() => void loadFx(), { intervalMs: FX_REFRESH_MS });

  const syncDotFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth <= 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setActiveSlide(Math.min(MOBILE_SLIDE_COUNT - 1, Math.max(0, i)));
  }, []);

  useEffect(() => {
    if (variant !== 'mobile' || reduceMotion || typeof window === 'undefined') return;
    const el = scrollRef.current;
    if (!el) return;

    const id = window.setInterval(() => {
      const track = scrollRef.current;
      if (!track || track.clientWidth <= 0) return;
      const w = track.clientWidth;
      const idx = Math.round(track.scrollLeft / w);
      const next = (idx + 1) % MOBILE_SLIDE_COUNT;
      track.scrollTo({ left: next * w, behavior: 'smooth' });
      setActiveSlide(next);
    }, MOBILE_AUTO_ADVANCE_MS);

    return () => window.clearInterval(id);
  }, [variant, reduceMotion]);

  const weatherBlock = (
    <section aria-labelledby="narvo-widgets-weather-heading">
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="h-4 w-4 text-narvo-teal dark:text-narvo-mint shrink-0" aria-hidden />
        <h3
          id="narvo-widgets-weather-heading"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-teal dark:text-narvo-mint"
        >
          {COPY.dashboard_widgets_weather_title}
        </h3>
      </div>
      <WeatherBody cities={weather} error={weatherErr} dense={variant === 'mobile'} />
    </section>
  );

  const fxBlock = (
    <section aria-labelledby="narvo-widgets-fx-heading">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="h-4 w-4 text-narvo-teal dark:text-narvo-mint shrink-0" aria-hidden />
        <h3
          id="narvo-widgets-fx-heading"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-teal dark:text-narvo-mint"
        >
          {COPY.dashboard_widgets_fx_title}
        </h3>
      </div>
      <FxBody rows={fx} error={fxErr} />
      <p className="mt-3 text-[10px] leading-snug text-narvo-ink/40 dark:text-white/35">
        {COPY.dashboard_widgets_fx_disclaimer}
      </p>
    </section>
  );

  if (variant === 'sidebar') {
    return (
      <div className={`${STANDARD_CARD} p-5 xl:p-6 space-y-5`}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-narvo-ink/38 dark:text-white/35">
          {COPY.dashboard_widgets_kicker}
        </p>
        {weatherBlock}
        <div className="h-px bg-narvo-ink/8 dark:bg-white/10" aria-hidden />
        {fxBlock}
      </div>
    );
  }

  if (!mobileSlides) return null;

  return (
    <div
      role="region"
      aria-label={COPY.dashboard_widgets_carousel_a11y}
      aria-roledescription="carousel"
      className="w-full min-w-0"
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-narvo-ink/38 dark:text-white/35 mb-2 px-0.5">
        {COPY.dashboard_widgets_kicker}
      </p>
      <div
        ref={scrollRef}
        onScroll={syncDotFromScroll}
        className="flex w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="min-w-full w-full shrink-0 snap-start snap-always box-border">
          <div className={`${STANDARD_CARD} p-4 min-h-[120px]`}>{mobileSlides.clock}</div>
        </div>
        <div className="min-w-full w-full shrink-0 snap-start snap-always box-border">
          <div className={`${STANDARD_CARD} p-4`}>{mobileSlides.briefing}</div>
        </div>
        <div className="min-w-full w-full shrink-0 snap-start snap-always box-border">
          <div className={`${STANDARD_CARD} p-4`}>{weatherBlock}</div>
        </div>
        <div className="min-w-full w-full shrink-0 snap-start snap-always box-border">
          <div className={`${STANDARD_CARD} p-4`}>{fxBlock}</div>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-3" aria-hidden="true">
        {Array.from({ length: MOBILE_SLIDE_COUNT }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === activeSlide
                ? 'bg-narvo-teal dark:bg-narvo-mint'
                : 'bg-narvo-ink/15 dark:bg-white/22'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
