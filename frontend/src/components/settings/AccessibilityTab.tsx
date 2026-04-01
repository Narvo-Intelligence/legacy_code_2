import { motion } from 'framer-motion';
import { TextT } from '@phosphor-icons/react/TextT';
import { HandPointing } from '@phosphor-icons/react/HandPointing';
import { Microphone } from '@phosphor-icons/react/Microphone';
import { Sun } from '@phosphor-icons/react/Sun';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';
import { Info } from '@phosphor-icons/react/Info';

import ToggleRow from './ToggleRow';

import { TFunction } from 'i18next';

interface AccessibilityTabProps {
  density: string;
  setDensity: (d: string) => void;
  fontScale: number;
  setFontScale: (s: number) => void;
  gestures: { lateralSwipe: boolean; pinchZoom: boolean };
  setGestures: (g: any) => void;
  voiceCmd: boolean;
  setVoiceCmd: (v: any) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  a11yLoading: boolean;
  a11ySaveStatus: 'saving' | 'saved' | null;
  t: TFunction;
}

const AccessibilityTab = ({
  density, setDensity,
  fontScale, setFontScale,
  gestures, setGestures,
  voiceCmd, setVoiceCmd,
  highContrast, setHighContrast,
  a11yLoading,
  a11ySaveStatus,
  t
}: AccessibilityTabProps) => {

  const densityOptions = [
    { id: 'compact',  label: t('accessibility.compact', 'Compact'),  desc: 'More content, less spacing' },
    { id: 'standard', label: t('accessibility.standard', 'Standard'), desc: 'Balanced — recommended' },
    { id: 'expanded', label: t('accessibility.expanded', 'Expanded'), desc: 'More whitespace, easier reading' },
  ];

  if (a11yLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64, gap: 12 }}>
        <CircleNotch weight="bold" style={{ width: 24, height: 24, color: 'var(--color-primary)' }} className="animate-spin" />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-mid)' }}>Loading accessibility profile…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Save Status */}
      {a11ySaveStatus && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', 
            borderRadius: 8, background: 'rgba(15,95,115,0.05)', width: 'fit-content' 
          }}
        >
          {a11ySaveStatus === 'saving' ? (
            <CircleNotch weight="bold" style={{ width: 14, height: 14, color: 'var(--color-primary)' }} className="animate-spin" />
          ) : (
            <span style={{ color: 'var(--color-primary)', fontSize: 14 }}>✓</span>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--color-primary)' }}>
            {a11ySaveStatus === 'saving' ? 'SYNCING...' : 'SAVED'}
          </span>
        </motion.div>
      )}

      {/* Visual Contrast */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 8 }}>
          Visual
        </h3>
        <ToggleRow 
          icon={<Sun weight="bold" style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />} 
          label={t('system_settings.high_contrast', 'High contrast')} 
          desc={t('system_settings.high_contrast_desc', 'Increase UI contrast for better readability')} 
          checked={highContrast} 
          onChange={() => setHighContrast(!highContrast)} 
        />
      </section>

      {/* Display Density */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 8 }}>
          Display Density
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {densityOptions.map(option => (
            <label key={option.id} className="glass-panel" style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', cursor: 'pointer',
              border: density === option.id ? '2px solid var(--color-primary)' : '1px solid rgba(15,95,115,0.1)',
              background: density === option.id ? 'rgba(15,95,115,0.03)' : 'transparent',
              transition: 'all 200ms ease'
            }}>
              <input type="radio" name="density" checked={density === option.id} onChange={() => setDensity(option.id)} style={{ display: 'none' }} />
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>{option.label}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-mid)', margin: 0 }}>{option.desc}</p>
              </div>
              <div style={{ 
                width: 20, height: 20, borderRadius: '50%', 
                border: `2px solid ${density === option.id ? 'var(--color-primary)' : 'rgba(15,95,115,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {density === option.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />}
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Font Scaling */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 8 }}>
          Text Size
        </h3>
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(15,95,115,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TextT weight="bold" style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--color-primary)' }}>Scale</span>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--color-primary)' }}>{fontScale}%</span>
          </div>
          
          <input 
            type="range" min={75} max={150} value={fontScale} 
            onChange={(e) => setFontScale(parseInt(e.target.value, 10))} 
            style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-meta)', opacity: 0.6 }}>
            <span>Compact</span>
            <span>Standard</span>
            <span>Accessibility</span>
          </div>

          <div style={{ padding: 16, background: 'rgba(15,95,115,0.03)', borderRadius: 12, border: '1px dashed rgba(15,95,115,0.1)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-meta)', textTransform: 'uppercase', marginBottom: 8 }}>Interface Preview</p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-primary)', fontSize: `${Math.round(18 * fontScale / 100)}px`, lineHeight: 1.2 }}>
              Narvo Intelligence: Broadcast Stable
            </p>
          </div>
        </div>
      </section>

      {/* Interaction */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 8 }}>
          Interaction
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ToggleRow 
            icon={<HandPointing weight="bold" style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />} 
            label={t('accessibility.lateral_swipe', 'Swipe to refresh')} 
            desc="Enable pull-to-refresh gestures in story feeds" 
            checked={gestures.lateralSwipe} 
            onChange={() => setGestures((p: any) => ({ ...p, lateralSwipe: !p.lateralSwipe }))} 
          />
          <ToggleRow 
            icon={<HandPointing weight="bold" style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />} 
            label={t('accessibility.pinch_zoom', 'Pinch to zoom')} 
            desc="Enable multi-touch zoom on images and text" 
            checked={gestures.pinchZoom} 
            onChange={() => setGestures((p: any) => ({ ...p, pinchZoom: !p.pinchZoom }))} 
          />
          <ToggleRow 
            icon={<Microphone weight="fill" style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />} 
            label={t('accessibility.voice_commands', 'Voice commands')} 
            desc="Control Narvo via 'Open Newsfeed' or 'Play Briefing'" 
            checked={voiceCmd} 
            onChange={() => setVoiceCmd((v: any) => !v)} 
          />
        </div>
      </section>

      {/* Note */}
      <div style={{ 
        display: 'flex', gap: 12, padding: 16, 
        background: 'rgba(15,95,115,0.05)', borderRadius: 16, 
        border: '1px solid rgba(15,95,115,0.1)' 
      }}>
        <Info weight="fill" style={{ width: 16, height: 16, color: 'var(--color-primary)', marginTop: 2 }} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-mid)', lineHeight: 1.5, margin: 0 }}>
          Accessibility settings are synchronized across all your active Narvo nodes instantly.
        </p>
      </div>

    </div>
  );
};

export default AccessibilityTab;
