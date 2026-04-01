import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Waveform } from '@phosphor-icons/react/Waveform';
import { Radio } from '@phosphor-icons/react/Radio';
import { Check } from '@phosphor-icons/react/Check';
import { SpeakerHigh } from '@phosphor-icons/react/SpeakerHigh';
import { Stop } from '@phosphor-icons/react/Stop';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';
import { Translate } from '@phosphor-icons/react/Translate';

import { useAudio } from '../../contexts/AudioContext';
import { useAuth } from '../../contexts/AuthContext';
import { useHapticAlert } from '../HapticAlerts';
import * as api from '../../lib/api';
import { getTtsPreviewSample } from '../../constants/tts';
import logger from '../../lib/logger';
import { mergeJson } from '../../lib/storage';
import { asArray, asRecord } from '../../lib/validators';

interface VoiceItem {
  id: string;
  name: string;
  language?: string;
  accent?: string;
  description?: string;
}

const LANG_META: Record<string, { native: string; region: string }> = {
  yo:  { native: 'Yoruba',        region: 'ILU_YORUBA' },
  en:  { native: 'English',       region: 'INTERNATIONAL' },
  ha:  { native: 'Hausa',         region: 'AREWACIN_NAJERIYA' },
  ig:  { native: 'Igbo',          region: 'ALA_IGBO' },
  pcm: { native: 'Pidgin',        region: 'PIDGIN_NAIJA' },
};

// TFunction removed as it was unused

// VoiceTabProps removed as it was unused

