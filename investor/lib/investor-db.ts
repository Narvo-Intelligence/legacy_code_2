import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { investorContentSeed } from '@/lib/investor-content';
import type {
  ContentEntryInput,
  ContentEntryRow,
  ContentEntryUpdate,
  InvestorContentBundle,
  InvestorContentCollection,
  InvestorContentCollectionMap,
  MetricsSnapshotInput,
  MetricsSnapshotUpdate,
  PlatformMetrics,
  StoredMetricsSnapshot,
  StoredTrackEvent,
  TrackEventAggregate,
  TrackEventPayload,
  TrackSummary,
} from '@/lib/investor-types';

type SqliteDatabase = Database.Database;

interface ContentRowRecord {
  id: number;
  collection: InvestorContentCollection;
  slug: string;
  position: number;
  payload: string;
  created_at: string;
  updated_at: string;
}

interface MetricsRowRecord {
  id: number;
  source: string;
  live: number;
  message: string;
  payload: string;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

interface TrackRowRecord {
  id: number;
  event: string;
  path: string;
  label: string | null;
  href: string | null;
  props: string;
  ts: string;
  user_agent: string | null;
  created_at: string;
}

const globalForInvestorDb = globalThis as typeof globalThis & {
  __narvoInvestorDb?: SqliteDatabase;
};

function resolveDatabasePath(): string {
  const configured = process.env.INVESTOR_DB_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }

  return path.join(process.cwd(), '.data', 'investor.sqlite');
}

function ensureDatabaseDirectory(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'entry';
}

function defaultSlug<K extends InvestorContentCollection>(
  collection: K,
  payload: InvestorContentCollectionMap[K],
  position: number
): string {
  if (typeof payload === 'string') {
    return slugify(`${collection}-${position + 1}-${payload}`);
  }

  const payloadRecord = payload as unknown as Record<string, unknown>;

  if (typeof payloadRecord.id === 'string') return payloadRecord.id;
  if (typeof payloadRecord.title === 'string') return slugify(payloadRecord.title);
  if (typeof payloadRecord.name === 'string') return slugify(payloadRecord.name);
  if (typeof payloadRecord.label === 'string') return slugify(payloadRecord.label);
  if (typeof payloadRecord.value === 'string') return slugify(`${collection}-${payloadRecord.value}`);

  return `${collection}-${position + 1}`;
}

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

function parseContentPayload<K extends InvestorContentCollection>(
  value: string
): InvestorContentCollectionMap[K] {
  return JSON.parse(value) as InvestorContentCollectionMap[K];
}

