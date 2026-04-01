/**
 * ListenPage — /listen
 * ─────────────────────
 * Audio hub. Four sections:
 *   1. Morning Briefing — featured card, full CTA
 *   2. Continue Listening — in-progress stories
 *   3. Up Next — current queue
 *   4. Recently Played — listening history
 *
 * Design System v4. Fraunces headlines. Plus Jakarta Sans body.
 * Geist Mono timestamps. Forest Green / Sunshine Yellow / Crisp Carrot.
 */
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import useSWR from 'swr';

import { Play }           from '@phosphor-icons/react/Play';
import { Pause }          from '@phosphor-icons/react/Pause';
import { ArrowRight }     from '@phosphor-icons/react/ArrowRight';
import { Clock }          from '@phosphor-icons/react/Clock';
import { RadioButton }    from '@phosphor-icons/react/RadioButton';
import { Queue }          from '@phosphor-icons/react/Queue';
import { ClockCounterClockwise } from '@phosphor-icons/react/ClockCounterClockwise';
import { Waveform }       from '@phosphor-icons/react/Waveform';

import { useAudio }  from '../contexts/AudioContext';
import { useAuth }   from '../contexts/AuthContext';
import * as api      from '../lib/api';

/* ─── Types ─── */
interface BriefingData {
  id:                string;
  title?:            string;
  date?:             string;
  audio_url?:        string;
  duration_estimate?: string;
  stories?:          { id?: string; title?: string; category?: string }[];
}

interface HistoryEntry {
  id:          string;
  story_id:    string;
  title?:      string;
  category?:   string;
  listened_at?: string;
  progress?:   number;    /* 0–1 */
  duration?:   number;    /* seconds */
}

/* ─── Helpers ─── */
const fetcher = async (path: string) => {
  const res = await api.get(path);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

const timeAgo = (iso?: string): string => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/* ─── Sub-components ─── */

const SectionHeader = ({ icon, title, action, onAction }: { icon: React.ReactNode; title: string; action?: string; onAction?: () => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--color-primary)', display: 'flex' }}>{icon}</span>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--color-primary)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
        {title}
      </h2>
    </div>
    {action && onAction && (
      <button type="button" onClick={onAction}
        style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-mid)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'underline', textDecorationColor: 'var(--color-border)', textUnderlineOffset: 3 }}>
        {action} <ArrowRight style={{ width: 12, height: 12 }} />
      </button>
    )}
  </div>
);

