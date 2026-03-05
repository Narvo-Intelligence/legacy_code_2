import { useState, useEffect } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { ShieldCheck, ShieldWarning, Question, CircleNotch } from '@phosphor-icons/react';
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
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/30',
    label: 'VERIFIED',
  },
  DISPUTED: {
    icon: ShieldWarning,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
    label: 'DISPUTED',
  },
  UNVERIFIED: {
    icon: Question,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
    label: 'UNVERIFIED',
  },
  PENDING: {
    icon: CircleNotch,
    color: 'text-forest',
    bg: 'bg-forest/10',
    border: 'border-forest/30',
    label: 'CHECKING...',
  },
};

interface FactCheckResult {
  status?: FactCheckStatus;
  source?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface TruthTagProps {
  storyId: string | undefined | null;
  compact?: boolean;
}

const TruthTag = ({ storyId, compact = false }: TruthTagProps) => {
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storyId) {
      setLoading(false);
      return;
    }
    api
      .get(`api/factcheck/story/${storyId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FactCheckResult | null) => {
        if (data) setResult(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storyId]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mono-ui text-[9px] md:text-[10px] text-forest border border-forest/30 font-bold">
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
