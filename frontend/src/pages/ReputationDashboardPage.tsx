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
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <p className="mono-ui text-[11px] text-forest animate-pulse">LOADING...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <p className="text-content" role="alert">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6" data-testid="reputation-dashboard">
      <div className="flex items-center gap-3">
        <ShieldCheck weight="bold" className="w-8 h-8 text-primary" />
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-content uppercase tracking-tight">
            {t('reputation.title', 'Source Reputation')}
          </h1>
          <p className="mono-ui text-[10px] md:text-[11px] text-forest mt-0.5">
            {t('reputation.subtitle', 'Authority scores used for Certainty Index and consensus.')}
          </p>
        </div>
      </div>

      <div className="narvo-border bg-surface/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-forest/20">
                <th className="mono-ui text-[10px] text-forest uppercase tracking-widest py-3 px-4">Source</th>
                <th className="mono-ui text-[10px] text-forest uppercase tracking-widest py-3 px-4 w-28">Score</th>
                <th className="mono-ui text-[10px] text-forest uppercase tracking-widest py-3 px-4 hidden sm:table-cell">Region</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((src, i) => (
                <tr key={src.source_key + i} className="border-b border-forest/10 last:border-0">
                  <td className="py-3 px-4">
                    <span className="font-display text-sm font-medium text-content">{src.display_name || src.source_key}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 min-w-[60px] bg-forest/10 rounded overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min(100, src.score))}%` }}
                          role="progressbar"
                          aria-valuenow={src.score}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      <span className="mono-ui text-[11px] text-forest w-8">{Math.round(src.score)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell mono-ui text-[11px] text-forest/60">{src.region ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