const SkeletonCard = ({ height = 80 }: { height?: number }) => (
  <div style={{ height, background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', animation: 'pulse 2s ease-in-out infinite' }} />
);

/* ─── Main ─── */
const ListenPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, stopTrack, queue } = useAudio();

  /* ── Data ── */
  const { data: briefing, isLoading: briefingLoading } =
    useSWR<BriefingData>('api/briefing/latest', fetcher);

  const historyKey = user?.id ? `api/listening-history/${user.id}?limit=20` : null;
  const { data: historyData, isLoading: historyLoading } =
    useSWR<{ entries?: HistoryEntry[] }>(historyKey, fetcher);

  const history = historyData?.entries ?? [];
  const inProgress = history.filter(e => e.progress !== undefined && e.progress > 0.02 && e.progress < 0.95);
  const recentlyPlayed = history.filter(e => !e.progress || e.progress >= 0.95 || e.progress < 0.02).slice(0, 8);

  const briefingIsPlaying = currentTrack?.id === briefing?.id && isPlaying;

  const handlePlayBriefing = async () => {
    if (!briefing?.audio_url) { navigate('/briefing'); return; }
    if (briefingIsPlaying) { stopTrack(); return; }
    await playTrack({ id: briefing.id, title: briefing.title ?? 'Morning Briefing', url: briefing.audio_url, source: 'NARVO_BRIEFING' }, true);
  };

  const handlePlayStory = async (entry: HistoryEntry) => {
    navigate(`/news/${entry.story_id}`);
  };

  /* ─── Greeting ─── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'Oga';

  const spring = { type: 'spring' as const, stiffness: 260, damping: 20 };

  return (
    <>
      <Helmet>
        <title>Listen — Narvo</title>
        <meta name="description" content="Morning Briefing, your queue, and listening history." />
      </Helmet>

      <div className="page-scroll pb-safe">
        <div className="page-container" style={{ paddingTop: 24, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* ── Greeting ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-meta)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 4 }}>
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 5vw, 40px)', color: 'var(--color-primary)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              {greeting}, {name}.
            </h1>
          </motion.div>

          {/* ══ SECTION 1: MORNING BRIEFING ══ */}
          <section>
            <SectionHeader icon={<RadioButton style={{ width: 18, height: 18 }} weight="fill" />} title="Morning Briefing" action="Full briefing" onAction={() => navigate('/briefing')} />

            {briefingLoading ? (
              <SkeletonCard height={140} />
            ) : briefing ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={spring}
                style={{ background: 'var(--color-primary)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'rgba(255,201,38,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      {briefing.date ? new Date(briefing.date).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Today'}
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--color-accent)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                      {briefing.title ?? "Your Morning Briefing"}
                    </h3>
                  </div>
                  {/* Play button */}
                  <button type="button" onClick={handlePlayBriefing}
                    style={{ width: 56, height: 56, borderRadius: 9999, background: 'var(--color-cta)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-2)' }}>
                    {briefingIsPlaying
                      ? <Pause  weight="fill" style={{ width: 22, height: 22, color: '#fff' }} />
                      : <Play   weight="fill" style={{ width: 22, height: 22, color: '#fff', marginLeft: 2 }} />
                    }
                  </button>
                </div>

                {/* Stories preview */}
                {briefing.stories && briefing.stories.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {briefing.stories.slice(0, 3).map((s, i) => (
                      <div key={s.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,201,38,0.45)', letterSpacing: '0.06em', flexShrink: 0, width: 16 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }} className="line-clamp-1">
                          {s.title}
                        </span>
                      </div>
                    ))}
                    {briefing.stories.length > 3 && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,201,38,0.45)', letterSpacing: '0.06em' }}>
                        +{briefing.stories.length - 3} more stories
                      </span>
                    )}
                  </div>
                )}

                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {briefing.duration_estimate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock style={{ width: 12, height: 12, color: 'rgba(255,201,38,0.55)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,201,38,0.55)', letterSpacing: '0.04em' }}>
                        {briefing.duration_estimate}
                      </span>
                    </div>
                  )}
                  {/* Waveform animation when playing */}
                  {briefingIsPlaying && (
                    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 14 }}>
                      {[8, 12, 10, 14, 10].map((h, i) => (
                        <div key={i} className="wave-bar" style={{ width: 3, height: h, background: 'var(--color-accent)', borderRadius: 2, transformOrigin: 'bottom' }} />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* No briefing yet */
              <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <RadioButton style={{ width: 32, height: 32, color: 'var(--color-border)' }} />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-mid)' }}>
                  No briefing yet today.
                </p>
                <button type="button" onClick={() => navigate('/briefing')}
                  style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--color-cta)', border: 'none', borderRadius: 9999, height: 40, padding: '0 20px', cursor: 'pointer' }}>
                  Generate briefing
                </button>
              </div>
            )}
          </section>

          {/* ══ SECTION 2: CONTINUE LISTENING ══ */}
          {(historyLoading || inProgress.length > 0) && (
            <section>
              <SectionHeader icon={<Waveform style={{ width: 18, height: 18 }} weight="fill" />} title="Continue listening" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {historyLoading
                  ? [1,2].map(i => <SkeletonCard key={i} height={72} />)
                  : inProgress.slice(0, 5).map((entry, i) => (
                      <motion.button
                        key={entry.id}
                        type="button"
                        onClick={() => handlePlayStory(entry)}
                        initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ ...spring, delay: i * 0.05 }}
                        style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                      >
                        {/* Progress ring / play icon */}
                        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                          <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0 }}>
                            <circle cx="22" cy="22" r="19" fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
                            <circle cx="22" cy="22" r="19" fill="none" stroke="var(--color-cta)" strokeWidth="2.5"
                              strokeDasharray={`${2 * Math.PI * 19}`}
                              strokeDashoffset={`${2 * Math.PI * 19 * (1 - (entry.progress ?? 0))}`}
                              strokeLinecap="round"
                              transform="rotate(-90 22 22)"
                            />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Play weight="fill" style={{ width: 14, height: 14, color: 'var(--color-primary)', marginLeft: 1 }} />
                          </div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <p className="line-clamp-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-primary)', lineHeight: 1.25, letterSpacing: '-0.01em', marginBottom: 4 }}>
                            {entry.title ?? 'Untitled story'}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {entry.category && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(24,84,42,0.08)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {entry.category}
                              </span>
                            )}
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-meta)' }}>
                              {Math.round((entry.progress ?? 0) * 100)}% listened
                            </span>
                          </div>
                        </div>

                        <ArrowRight style={{ width: 16, height: 16, color: 'var(--color-text-meta)', flexShrink: 0 }} />
                      </motion.button>
                    ))
                }
              </div>
            </section>
          )}

          {/* ══ SECTION 3: QUEUE ══ */}
          {queue.length > 0 && (
            <section>
              <SectionHeader icon={<Queue style={{ width: 18, height: 18 }} weight="fill" />} title="Up next" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
                {queue.slice(0, 5).map((track, i) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--color-surface)', borderBottom: i < queue.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-meta)', width: 20, flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <p className="line-clamp-1" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', flex: 1 }}>
                      {track.title}
                    </p>
                    {currentTrack?.id === track.id && isPlaying && (
                      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
                        {[6, 10, 8].map((h, idx) => (
                          <div key={idx} className="wave-bar" style={{ width: 2.5, height: h, background: 'var(--color-cta)', borderRadius: 1, transformOrigin: 'bottom' }} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {queue.length > 5 && (
                  <div style={{ padding: '10px 16px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-meta)', letterSpacing: '0.04em' }}>
                      +{queue.length - 5} more in queue
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ══ SECTION 4: RECENTLY PLAYED ══ */}
          <section>
            <SectionHeader icon={<ClockCounterClockwise style={{ width: 18, height: 18 }} weight="fill" />} title="Recently played" action="Full history" onAction={() => navigate('/insights')} />

            {historyLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3].map(i => <SkeletonCard key={i} height={64} />)}
              </div>
            ) : recentlyPlayed.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentlyPlayed.map((entry, i) => (
                  <motion.button
                    key={entry.id}
                    type="button"
                    onClick={() => handlePlayStory(entry)}
                    initial={{ opacity: 0, y: 4 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ ...spring, delay: i * 0.04 }}
                    style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, padding: '14px 0', background: 'none', border: 'none', borderBottom: i < recentlyPlayed.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p className="line-clamp-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-primary)', lineHeight: 1.2, letterSpacing: '-0.01em', marginBottom: 4 }}>
                        {entry.title ?? 'Untitled story'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {entry.category && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(24,84,42,0.08)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {entry.category}
                          </span>
                        )}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-meta)' }}>
                          {timeAgo(entry.listened_at)}
                        </span>
                      </div>
                    </div>
                    <Play weight="fill" style={{ width: 16, height: 16, color: 'var(--color-text-meta)', flexShrink: 0 }} />
                  </motion.button>
                ))}
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <ClockCounterClockwise style={{ width: 32, height: 32, color: 'var(--color-border)', margin: '0 auto 8px' }} />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-mid)' }}>
                  Nothing played yet.
                </p>
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  );
};

export default ListenPage;