function mapContentRow<K extends InvestorContentCollection>(row: ContentRowRecord): ContentEntryRow<K> {
  return {
    id: row.id,
    collection: row.collection as K,
    slug: row.slug,
    position: row.position,
    payload: parseContentPayload<K>(row.payload),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMetricsRow(row: MetricsRowRecord): StoredMetricsSnapshot {
  return {
    id: row.id,
    source: row.source,
    live: Boolean(row.live),
    message: row.message,
    metrics: safeParseJson<PlatformMetrics>(row.payload, {}),
    fetchedAt: row.fetched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrackRow(row: TrackRowRecord): StoredTrackEvent {
  return {
    id: row.id,
    event: row.event,
    path: row.path,
    label: row.label,
    href: row.href,
    props: safeParseJson<Record<string, unknown>>(row.props, {}),
    ts: row.ts,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function initializeDatabase(db: SqliteDatabase): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS content_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection TEXT NOT NULL,
      slug TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(collection, slug)
    );

    CREATE INDEX IF NOT EXISTS idx_content_entries_collection_position
      ON content_entries(collection, position, id);

    CREATE TABLE IF NOT EXISTS metrics_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      live INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_fetched_at
      ON metrics_snapshots(fetched_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS track_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      path TEXT NOT NULL,
      label TEXT,
      href TEXT,
      props TEXT NOT NULL,
      ts TEXT NOT NULL,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_track_events_ts
      ON track_events(ts DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_track_events_event
      ON track_events(event, ts DESC);
  `);

  const existingContent = db.prepare('SELECT COUNT(*) AS count FROM content_entries').get() as { count: number };
  if (existingContent.count > 0) return;

  const insert = db.prepare(`
    INSERT INTO content_entries (collection, slug, position, payload, created_at, updated_at)
    VALUES (@collection, @slug, @position, @payload, @createdAt, @updatedAt)
  `);

  const transaction = db.transaction(() => {
    const createdAt = nowIso();

    (
      Object.entries(investorContentSeed) as Array<
        [InvestorContentCollection, InvestorContentBundle[InvestorContentCollection]]
      >
    ).forEach(([collection, items]) => {
      items.forEach((payload, index) => {
        insert.run({
          collection,
          slug: defaultSlug(collection, payload as never, index),
          position: index,
          payload: serializeJson(payload),
          createdAt,
          updatedAt: createdAt,
        });
      });
    });
  });

  transaction();
}

function createDatabase(): SqliteDatabase {
  const dbPath = resolveDatabasePath();
  ensureDatabaseDirectory(dbPath);
  const db = new Database(dbPath);
  initializeDatabase(db);
  return db;
}

function database(): SqliteDatabase {
  if (!globalForInvestorDb.__narvoInvestorDb) {
    globalForInvestorDb.__narvoInvestorDb = createDatabase();
  }

  return globalForInvestorDb.__narvoInvestorDb;
}

export function listContentEntries<K extends InvestorContentCollection>(
  collection: K
): Array<ContentEntryRow<K>> {
  const rows = database()
    .prepare(
      `
        SELECT id, collection, slug, position, payload, created_at, updated_at
        FROM content_entries
        WHERE collection = ?
        ORDER BY position ASC, id ASC
      `
    )
    .all(collection) as ContentRowRecord[];

  return rows.map((row) => mapContentRow<K>(row));
}

export function getContentEntryById(id: number): ContentEntryRow | null {
  const row = database()
    .prepare(
      `
        SELECT id, collection, slug, position, payload, created_at, updated_at
        FROM content_entries
        WHERE id = ?
      `
    )
    .get(id) as ContentRowRecord | undefined;

  return row ? mapContentRow(row) : null;
}

export function createContentEntry<K extends InvestorContentCollection>(
  input: ContentEntryInput<K>
): ContentEntryRow<K> {
  const createdAt = nowIso();
  const slug = input.slug?.trim() || defaultSlug(input.collection, input.payload, input.position ?? 0);
  const result = database()
    .prepare(
      `
        INSERT INTO content_entries (collection, slug, position, payload, created_at, updated_at)
        VALUES (@collection, @slug, @position, @payload, @createdAt, @updatedAt)
      `
    )
    .run({
      collection: input.collection,
      slug,
      position: input.position ?? 0,
      payload: serializeJson(input.payload),
      createdAt,
      updatedAt: createdAt,
    });

  return getContentEntryById(Number(result.lastInsertRowid)) as ContentEntryRow<K>;
}

export function updateContentEntry(
  id: number,
  input: ContentEntryUpdate
): ContentEntryRow | null {
  const existing = getContentEntryById(id);
  if (!existing) return null;

  const updatedAt = nowIso();
  database()
    .prepare(
      `
        UPDATE content_entries
        SET slug = @slug,
            position = @position,
            payload = @payload,
            updated_at = @updatedAt
        WHERE id = @id
      `
    )
    .run({
      id,
      slug: input.slug?.trim() || existing.slug,
      position: input.position ?? existing.position,
      payload: serializeJson(input.payload ?? existing.payload),
      updatedAt,
    });

  return getContentEntryById(id);
}

export function deleteContentEntry(id: number): boolean {
  const result = database().prepare('DELETE FROM content_entries WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getInvestorContentBundle(): InvestorContentBundle {
  return {
    overviewStats: listContentEntries('overviewStats').map((entry) => entry.payload),
    operatingModel: listContentEntries('operatingModel').map((entry) => entry.payload),
    whyNowSignals: listContentEntries('whyNowSignals').map((entry) => entry.payload),
    convictionPoints: listContentEntries('convictionPoints').map((entry) => entry.payload),
    pitchChapters: listContentEntries('pitchChapters').map((entry) => entry.payload),
    roadmapPhases: listContentEntries('roadmapPhases').map((entry) => entry.payload),
    roadmapTracks: listContentEntries('roadmapTracks').map((entry) => entry.payload),
    telemetryCatalog: listContentEntries('telemetryCatalog').map((entry) => entry.payload),
  };
}

export function listMetricsSnapshots(limit = 25): StoredMetricsSnapshot[] {
  const rows = database()
    .prepare(
      `
        SELECT id, source, live, message, payload, fetched_at, created_at, updated_at
        FROM metrics_snapshots
        ORDER BY fetched_at DESC, id DESC
        LIMIT ?
      `
    )
    .all(limit) as MetricsRowRecord[];

  return rows.map(mapMetricsRow);
}

export function getMetricsSnapshotById(id: number): StoredMetricsSnapshot | null {
  const row = database()
    .prepare(
      `
        SELECT id, source, live, message, payload, fetched_at, created_at, updated_at
        FROM metrics_snapshots
        WHERE id = ?
      `
    )
    .get(id) as MetricsRowRecord | undefined;

  return row ? mapMetricsRow(row) : null;
}

export function getLatestMetricsSnapshot(): StoredMetricsSnapshot | null {
  const row = database()
    .prepare(
      `
        SELECT id, source, live, message, payload, fetched_at, created_at, updated_at
        FROM metrics_snapshots
        ORDER BY fetched_at DESC, id DESC
        LIMIT 1
      `
    )
    .get() as MetricsRowRecord | undefined;

  return row ? mapMetricsRow(row) : null;
}

export function createMetricsSnapshot(input: MetricsSnapshotInput): StoredMetricsSnapshot {
  const createdAt = nowIso();
  const fetchedAt = input.fetchedAt ?? createdAt;
  const result = database()
    .prepare(
      `
        INSERT INTO metrics_snapshots (source, live, message, payload, fetched_at, created_at, updated_at)
        VALUES (@source, @live, @message, @payload, @fetchedAt, @createdAt, @updatedAt)
      `
    )
    .run({
      source: input.source ?? 'investor-app',
      live: input.live ? 1 : 0,
      message: input.message,
      payload: serializeJson(input.metrics),
      fetchedAt,
      createdAt,
      updatedAt: createdAt,
    });

  return getMetricsSnapshotById(Number(result.lastInsertRowid)) as StoredMetricsSnapshot;
}

export function updateMetricsSnapshot(
  id: number,
  input: MetricsSnapshotUpdate
): StoredMetricsSnapshot | null {
  const existing = getMetricsSnapshotById(id);
  if (!existing) return null;

  const updatedAt = nowIso();
  database()
    .prepare(
      `
        UPDATE metrics_snapshots
        SET source = @source,
            live = @live,
            message = @message,
            payload = @payload,
            fetched_at = @fetchedAt,
            updated_at = @updatedAt
        WHERE id = @id
      `
    )
    .run({
      id,
      source: input.source ?? existing.source,
      live: typeof input.live === 'boolean' ? Number(input.live) : Number(existing.live),
      message: input.message ?? existing.message,
      payload: serializeJson(input.metrics ?? existing.metrics),
      fetchedAt: input.fetchedAt ?? existing.fetchedAt,
      updatedAt,
    });

  return getMetricsSnapshotById(id);
}

export function deleteMetricsSnapshot(id: number): boolean {
  const result = database().prepare('DELETE FROM metrics_snapshots WHERE id = ?').run(id);
  return result.changes > 0;
}

export function createTrackEvent(input: TrackEventPayload, userAgent: string | null): StoredTrackEvent {
  const createdAt = nowIso();
  const result = database()
    .prepare(
      `
        INSERT INTO track_events (event, path, label, href, props, ts, user_agent, created_at)
        VALUES (@event, @path, @label, @href, @props, @ts, @userAgent, @createdAt)
      `
    )
    .run({
      event: input.event ?? 'unknown',
      path: input.path ?? 'unknown',
      label: input.label ?? null,
      href: input.href ?? null,
      props: serializeJson(input.props ?? {}),
      ts: input.ts ?? createdAt,
      userAgent,
      createdAt,
    });

  return getTrackEventById(Number(result.lastInsertRowid)) as StoredTrackEvent;
}

export function getTrackEventById(id: number): StoredTrackEvent | null {
  const row = database()
    .prepare(
      `
        SELECT id, event, path, label, href, props, ts, user_agent, created_at
        FROM track_events
        WHERE id = ?
      `
    )
    .get(id) as TrackRowRecord | undefined;

  return row ? mapTrackRow(row) : null;
}

export function listTrackEvents(limit = 50): StoredTrackEvent[] {
  const rows = database()
    .prepare(
      `
        SELECT id, event, path, label, href, props, ts, user_agent, created_at
        FROM track_events
        ORDER BY ts DESC, id DESC
        LIMIT ?
      `
    )
    .all(limit) as TrackRowRecord[];

  return rows.map(mapTrackRow);
}

export function deleteTrackEvent(id: number): boolean {
  const result = database().prepare('DELETE FROM track_events WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getTrackSummary(limit = 12): TrackSummary {
  const totalEvents = (
    database().prepare('SELECT COUNT(*) AS count FROM track_events').get() as { count: number }
  ).count;

  const uniquePaths = (
    database().prepare('SELECT COUNT(DISTINCT path) AS count FROM track_events').get() as { count: number }
  ).count;

  const definitions = new Map<string, string>(
    getInvestorContentBundle().telemetryCatalog.map((item) => [item.name, item.description] as const)
  );

  const byEventRows = database()
    .prepare(
      `
        SELECT event, COUNT(*) AS count, MAX(ts) AS last_ts
        FROM track_events
        GROUP BY event
        ORDER BY count DESC, event ASC
      `
    )
    .all() as Array<{ event: string; count: number; last_ts: string | null }>;

  const byEvent: TrackEventAggregate[] = byEventRows.map((row) => ({
    event: row.event,
    description: definitions.get(row.event) ?? null,
    count: row.count,
    lastTs: row.last_ts,
  }));

  return {
    totalEvents,
    uniquePaths,
    byEvent,
    recentEvents: listTrackEvents(limit),
  };
}