const VoiceTab = () => {
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const { setBroadcastLanguage, setVoiceModel } = useAudio();
  const { user } = useAuth();
  const { showAlert } = useHapticAlert();

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const userId = user?.id || 'guest';
        const [voicesRes, settingsRes] = await Promise.all([
          api.get('api/voices'),
          api.get(`api/settings/${userId}`),
        ]);
        const voicesJson = await voicesRes.json();
        const voicesData = asArray<VoiceItem>(voicesJson, (v: any): v is VoiceItem => typeof v?.id === 'string' && typeof v?.name === 'string');
        if (!cancelled) setVoices(voicesData);

        if (settingsRes.ok) {
          const s = asRecord<{ voice_model?: string }>(await settingsRes.json(), {});
          const saved = voicesData.find(v => v.id === s.voice_model);
          if (!cancelled) setSelectedVoice(saved || voicesData[0] || null);
        } else if (voicesData.length > 0) {
          if (!cancelled) setSelectedVoice(voicesData[0]);
        }
      } catch (err) {
        logger.debug('[VoiceTab] Failed to load voices', err);
      }
      if (!cancelled) setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    return () => { if (previewAudioRef.current) previewAudioRef.current.pause(); };
  }, []);

  const saveVoiceToBackend = useCallback(async (voice: VoiceItem) => {
    if (!voice) return;
    const userId = user?.id || 'guest';
    try {
      await api.post(`api/settings/${userId}`, {
        voice_model: voice.id,
        broadcast_language: voice.language || 'en',
      });
      mergeJson('narvo_settings_cache', {
        voice_model: voice.id,
        broadcast_language: voice.language || 'en',
      }, {});
      setBroadcastLanguage(voice.language || 'en');
      setVoiceModel(voice.id);
    } catch (err) {
      logger.debug('[VoiceTab] Failed to save voice settings', err);
    }
  }, [user?.id, setBroadcastLanguage, setVoiceModel]);

  const selectVoice = (voice: VoiceItem) => {
    setSelectedVoice(voice);
    setSaving(true);
    saveVoiceToBackend(voice).finally(() => setSaving(false));
  };

  const playPreview = async (e: React.MouseEvent, voice: VoiceItem) => {
    e.stopPropagation();
    if (previewPlaying === voice.id) {
      if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
      setPreviewPlaying(null);
      return;
    }
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
    setPreviewLoading(voice.id);
    setPreviewPlaying(null);
    try {
      const sample = getTtsPreviewSample(voice.language);
      const res = await api.post('api/tts/generate', {
        text: sample,
        voice_id: voice.id,
        language: voice.language || 'en',
        skip_translation: true,
      });
      if (!res.ok) throw new Error('TTS failed');
      const data = await res.json() as { audio_url: string };
      const audio = new Audio(data.audio_url);
      previewAudioRef.current = audio;
      audio.onended = () => { setPreviewPlaying(null); previewAudioRef.current = null; };
      audio.onerror = () => { setPreviewPlaying(null); previewAudioRef.current = null; };
      await audio.play();
      setPreviewPlaying(voice.id);
    } catch (err) {
      logger.debug('[VoiceTab] Failed to play voice preview', err);
      showAlert({ type: 'warning', title: 'PREVIEW_FAILED', message: 'Could not generate voice preview.', code: 'TTS_ERR', duration: 3000 });
    } finally {
      setPreviewLoading(null);
    }
  };

  const spring = { type: 'spring' as const, stiffness: 260, damping: 20 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Translate weight="bold" style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-primary)', fontWeight: 700, letterSpacing: '0.1em' }}>
            NARVO_VOICE_MATRIX
          </span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
          Voice Studio
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-mid)', marginTop: 4 }}>
          Select an entity model to set your broadcast language and tone.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} className="glass-panel animate-pulse" style={{ padding: 20 }}>
              <div style={{ height: 20, width: '40%', background: 'rgba(15,95,115,0.08)', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ height: 32, width: 32, background: 'rgba(15,95,115,0.08)', borderRadius: 8 }} />
                <div style={{ height: 20, width: '60%', background: 'rgba(15,95,115,0.08)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {voices.map((voice) => {
            const active = selectedVoice?.id === voice.id;
            const lang = LANG_META[voice.language || 'en'] || { native: voice.language || 'en', region: 'UNKNOWN' };
            
            return (
              <motion.div
                key={voice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring}
                onClick={() => selectVoice(voice)}
                className="glass-panel"
                style={{ 
                  padding: 20, 
                  cursor: 'pointer',
                  border: active ? '2px solid var(--color-primary)' : '1px solid rgba(15,95,115,0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {active && (
                  <div style={{ 
                    position: 'absolute', top: 0, right: 0, 
                    background: 'var(--color-primary)', 
                    color: '#fff', fontSize: 9, fontWeight: 700, 
                    padding: '4px 12px', borderBottomLeftRadius: 12,
                    fontFamily: 'var(--font-mono)'
                  }}>
                    ACTIVE
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', fontSize: 10, 
                      color: active ? 'var(--color-primary)' : 'var(--color-text-mid)',
                      fontWeight: 700, letterSpacing: '0.05em'
                    }}>
                      {lang.region} / {lang.native}
                    </span>
                    <h3 style={{ 
                      fontFamily: 'var(--font-display)', fontWeight: 700, 
                      fontSize: 20, color: 'var(--color-primary)',
                      marginTop: 4
                    }}>
                      {voice.name}
                    </h3>
                    <p style={{ 
                      fontFamily: 'var(--font-body)', fontSize: 13, 
                      color: 'var(--color-text-mid)', marginTop: 4,
                      opacity: 0.8
                    }}>
                      {voice.description}
                    </p>
                  </div>

                  <button
                    onClick={(e) => playPreview(e, voice)}
                    style={{ 
                      width: 44, height: 44, borderRadius: 14,
                      background: previewPlaying === voice.id ? 'var(--color-primary)' : 'rgba(15,95,115,0.08)',
                      color: previewPlaying === voice.id ? '#fff' : 'var(--color-primary)',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms ease'
                    }}
                  >
                    {previewLoading === voice.id ? (
                      <CircleNotch weight="bold" style={{ width: 20, height: 20 }} className="animate-spin" />
                    ) : previewPlaying === voice.id ? (
                      <Stop weight="fill" style={{ width: 20, height: 20 }} />
                    ) : (
                      <SpeakerHigh weight="bold" style={{ width: 20, height: 20 }} />
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
                  <div style={{ 
                    height: 1, flex: 1, 
                    background: active ? 'rgba(15,95,115,0.2)' : 'rgba(15,95,115,0.05)' 
                  }} />
                  {active ? (
                    <Waveform style={{ width: 16, height: 16, color: 'var(--color-primary)', opacity: 0.5 }} />
                  ) : (
                    <Radio style={{ width: 16, height: 16, color: 'var(--color-text-mid)', opacity: 0.3 }} />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedVoice && (
        <div style={{ 
          marginTop: 8, padding: '12px 16px', 
          borderRadius: 16, background: 'rgba(15,95,115,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Check weight="bold" style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-primary)', fontWeight: 700 }}>
              {saving ? 'SYNCING_STATE...' : 'STATE_COMMITTED'}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-meta)' }}>
            v{import.meta.env.VITE_APP_VERSION ?? '1.1'}
          </span>
        </div>
      )}
    </div>
  );
};

export default VoiceTab;
