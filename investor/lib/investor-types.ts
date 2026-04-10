export type InvestorAnalyticsEvent =
  | 'page_view'
  | 'cta_click'
  | 'section_view'
  | 'pitch_chapter_view'
  | 'roadmap_phase_view'
  | 'metrics_refresh';

export interface OverviewStat {
  value: string;
  label: string;
  detail: string;
}

export interface OperatingModelItem {
  name: string;
  audience: string;
  summary: string;
}

export interface WhyNowSignal {
  title: string;
  body: string;
}

export interface PitchChapter {
  id: string;
  kicker: string;
  title: string;
  summary: string;
  bullets: string[];
  stat: string;
  statLabel: string;
}

export interface RoadmapPhase {
  id: string;
  window: string;
  title: string;
  summary: string;
  casual: string[];
  technical: string[];
  commercial: string[];
}

export interface RoadmapTrack {
  title: string;
  now: string;
  next: string;
  later: string;
}

export interface TelemetryDefinition {
  name: InvestorAnalyticsEvent;
  description: string;
}

export interface InvestorContentBundle {
  overviewStats: OverviewStat[];
  operatingModel: OperatingModelItem[];
  whyNowSignals: WhyNowSignal[];
  convictionPoints: string[];
  pitchChapters: PitchChapter[];
  roadmapPhases: RoadmapPhase[];
  roadmapTracks: RoadmapTrack[];
  telemetryCatalog: TelemetryDefinition[];
}

export interface InvestorContentCollectionMap {
  overviewStats: OverviewStat;
  operatingModel: OperatingModelItem;
  whyNowSignals: WhyNowSignal;
  convictionPoints: string;
  pitchChapters: PitchChapter;
  roadmapPhases: RoadmapPhase;
  roadmapTracks: RoadmapTrack;
  telemetryCatalog: TelemetryDefinition;
}

export const INVESTOR_CONTENT_COLLECTIONS = [
  'overviewStats',
  'operatingModel',
  'whyNowSignals',
  'convictionPoints',
  'pitchChapters',
  'roadmapPhases',
  'roadmapTracks',
  'telemetryCatalog',
] as const;

export type InvestorContentCollection = (typeof INVESTOR_CONTENT_COLLECTIONS)[number];

export interface ContentEntryRow<K extends InvestorContentCollection = InvestorContentCollection> {
  id: number;
  collection: K;
  slug: string;
  position: number;
  payload: InvestorContentCollectionMap[K];
  createdAt: string;
  updatedAt: string;
}

export interface ContentEntryInput<K extends InvestorContentCollection = InvestorContentCollection> {
  collection: K;
  slug?: string;
  position?: number;
  payload: InvestorContentCollectionMap[K];
}

export interface ContentEntryUpdate<K extends InvestorContentCollection = InvestorContentCollection> {
  slug?: string;
  position?: number;
  payload?: InvestorContentCollectionMap[K];
}

export interface PlatformMetrics {
  listeners_today?: string | null;
  total_listeners?: string | null;
  sources_online?: number | null;
  total_sources?: number | null;
  local_sources?: number | null;
  international_sources?: number | null;
  continental_sources?: number | null;
  stories_processed?: number | null;
  broadcast_hours?: number | null;
  signal_strength?: string | null;
  network_load?: string | null;
  broadcast_ready?: boolean | null;
  last_sync?: string | null;
  aggregators?: Record<string, { configured?: boolean | null; cached_count?: number | null }>;
}

export interface MetricsSnapshot {
  live: boolean;
  fetchedAt: string;
  message: string;
  metrics: PlatformMetrics;
}

export interface StoredMetricsSnapshot extends MetricsSnapshot {
  id: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetricsSnapshotInput {
  source?: string;
  live?: boolean;
  message: string;
  metrics: PlatformMetrics;
  fetchedAt?: string;
}

export interface MetricsSnapshotUpdate {
  source?: string;
  live?: boolean;
  message?: string;
  metrics?: PlatformMetrics;
  fetchedAt?: string;
}

export interface TrackEventPayload {
  event?: InvestorAnalyticsEvent;
  path?: string;
  label?: string;
  href?: string;
  props?: Record<string, unknown>;
  ts?: string;
}

export interface StoredTrackEvent {
  id: number;
  event: string;
  path: string;
  label: string | null;
  href: string | null;
  props: Record<string, unknown>;
  ts: string;
  userAgent: string | null;
  createdAt: string;
}

export interface TrackEventAggregate {
  event: string;
  description: string | null;
  count: number;
  lastTs: string | null;
}

export interface TrackSummary {
  totalEvents: number;
  uniquePaths: number;
  byEvent: TrackEventAggregate[];
  recentEvents: StoredTrackEvent[];
}
