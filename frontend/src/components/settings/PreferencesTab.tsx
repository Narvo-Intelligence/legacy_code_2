import { motion } from 'framer-motion';
import { Globe } from '@phosphor-icons/react/Globe';
import { Bell } from '@phosphor-icons/react/Bell';
import { Newspaper } from '@phosphor-icons/react/Newspaper';
import { SpeakerHigh } from '@phosphor-icons/react/SpeakerHigh';
import { RocketLaunch } from '@phosphor-icons/react/RocketLaunch';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';
import { CaretRight } from '@phosphor-icons/react/CaretRight';

import ToggleRow from './ToggleRow';

import { TFunction } from 'i18next';

interface PreferencesTabProps {
  theme: string;
  setTheme: (t: string) => void;
  language: string;
  setLanguage: (l: string) => void;
  notifications: { breaking: boolean; digest: boolean; mentions: boolean };
  setNotifications: (n: any) => void;
  interests: string[];
  setInterests: (i: string[]) => void;
  soundTheme: string;
  setSoundTheme: (s: string) => void;
  alertVolume: number;
  setAlertVolume: (v: number) => void;
  aggregators: { google: boolean; bing: boolean; apple: boolean };
  setAggregators: (a: any) => void;
  prefLoading: boolean;
  prefSaveStatus: 'saving' | 'saved' | null;
  t: TFunction;
}

const PreferencesTab = ({
  theme, setTheme,
  language, setLanguage,
  notifications, setNotifications,
  interests, setInterests,
  soundTheme, setSoundTheme,
  alertVolume, setAlertVolume,
  prefLoading,
  prefSaveStatus,
}: PreferencesTabProps) => {

  const themeOptions = [
    { id: 'light', label: 'Light', color: '#FFFFFF', border: '#E2E8F0' },
    { id: 'dark', label: 'Dark', color: '#0F172A', border: '#1E293B' },
    { id: 'system', label: 'System', color: 'linear-gradient(135deg, #FFFFFF 50%, #0F172A 50%)', border: '#CBD5E1' }
  ];

  const languages = [
    { id: 'en', label: 'English (US)' },
    { id: 'es', label: 'Español' },
    { id: 'fr', label: 'Français' },
    { id: 'de', label: 'Deutsch' }
  ];

  const interestOptions = ['Technology', 'Finance', 'Global Politics', 'Science', 'Culture', 'Sports', 'Environment'];

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  if (prefLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64, gap: 12 }}>
        <CircleNotch weight="bold" style={{ width: 24, height: 24, color: 'var(--color-primary)' }} className="animate-spin" />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-mid)' }}>Loading your preferences…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Save Status Overlay (Subtle) */}
      {prefSaveStatus && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          style={{ 
            position: 'fixed', top: 100, right: 32, zIndex: 100,
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', 
            borderRadius: 12, background: 'var(--color-bg-panel)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(15,95,115,0.2)', backdropFilter: 'blur(10px)'
          }}
        >
          {prefSaveStatus === 'saving' ? (
            <CircleNotch weight="bold" style={{ width: 16, height: 16, color: 'var(--color-primary)' }} className="animate-spin" />
          ) : (
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 10 }}>✓</span>
            </div>
          )}
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--color-primary)', letterSpacing: '0.02em' }}>
            {prefSaveStatus === 'saving' ? 'UPDATING PREFERENCES...' : 'PREFERENCES SYNCED'}
          </span>
        </motion.div>
      )}

      {/* Appearance */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16, paddingLeft: 8 }}>
          Appearance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {themeOptions.map(opt => (
            <button 
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className="glass-panel"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 12px',
                border: theme === opt.id ? '2px solid var(--color-primary)' : '1px solid rgba(15,95,115,0.1)',
                background: theme === opt.id ? 'rgba(15,95,115,0.04)' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', transition: 'all 200ms ease', width: '100%'
              }}
            >
              <div style={{ width: 48, height: 32, borderRadius: 6, background: opt.color, border: `1px solid ${opt.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: theme === opt.id ? 'var(--color-primary)' : 'var(--color-text-mid)' }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Language */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16, paddingLeft: 8 }}>
          Language & Localization
        </h3>
        <div className="glass-panel" style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {languages.map(lang => (
            <button 
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
                borderRadius: 8, background: language === lang.id ? 'rgba(15,95,115,0.06)' : 'transparent',
                border: 'none', cursor: 'pointer', width: '100%', transition: 'all 200ms'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Globe weight={language === lang.id ? "fill" : "bold"} style={{ width: 18, height: 18, color: language === lang.id ? 'var(--color-primary)' : 'var(--color-text-mid)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: language === lang.id ? 'var(--color-primary)' : 'var(--color-text-main)' }}>{lang.label}</span>
              </div>
              {language === lang.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }} />}
            </button>
          ))}
        </div>
      </section>

      {/* Interests */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16, paddingLeft: 8 }}>
          Content Interests
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {interestOptions.map(interest => (
            <button 
              key={interest}
              onClick={() => toggleInterest(interest)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: '1px solid rgba(15,95,115,0.2)',
                background: interests.includes(interest) ? 'var(--color-primary)' : 'transparent',
                color: interests.includes(interest) ? 'white' : 'var(--color-primary)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 200ms ease'
              }}
            >
              {interest}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16, paddingLeft: 8 }}>
          Notifications
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ToggleRow 
            icon={<Bell weight="bold" style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />} 
            label="Breaking News Alerts" 
            desc="Instant notifications for critical global events" 
            checked={notifications.breaking} 
            onChange={() => setNotifications((prev: any) => ({ ...prev, breaking: !prev.breaking }))} 
          />
          <ToggleRow 
            icon={<Newspaper weight="bold" style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />} 
            label="Daily Digest" 
            desc="A curated summary of stories sent every morning" 
            checked={notifications.digest} 
            onChange={() => setNotifications((prev: any) => ({ ...prev, digest: !prev.digest }))} 
          />
        </div>
      </section>

      {/* Sound & Haptics (System ports) */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16, paddingLeft: 8 }}>
          Sound & Systems
        </h3>
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <SpeakerHigh weight="bold" style={{ width: 18, height: 18, color: 'var(--color-primary)' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>Alert Volume</span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>{alertVolume}%</span>
          </div>
          <input 
            type="range" min={0} max={100} value={alertVolume} 
            onChange={(e) => setAlertVolume(parseInt(e.target.value, 10))} 
            style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />

          <div style={{ height: 1, background: 'rgba(15,95,115,0.1)' }} />

          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 12 }}>Sound Theme</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Sonic', 'Minimal', 'Classic'].map(s => (
                <button 
                  key={s} onClick={() => setSoundTheme(s)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(15,95,115,0.1)',
                    background: soundTheme === s ? 'rgba(15,95,115,0.08)' : 'transparent',
                    color: soundTheme === s ? 'var(--color-primary)' : 'var(--color-text-mid)',
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* App Tour */}
      <section>
        <button type="button" className="glass-panel" style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          width: '100%', padding: '20px 24px', border: '1px solid rgba(15,95,115,0.15)',
          background: 'linear-gradient(90deg, rgba(15,95,115,0.05), transparent)',
          cursor: 'pointer'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RocketLaunch weight="fill" style={{ width: 22, height: 22, color: 'white' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', margin: 0 }}>Launch Tutorial</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-mid)', margin: 0 }}>Re-explore the Narvo v5.1 interface</p>
            </div>
          </div>
          <CaretRight weight="bold" style={{ width: 20, height: 20, color: 'var(--color-primary)', opacity: 0.5 }} />
        </button>
      </section>

    </div>
  );
};

export default PreferencesTab;
