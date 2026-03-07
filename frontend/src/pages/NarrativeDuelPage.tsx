import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Scales } from '@phosphor-icons/react/Scales';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import * as api from '../lib/api';

interface Discrepancy {
  type?: string;
  summary?: string;
  detail?: string;
  severity?: string;
}

interface DuelResult {
  discrepancies: Discrepancy[];
  summary?: string;
}

export default function NarrativeDuelPage() {
  const { t } = useTranslation();
  const [narrativeA, setNarrativeA] = useState('');
  const [narrativeB, setNarrativeB] = useState('');
  const [result, setResult] = useState<DuelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    setError(null);
    setResult(null);
    if (!narrativeA.trim() || !narrativeB.trim()) {
      setError(t('narrative_duel.empty', 'Paste both narratives to compare.'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('api/narrative/duel', { narrative_a: narrativeA, narrative_b: narrativeB });
      if (!res.ok) throw new Error('Comparison failed');
      const data = await res.json();
      setResult({ discrepancies: data.discrepancies || [], summary: data.summary });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6" data-testid="narrative-duel">
      <div className="flex items-center gap-3">
        <Scales weight="bold" className="w-8 h-8 text-primary" />
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-content uppercase tracking-tight">
            {t('narrative_duel.title', 'Narrative Duel')}
          </h1>
          <p className="mono-ui text-[10px] md:text-[11px] text-forest mt-0.5">
            {t('narrative_duel.subtitle', 'Compare two narratives for factual and tonal discrepancies.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="narvo-border bg-surface/10 p-4">
          <label className="mono-ui text-[10px] text-forest uppercase tracking-widest block mb-2">Narrative A</label>
          <textarea
            className="w-full h-40 bg-background-dark border border-forest/20 rounded p-3 mono-ui text-[11px] text-content placeholder:text-forest/50 resize-y focus:outline-none focus:border-primary"
            placeholder={t('narrative_duel.paste_a', 'Paste first narrative...')}
            value={narrativeA}
            onChange={(e) => setNarrativeA(e.target.value)}
            aria-label="Narrative A"
          />
        </div>
        <div className="narvo-border bg-surface/10 p-4">
          <label className="mono-ui text-[10px] text-forest uppercase tracking-widest block mb-2">Narrative B</label>
          <textarea
            className="w-full h-40 bg-background-dark border border-forest/20 rounded p-3 mono-ui text-[11px] text-content placeholder:text-forest/50 resize-y focus:outline-none focus:border-primary"
            placeholder={t('narrative_duel.paste_b', 'Paste second narrative...')}
            value={narrativeB}
            onChange={(e) => setNarrativeB(e.target.value)}
            aria-label="Narrative B"
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCompare}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-background-dark font-display font-bold uppercase tracking-wide hover:bg-primary/90 disabled:opacity-50 transition-colors"
          data-testid="narrative-duel-compare"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-background-dark border-t-transparent rounded-full animate-spin" aria-hidden />
          ) : (
            <ArrowRight weight="bold" className="w-4 h-4" />
          )}
          <span>{loading ? t('narrative_duel.comparing', 'Comparing...') : t('narrative_duel.compare', 'Compare')}</span>
        </button>
      </div>

      {error && (
        <p className="text-red-400 mono-ui text-[11px]" role="alert">{error}</p>
      )}

      {result && (
        <div className="narvo-border bg-surface/10 p-6 space-y-4">
          <h2 className="mono-ui text-[10px] text-forest uppercase tracking-widest">
            {t('narrative_duel.discrepancies', 'Discrepancies')} ({result.discrepancies.length})
          </h2>
          {result.discrepancies.length === 0 ? (
            <p className="text-content text-sm">{t('narrative_duel.no_discrepancies', 'No clear discrepancies identified.')}</p>
          ) : (
            <ul className="space-y-3">
              {result.discrepancies.map((d, i) => (
                <li key={i} className="border-l-2 border-primary/50 pl-4 py-1">
                  <span className="mono-ui text-[9px] text-forest uppercase mr-2">{d.type ?? 'difference'}</span>
                  {d.severity && (
                    <span className="mono-ui text-[9px] text-forest/60">({d.severity})</span>
                  )}
                  <p className="font-display text-sm font-medium text-content mt-0.5">{d.summary ?? ''}</p>
                  {d.detail && <p className="text-[11px] text-forest/80 mt-1">{d.detail}</p>}
                </li>
              ))}
            </ul>
          )}
          {result.summary && (
            <div className="pt-4 border-t border-forest/20">
              <h3 className="mono-ui text-[10px] text-forest uppercase tracking-widest mb-2">{t('narrative_duel.summary', 'Summary')}</h3>
              <p className="text-sm text-content leading-relaxed">{result.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
