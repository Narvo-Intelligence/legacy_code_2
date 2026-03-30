/**
 * ProfilePage — /profile
 * ──────────────────────
 * User identity hub. Four sections:
 *   1. Identity card — avatar, name, email, listening streak
 *   2. Listening stats — from insights API
 *   3. Quick-access tiles — Settings, Subscription, Voices, Insights
 *   4. Account actions — sign out
 *
 * Design System v4. Forest Green / Sunshine Yellow / Crisp Carrot.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import useSWR from 'swr';

import { GearSix }        from '@phosphor-icons/react/GearSix';
import { CreditCard }     from '@phosphor-icons/react/CreditCard';
import { Microphone }     from '@phosphor-icons/react/Microphone';
import { ChartLine }      from '@phosphor-icons/react/ChartLine';
import { SignOut }        from '@phosphor-icons/react/SignOut';
import { CaretRight }     from '@phosphor-icons/react/CaretRight';
import { UserCircle }     from '@phosphor-icons/react/UserCircle';
import { Clock }          from '@phosphor-icons/react/Clock';
import { Headphones }     from '@phosphor-icons/react/Headphones';
import { Fire }           from '@phosphor-icons/react/Fire';

import { useAuth }  from '../contexts/AuthContext';
import * as api     from '../lib/api';

/* ─── Types ─── */
interface InsightsSummary {
  total_listened?:    number;  /* seconds */
  stories_completed?: number;
  streak_days?:       number;
  favourite_category?: string;
}

/* ─── Helpers ─── */
const fetcher = async (path: string) => {
  const res = await api.get(path);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

const formatHours = (sec?: number): string => {
  if (!sec) return '0h';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const initials = (name?: string, email?: string): string => {
  const src = name || email || '?';
  const parts = src.split(/[\s@]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src[0].toUpperCase();
};

/* ─── Quick-access tile ─── */
interface Tile {
  icon:    React.ReactNode;
  label:   string;
  sub:     string;
  path:    string;
  accent?: string;
}

const TILES: Tile[] = [
  { icon: <GearSix    weight="fill" style={{ width: 20, height: 20 }} />, label: 'Settings',     sub: 'Appearance, notifications, accessibility', path: '/settings' },
  { icon: <CreditCard weight="fill" style={{ width: 20, height: 20 }} />, label: 'Subscription', sub: 'Plan, billing, and payment',              path: '/subscription', accent: 'var(--color-cta)' },
  { icon: <Microphone weight="fill" style={{ width: 20, height: 20 }} />, label: 'Voice Studio', sub: 'Choose your Narvo voice',                 path: '/voices' },
  { icon: <ChartLine  weight="fill" style={{ width: 20, height: 20 }} />, label: 'Insights',     sub: 'Listening history and habits',            path: '/insights' },
];

/* ─── Main ─── */
const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const insightsKey = user?.id ? `api/insights/summary/${user.id}` : null;
  const { data: insights } = useSWR<InsightsSummary>(insightsKey, fetcher);

  const displayName = user?.user_metadata?.display_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Narvo Listener';
  const email = user?.email ?? '';

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); navigate('/'); }
    catch { setSigningOut(false); }
  };

  const spring = { type: 'spring' as const, stiffness: 260, damping: 20 };

  const stats = [
    { icon: <Clock     style={{ width: 16, height: 16 }} weight="fill" />, label: 'Time listened',     value: formatHours(insights?.total_listened) },
    { icon: <Headphones style={{ width: 16, height: 16 }} weight="fill" />, label: 'Stories completed', value: String(insights?.stories_completed ?? 0) },
    { icon: <Fire      style={{ width: 16, height: 16 }} weight="fill" />, label: 'Day streak',         value: `${insights?.streak_days ?? 0}d` },
  ];

  return (
    <>
      <Helmet>
        <title>Profile — Narvo</title>
        <meta name="description" content="Your profile, listening stats, and account settings." />
      </Helmet>

      <div className="page-scroll pb-safe">
        <div className="page-container" style={{ paddingTop: 24, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ══ IDENTITY CARD ══ */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            style={{ background: 'var(--color-primary)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar initials */}
              <div style={{ width: 60, height: 60, borderRadius: 9999, background: 'rgba(255,201,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,201,38,0.30)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--color-accent)', letterSpacing: '-0.02em' }}>
                  {initials(displayName, email)}
                </span>
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--color-accent)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                  {displayName}
                </h1>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,201,38,0.55)', marginTop: 3, letterSpacing: '0.03em' }}>
                  {email}
                </p>
              </div>
            </div>

            {/* Listening stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
              {stats.map(({ icon, label, value }) => (
                <div key={label} style={{ padding: '14px 10px', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,201,38,0.5)', display: 'flex' }}>{icon}</div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--color-accent)', lineHeight: 1 }}>
                    {value}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(255,201,38,0.45)', textTransform: 'uppercase', letterSpacing: '0.10em', lineHeight: 1.3 }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Favourite category badge */}
            {insights?.favourite_category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,201,38,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Top category</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', background: 'rgba(255,201,38,0.12)', padding: '3px 10px', borderRadius: 9999, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {insights.favourite_category}
                </span>
              </div>
            )}
          </motion.div>

          {/* ══ QUICK-ACCESS TILES ══ */}
          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-primary)', letterSpacing: '-0.01em', marginBottom: 12 }}>
              Account
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
              {TILES.map((tile, i) => (
                <motion.button
                  key={tile.path}
                  type="button"
                  onClick={() => navigate(tile.path)}
                  initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ ...spring, delay: i * 0.05 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--color-surface)', border: 'none', borderBottom: i < TILES.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 150ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(24,84,42,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
                >
                  {/* Icon circle */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(24,84,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: tile.accent ?? 'var(--color-primary)' }}>
                    {tile.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 2 }}>
                      {tile.label}
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-mid)' }} className="line-clamp-1">
                      {tile.sub}
                    </p>
                  </div>

                  <CaretRight style={{ width: 16, height: 16, color: 'var(--color-text-meta)', flexShrink: 0 }} />
                </motion.button>
              ))}
            </div>
          </section>

          {/* ══ SIGN OUT ══ */}
          <section>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 18px', background: 'rgba(213,37,24,0.05)', border: '1px solid rgba(213,37,24,0.15)', borderRadius: 12, cursor: signingOut ? 'not-allowed' : 'pointer', opacity: signingOut ? 0.6 : 1, transition: 'all 150ms' }}
              onMouseEnter={e => { if (!signingOut) (e.currentTarget as HTMLElement).style.background = 'rgba(213,37,24,0.09)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(213,37,24,0.05)'; }}
            >
              <SignOut style={{ width: 18, height: 18, color: 'var(--color-urgent)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--color-urgent)' }}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </span>
            </button>

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-meta)', textAlign: 'center', marginTop: 20, letterSpacing: '0.06em' }}>
              NARVO INTELLIGENCE LTD. · v{import.meta.env.VITE_APP_VERSION ?? '1.0'}
            </p>
          </section>

        </div>
      </div>
    </>
  );
};

export default ProfilePage;
