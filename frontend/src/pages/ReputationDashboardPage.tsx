import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from '@phosphor-icons/react/ShieldCheck';
import * as api from '../lib/api';

interface ReputationSource {
  source_key: string;
  display_name: string;
  score: number;
  region?: string | null;
  updated_at?: string | null;
}

export default function ReputationDashboardPage() {
  const { t } = useTranslation();
  const [sources, setSources] = useState<ReputationSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('api/sources/reputation');
        if (!res.ok) throw new Error('Failed to load reputation');
        const data = await res.json();
        if (!cancelled) setSources(data.sources || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto" role="status" aria-live="polite">
        <p className="mono-ui text-[11px] text-forest tracking-widest animate-pulse">LOADING…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto">
        <p className="text-content font-body text-sm leading-[var(--line-height-body)]" role="alert">{error}</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto min-h-0" data-testid="reputation-dashboard">
      <div className="md:flex md:items-start md:gap-8">
        <header className="mb-6 md:mb-8 md:w-56 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center justify-center w-12 h-12 narvo-border bg-surface/20" aria-hidden>
              <ShieldCheck weight="regular" className="w-6 h-6 text-primary" />
            </span>
            <h1 className="font-display text-xl md:text-2xl font-bold text-content uppercase tracking-tight" style={{ lineHeight: 'var(--line-height-heading)' }}>
              {t('reputation.title', 'Source Reputation')}
            </h1>
          </div>
          <p className="mono-ui text-[10px] md:text-[11px] text-forest tracking-widest" style={{ lineHeight: 1.5 }}>
            {t('reputation.subtitle', 'Authority scores used for Certainty Index and consensus.')}
          </p>
        </header>

        <div className="flex-1 min-w-0 narvo-border bg-surface/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="narvo-border-b">
                  <th className="mono-ui text-[10px] text-forest tracking-widest py-4 px-4 font-normal">SOURCE</th>
                  <th className="mono-ui text-[10px] text-forest tracking-widest py-4 px-4 w-28 font-normal">SCORE</th>
                  <th className="mono-ui text-[10px] text-forest tracking-widest py-4 px-4 hidden sm:table-cell font-normal">REGION</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((src, i) => (
                  <tr key={src.source_key + i} className="narvo-border-b last:border-b-0">
                    <td className="py-4 px-4">
                      <span className="font-display text-sm font-medium text-content">{src.display_name || src.source_key}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 min-w-[60px] bg-forest/10 overflow-hidden" style={{ border: '1px solid rgb(var(--color-border) / 0.3)' }}>
                          <div
                            className="h-full bg-primary transition-[width] duration-500"
                            style={{ width: `${Math.max(0, Math.min(100, src.score))}%` }}
                            role="progressbar"
                            aria-valuenow={src.score}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Score ${Math.round(src.score)} percent`}
                          />
                        </div>
                        <span className="mono-ui text-[11px] text-forest w-8 tabular-nums">{Math.round(src.score)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell mono-ui text-[11px] text-content-dim-accessible">{src.region ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
