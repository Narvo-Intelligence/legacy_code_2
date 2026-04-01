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
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    label: 'VERIFIED',
  },
  DISPUTED: {
    icon: ShieldWarning,
    color: 'text-alert',
    bg: 'bg-alert/10',
    border: 'border-alert/20',
    label: 'DISPUTED',
  },
  UNVERIFIED: {
    icon: Question,
    color: 'text-content-secondary',
    bg: 'bg-surface-alt',
    border: 'border-border',
    label: 'UNVERIFIED',
  },
  PENDING: {
    icon: CircleNotch,
    color: 'text-primary/70',
    bg: 'bg-primary/10',
    border: 'border-primary/15',
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
        className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-content-secondary md:text-[10px]"
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
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${config.color} ${config.bg} ${config.border}`}
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
      className={`flex items-center gap-3 rounded-[18px] border px-3 py-3 ${config.bg} ${config.border}`}
      data-testid={`truth-tag-${storyId}`}
    >
      <Icon
        className={`w-4 h-4 ${config.color}`}
        weight={status === 'PENDING' ? 'regular' : 'bold'}
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${config.color}`}>{config.label}</span>
          <span className="font-mono text-[9px] text-content-secondary">{confidence}%</span>
        </div>
        <span className="text-[11px] text-content-secondary truncate">{source}</span>
      </div>
    </div>
  );
};

export default TruthTag;
