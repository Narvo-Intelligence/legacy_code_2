import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useSWR from 'swr';

import { Clock }          from '@phosphor-icons/react/Clock';
import { Headphones }     from '@phosphor-icons/react/Headphones';
import { Fire }           from '@phosphor-icons/react/Fire';
import { SignOut }        from '@phosphor-icons/react/SignOut';

import { useAuth }  from '../../contexts/AuthContext';
import * as api     from '../../lib/api';

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

const AccountTab = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const insightsKey = user?.id ? `api/me/insights/summary/${user.id}` : null;
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
    { icon: <Clock weight="fill" />, label: 'Time listened', value: formatHours(insights?.total_listened) },
    { icon: <Headphones weight="fill" />, label: 'Completed', value: String(insights?.stories_completed ?? 0) },
    { icon: <Fire weight="fill" />, label: 'Day streak', value: `${insights?.streak_days ?? 0}d` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* ══ IDENTITY CARD ══ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        className="glass-panel"
        style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Avatar Area */}
          <div style={{ 
            width: 72, height: 72, borderRadius: 24, 
            background: 'var(--color-primary)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            boxShadow: '0 8px 16px rgba(15,95,115,0.2)' 
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: '#fff', letterSpacing: '-0.02em' }}>
              {initials(displayName, email)}
            </span>
          </div>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--color-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {displayName}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-mid)', marginTop: 4, letterSpacing: '0.02em', opacity: 0.7 }}>
              {email}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', 
          background: 'rgba(15,95,115,0.05)', 
          borderRadius: 20, padding: '16px 8px' 
        }}>
          {stats.map(({ icon, label, value }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
              <div style={{ color: 'var(--color-primary)', opacity: 0.6 }}>{icon}</div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--color-primary)', lineHeight: 1 }}>
                {value}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Favorite Category Badge */}
        {insights?.favourite_category && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-primary)', opacity: 0.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Top Interest</span>
            <span style={{ 
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, 
              color: 'var(--color-primary)', background: 'rgba(15,95,115,0.1)', 
              padding: '4px 12px', borderRadius: 20, letterSpacing: '0.02em', textTransform: 'uppercase' 
            }}>
              {insights.favourite_category}
            </span>
          </div>
        )}
      </motion.div>

      {/* ══ ACTIONS ══ */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', paddingLeft: 8 }}>
          Session
        </h3>
        
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="glass-panel"
          style={{ 
            display: 'flex', alignItems: 'center', gap: 14, 
            width: '100%', padding: '18px 20px', 
            border: '1px solid rgba(213,37,24,0.1)',
            cursor: signingOut ? 'not-allowed' : 'pointer', 
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)' 
          }}
          onMouseEnter={e => { if (!signingOut) (e.currentTarget as HTMLElement).style.background = 'rgba(213,37,24,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <div style={{ 
            width: 32, height: 32, borderRadius: 8, 
            background: 'rgba(213,37,24,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <SignOut weight="bold" style={{ width: 18, height: 18, color: '#D52518' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: '#D52518' }}>
            {signingOut ? 'Signing out…' : 'Log out of Narvo'}
          </span>
        </button>
      </section>

      {/* ══ FOOTER ══ */}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-meta)', textAlign: 'center', marginTop: 8, opacity: 0.5 }}>
        NARVO INTELLIGENCE LTD. · v{import.meta.env.VITE_APP_VERSION ?? '1.1'}
      </p>

    </div>
  );
};

export default AccountTab;
