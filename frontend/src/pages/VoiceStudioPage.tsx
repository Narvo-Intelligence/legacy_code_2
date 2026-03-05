import { useState, useEffect, useRef, useCallback } from 'react';
import { Waveform, Radio, Check, SpeakerHigh, Stop, CircleNotch, Translate } from '@phosphor-icons/react';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useHapticAlert } from '../components/HapticAlerts';
import Skeleton from '../components/Skeleton';
import BackToSettings from '../components/BackToSettings';
import * as api from '../lib/api';
import { getTtsPreviewSample } from '../constants/tts';

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

const VoiceStudioPage = () => {
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
    const fetchData = async () => {
      try {
        const userId = user?.id || 'guest';
        const [voicesRes, settingsRes] = await Promise.all([
          api.get('api/voices'),
          api.get(`api/settings/${userId}`),
        ]);
        const voicesData = await voicesRes.json() as VoiceItem[];
        setVoices(Array.isArray(voicesData) ? voicesData : []);

        if (settingsRes.ok) {
          const s = await settingsRes.json() as { voice_model?: string };
          const saved = voicesData.find(v => v.id === s.voice_model);
          setSelectedVoice(saved || voicesData[0] || null);
        } else if (voicesData.length > 0) {
          setSelectedVoice(voicesData[0]);
        }
      } catch (err) {
        console.error('Failed to load voices:', err);
      }
      setLoading(false);
    };
    fetchData();
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
      const existing = JSON.parse(localStorage.getItem('narvo_settings_cache') || '{}') as Record<string, unknown>;
      localStorage.setItem('narvo_settings_cache', JSON.stringify({
        ...existing,
        voice_model: voice.id,
        broadcast_language: voice.language || 'en',
      }));
      setBroadcastLanguage(voice.language || 'en');
      setVoiceModel(voice.id);
    } catch (_) { /* ignore */ }
  }, [user?.id, setBroadcastLanguage, setVoiceModel]);

  const selectVoice = (voice: VoiceItem) => {
    setSelectedVoice(voice);
    setSaving(true);
    saveVoiceToBackend(voice).finally(() => setSaving(false));
    const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent;
    playPreview(syntheticEvent, voice);
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
    } catch {
      showAlert({ type: 'warning', title: 'PREVIEW_FAILED', message: 'Could not generate voice preview.', code: 'TTS_ERR', duration: 3000 });
    } finally {
      setPreviewLoading(null);
    }
  };

  const isActive = (voice: VoiceItem) => selectedVoice?.id === voice.id;

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-background-dark overflow-hidden" data-testid="voice-studio-page">
      <div className="p-4 md:p-8 narvo-border-b shrink-0">
        <div className="mb-4">
          <BackToSettings />
        </div>
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-3 md:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Translate className="w-4 h-4 text-primary" />
              <span className="mono-ui text-[10px] md:text-[11px] text-primary font-bold tracking-widest">AUDIO_TRANSLATION_ENGINE</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-content uppercase tracking-tight">
              VOICE_MATRIX
            </h2>
            <p className="mono-ui text-[10px] md:text-[11px] text-forest font-bold mt-1">
              SELECT_ENTITY_MODEL — SETS_VOICE_AND_BROADCAST_LANGUAGE
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="mono-ui text-[10px] text-forest">NODE: LAG_88_V</span>
            <span className="mono-ui text-[10px] text-forest/40 hidden sm:inline">/</span>
            <span className="mono-ui text-[10px] text-forest hidden sm:inline">48kHz / 32bit</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll p-4 md:p-8 pb-32 md:pb-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="narvo-border p-5 md:p-6 flex flex-col gap-4">
                <Skeleton variant="text" className="w-20 h-4" />
                <Skeleton variant="text" className="w-32 h-8" />
                <div className="h-16 narvo-border bg-background-dark/20" />
                <Skeleton variant="text" className="w-full h-4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {voices.map((voice) => {
              const active = isActive(voice);
              const lang = LANG_META[voice.language || 'en'] || { native: voice.language || 'en', region: 'UNKNOWN' };
              return (
                <div
                  key={voice.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectVoice(voice)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectVoice(voice); } }}
                  aria-label={`Select voice ${voice.name}`}
                  className={`narvo-border p-5 md:p-6 flex flex-col cursor-pointer transition-all relative group ${
                    active
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-forest hover:bg-surface/20'
                  }`}
                  data-testid={`voice-card-${voice.id}`}
                >
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <span className={`mono-ui text-[9px] md:text-[10px] px-2 py-0.5 font-bold ${
                      active ? 'bg-primary text-background-dark' : 'border border-forest text-forest'
                    }`}>
                      {active ? 'ACTIVE_MODEL' : 'STANDBY'}
                    </span>
                    <span className={`mono-ui text-[9px] md:text-[10px] px-2 py-0.5 font-bold ${
                      active ? 'bg-background-dark text-primary' : 'bg-forest/20 text-forest'
                    }`} data-testid={`broadcast-lang-${voice.language || 'en'}`}>
                      {lang.region}
                    </span>
                  </div>

                  <h3 className="font-display text-xl md:text-2xl font-bold text-content uppercase leading-tight">
                    {voice.name.replace(' ', '_')}
                  </h3>
                  <span className="mono-ui text-[11px] md:text-[12px] text-forest mt-1">
                    {voice.accent} / {lang.native}
                  </span>

                  <div className="h-14 md:h-16 narvo-border bg-background-dark/20 flex items-center justify-center mt-4 mb-4 overflow-hidden relative">
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{ backgroundImage: 'linear-gradient(45deg, #628141 25%, transparent 25%, transparent 50%, #628141 50%, #628141 75%, transparent 75%, transparent)', backgroundSize: '20px 20px' }}
                    />
                    {active ? (
                      <Waveform className="w-8 h-8 text-primary opacity-60" />
                    ) : (
                      <Radio className="w-8 h-8 text-forest opacity-30" />
                    )}
                  </div>

                  <div className="flex items-center justify-between narvo-border-t border-forest/30 pt-3">
                    <div className="min-w-0">
                      <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold block truncate">
                        {voice.description}
                      </span>
                      <span className={`mono-ui text-[9px] md:text-[10px] font-bold mt-0.5 block ${active ? 'text-primary' : 'text-forest/50'}`}>
                        {active ? 'SIGNAL_STABLE' : 'NODE_IDLE'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => playPreview(e, voice)}
                      className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center narvo-border transition-all shrink-0 ml-3 ${
                        previewPlaying === voice.id
                          ? 'bg-primary text-background-dark border-primary'
                          : 'bg-surface/20 text-forest hover:bg-primary hover:text-background-dark hover:border-primary'
                      }`}
                      data-testid={`voice-preview-${voice.id}`}
                    >
                      {previewLoading === voice.id ? (
                        <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                      ) : previewPlaying === voice.id ? (
                        <Stop weight="fill" className="w-3.5 h-3.5" />
                      ) : (
                        <SpeakerHigh weight="bold" className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 mono-ui text-[10px] md:text-[11px] text-forest/40">
          SELECTING_A_MODEL_SETS_BOTH_VOICE_AND_BROADCAST_LANGUAGE — INTERFACE_TEXT_LANGUAGE_IS_SET_IN_SETTINGS
        </p>
      </div>

      {selectedVoice && (
        <div className="narvo-border-t p-4 md:p-6 bg-surface/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 narvo-border bg-primary/20 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-content font-display font-bold text-sm block truncate">{selectedVoice.name}</span>
              <span className="mono-ui text-[10px] text-forest block truncate">
                {selectedVoice.accent} / {LANG_META[selectedVoice.language || 'en']?.native || selectedVoice.language}
              </span>
            </div>
          </div>
          <span className="mono-ui text-[10px] md:text-[11px] text-primary font-bold shrink-0" data-testid="voice-save-status">
            {saving ? 'SAVING...' : 'AUTO_SAVED'}
          </span>
        </div>
      )}
    </main>
  );
};

export default VoiceStudioPage;
