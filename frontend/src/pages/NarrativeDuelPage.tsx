/**
 * Narrative Duel: compare two narratives for discrepancies (Gemini).
 * Reachable via sidebar nav ("Narrative Duel") and route /narrative-duel.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Scales } from '@phosphor-icons/react/Scales';
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
    <div className="px-4 md:px-8 py-6 md:py-8 pb-32 md:pb-8 max-w-5xl mx-auto min-h-0" data-testid="narrative-duel">
      <header className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-12 h-12 narvo-border bg-surface/20" aria-hidden>
            <Scales weight="regular" className="w-6 h-6 text-primary" />
          </span>
          <h1 className="font-display text-xl md:text-2xl font-bold text-content uppercase tracking-tight" style={{ lineHeight: 'var(--line-height-heading)' }}>
            {t('narrative_duel.title', 'Narrative Duel')}
          </h1>
        </div>
        <p className="mono-ui text-[10px] md:text-[11px] text-forest tracking-widest" style={{ lineHeight: 1.5 }}>
          {t('narrative_duel.subtitle', 'Compare two narratives for factual and tonal discrepancies.')}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="narvo-border bg-surface/10 p-4 md:p-6">
          <label htmlFor="narrative-a" className="mono-ui text-[10px] text-forest tracking-widest block mb-3">
            NARRATIVE A
          </label>
          <textarea
            id="narrative-a"
            className="w-full h-40 narvo-border bg-background-dark p-4 font-body text-sm text-content placeholder:text-content-dim-accessible resize-y focus:outline-none"
            placeholder={t('narrative_duel.paste_a', 'Paste first narrative…')}
            value={narrativeA}
            onChange={(e) => setNarrativeA(e.target.value)}
            aria-label="Narrative A"
            style={{ lineHeight: 'var(--line-height-body)' }}
          />
        </div>
        <div className="narvo-border bg-surface/10 p-4 md:p-6">
          <label htmlFor="narrative-b" className="mono-ui text-[10px] text-forest tracking-widest block mb-3">
            NARRATIVE B
          </label>
          <textarea
            id="narrative-b"
            className="w-full h-40 narvo-border bg-background-dark p-4 font-body text-sm text-content placeholder:text-content-dim-accessible resize-y focus:outline-none"
            placeholder={t('narrative_duel.paste_b', 'Paste second narrative…')}
            value={narrativeB}
            onChange={(e) => setNarrativeB(e.target.value)}
            aria-label="Narrative B"
            style={{ lineHeight: 'var(--line-height-body)' }}
          />
        </div>
      </div>

      <div className="mt-6 md:mt-8 flex justify-center">
        <button
          type="button"
          onClick={handleCompare}
          disabled={loading}
          className="min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] px-6 py-3 narvo-border bg-primary text-background-dark font-mono text-[11px] font-bold tracking-widest uppercase hover:bg-primary/90 disabled:opacity-50 transition-colors focus:outline-none"
          data-testid="narrative-duel-compare"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-background-dark border-t-transparent inline-block animate-spin shrink-0" aria-hidden />
              <span className="ml-2 mono-ui">[{t('narrative_duel.comparing', 'Comparing…')}]</span>
            </>
          ) : (
            <span>[{t('narrative_duel.compare', 'Compare')}]</span>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-label-urgent font-body text-sm" role="alert" style={{ lineHeight: 'var(--line-height-body)' }}>{error}</p>
      )}

      {result && (
        <section className="mt-8 narvo-border bg-surface/10 p-4 md:p-6" aria-labelledby="duel-results-heading">
          <h2 id="duel-results-heading" className="mono-ui text-[10px] text-forest tracking-widest mb-4">
            {t('narrative_duel.discrepancies', 'Discrepancies')} ({result.discrepancies.length})
          </h2>
          {result.discrepancies.length === 0 ? (
            <p className="font-body text-sm text-content" style={{ lineHeight: 'var(--line-height-body)' }}>
              {t('narrative_duel.no_discrepancies', 'No clear discrepancies identified.')}
            </p>
          ) : (
            <ul className="space-y-4" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {result.discrepancies.map((d, i) => (
                <li key={i} className="narvo-border-l border-primary/50 pl-4 py-2">
                  <span className="mono-ui text-[9px] text-forest tracking-widest">{d.type ?? 'difference'}</span>
                  {d.severity && (
                    <span className="mono-ui text-[9px] text-content-dim-accessible ml-2">({d.severity})</span>
                  )}
                  <p className="font-display text-sm font-medium text-content mt-1">{d.summary ?? ''}</p>
                  {d.detail && (
                    <p className="font-body text-[11px] text-content-dim-accessible mt-1" style={{ lineHeight: 1.5 }}>{d.detail}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {result.summary && (
            <div className="mt-6 pt-6 narvo-border-t">
              <h3 className="mono-ui text-[10px] text-forest tracking-widest mb-2">{t('narrative_duel.summary', 'Summary')}</h3>
              <p className="font-body text-sm text-content" style={{ lineHeight: 'var(--line-height-body)' }}>{result.summary}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
