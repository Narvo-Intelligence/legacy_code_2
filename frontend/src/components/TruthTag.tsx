import { useState, useEffect, useRef } from 'react';
import type { Icon } from '@phosphor-icons/react/lib';
import { ShieldCheck } from '@phosphor-icons/react/ShieldCheck';
import { ShieldWarning } from '@phosphor-icons/react/ShieldWarning';
import { Question } from '@phosphor-icons/react/Question';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';
import * as api from '../lib/api';

type FactCheckStatus = 'VERIFIED' | 'DISPUTED' | 'UNVERIFIED' | 'PENDING';

interface StatusConfig {
  icon: Icon;
  color: string;
  bg: string;
  border: string;
  label: string;
}

const STATUS_MAP: Record<FactCheckStatus, StatusConfig> = {
  VERIFIED: {
    icon: ShieldCheck,
    color: 'text-narvo-teal',
    bg: 'bg-narvo-mint/15',
    border: 'border-narvo-mint/30',
    label: 'VERIFIED',
  },
  DISPUTED: {
    icon: ShieldWarning,
    color: 'text-narvo-vermilion',
    bg: 'bg-narvo-vermilion/10',
    border: 'border-narvo-vermilion/30',
    label: 'DISPUTED',
  },
  UNVERIFIED: {
    icon: Question,
    color: 'text-narvo-ink/50',
    bg: 'bg-narvo-ink/5',
    border: 'border-narvo-ink/10',
    label: 'UNVERIFIED',
  },
  PENDING: {
    icon: CircleNotch,
    color: 'text-narvo-teal/40',
    bg: 'bg-narvo-teal/5',
    border: 'border-narvo-teal/10',
    label: 'CHECKING...',
  },
};

interface FactCheckResult {
  status?: FactCheckStatus;
  source?: string;
  confidence?: number;
  [key: string]: unknown;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const factCheckCache = new Map<string, { data: FactCheckResult; at: number }>();

export interface TruthTagProps {
  storyId: string | undefined | null;
  compact?: boolean;
}

const TruthTag = ({ storyId, compact = false }: TruthTagProps) => {
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLSpanElement>(null);
  const fetchStartedRef = useRef(false);

  useEffect(() => {
    if (!storyId) {
      setLoading(false);
      return;
    }
    const cached = factCheckCache.get(storyId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setResult(cached.data);
      setLoading(false);
      return;
    }
    fetchStartedRef.current = false;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (!e?.isIntersecting) return;
        if (fetchStartedRef.current) return;
        fetchStartedRef.current = true;
        api
          .get(`api/factcheck/story/${storyId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data: FactCheckResult | null) => {
            if (data) {
              factCheckCache.set(storyId, { data, at: Date.now() });
              setResult(data);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      },
      { rootMargin: '80px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [storyId]);

  if (loading) {
    return (
      <span
        ref={containerRef}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 mono-ui text-[9px] md:text-[10px] text-forest border border-forest/30 font-bold"
      >
        <CircleNotch className="w-3 h-3 animate-spin" />
        {!compact && 'VERIFYING...'}
      </span>
    );
  }

  const status = (result?.status ?? 'UNVERIFIED') as FactCheckStatus;
  const config = STATUS_MAP[status] ?? STATUS_MAP.UNVERIFIED;
  const Icon = config.icon;
  const source = result?.source ?? 'UNKNOWN';
  const confidence = result?.confidence ?? 0;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mono-ui text-[9px] font-bold ${config.color} ${config.bg} ${config.border} border`}
        data-testid={`truth-tag-${storyId}`}
        title={`${config.label} (${confidence}%) — ${source}`}
      >
        <Icon className="w-3 h-3" weight={status === 'PENDING' ? 'regular' : 'bold'} />
        {config.label}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 p-2 ${config.bg} border ${config.border}`}
      data-testid={`truth-tag-${storyId}`}
    >
      <Icon
        className={`w-4 h-4 ${config.color}`}
        weight={status === 'PENDING' ? 'regular' : 'bold'}
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`mono-ui text-[11px] font-bold ${config.color}`}>{config.label}</span>
          <span className="mono-ui text-[9px] text-forest/60">{confidence}%</span>
        </div>
        <span className="mono-ui text-[9px] text-forest truncate">{source}</span>
      </div>
    </div>
  );
};

export default TruthTag;
