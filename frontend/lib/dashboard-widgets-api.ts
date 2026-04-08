/**
 * Client-side widgets: Open-Meteo (weather) and public currency snapshot (NGN crosses).
 * No API keys; suitable for indicative / dashboard context only.
 */

export type WidgetWeatherCity = {
  id: string;
  label: string;
  tempC: number;
  code: number;
};

const WEATHER_CITIES: { id: string; label: string; lat: number; lon: number }[] = [
  { id: 'lagos', label: 'Lagos', lat: 6.5244, lon: 3.3792 },
  { id: 'abuja', label: 'Abuja', lat: 9.0579, lon: 7.4951 },
  { id: 'london', label: 'London', lat: 51.5074, lon: -0.1278 },
  { id: 'nyc', label: 'New York', lat: 40.7128, lon: -74.006 },
];

export type WidgetFxRow = {
  code: string;
  displayCode: string;
  label: string;
  /** NGN per 1 unit of foreign currency */
  ngnPerUnit: number;
};

/** WMO code → short condition label */
export function weatherConditionLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Mostly clear';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Storm';
  return '—';
}

export async function fetchMultiCityWeather(): Promise<WidgetWeatherCity[]> {
  const params = new URLSearchParams();
  for (const c of WEATHER_CITIES) {
    params.append('latitude', String(c.lat));
    params.append('longitude', String(c.lon));
  }
  params.set('current', 'temperature_2m,weather_code');
  params.set('timezone', 'auto');
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather_http');
  const rows = (await res.json()) as Array<{
    current?: { temperature_2m?: number; weather_code?: number };
  }>;
  if (!Array.isArray(rows) || rows.length !== WEATHER_CITIES.length) {
    throw new Error('weather_shape');
  }
  return WEATHER_CITIES.map((c, i) => {
    const cur = rows[i]?.current;
    return {
      id: c.id,
      label: c.label,
      tempC: Number(cur?.temperature_2m),
      code: Number(cur?.weather_code ?? 0),
    };
  });
}

const FX_TARGETS: { code: string; displayCode: string; label: string }[] = [
  { code: 'usd', displayCode: 'USD', label: 'US Dollar' },
  { code: 'eur', displayCode: 'EUR', label: 'Euro' },
  { code: 'gbp', displayCode: 'GBP', label: 'British Pound' },
];

/** NGN per 1 USD/EUR/GBP via community currency bundle on jsDelivr */
export async function fetchNgnRates(): Promise<WidgetFxRow[]> {
  const url =
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/ngn.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('fx_http');
  const data = (await res.json()) as { ngn?: Record<string, number> };
  const ngn = data.ngn;
  if (!ngn || typeof ngn !== 'object') throw new Error('fx_shape');

  return FX_TARGETS.map(({ code, displayCode, label }) => {
    const inv = ngn[code];
    const n = typeof inv === 'number' && inv > 0 ? 1 / inv : NaN;
    return { code, displayCode, label, ngnPerUnit: n };
  });
}

export function formatNgnInt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(n));
}
