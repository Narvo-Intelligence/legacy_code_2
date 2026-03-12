import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import useSWR from 'swr';
import { Lightning } from '@phosphor-icons/react/Lightning';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { X } from '@phosphor-icons/react/X';
import { Play } from '@phosphor-icons/react/Play';
import { SpeakerHigh } from '@phosphor-icons/react/SpeakerHigh';
import { Bell } from '@phosphor-icons/react/Bell';
import { BellRinging } from '@phosphor-icons/react/BellRinging';
import Clock from '../components/Clock';
import NarvoLogo from '../components/NarvoLogo';
import { useAudio } from '../contexts/AudioContext';
import { getCachedAudio, cacheAudio } from '../lib/audioCache';
import { getTtsPreviewSample } from '../constants/tts';
import * as api from '../lib/api';
import { subscribeToPush } from '../lib/notificationService';
import logger from '../lib/logger';

const landingFetcher = async (path: string) => {
  const res = await api.get(path);
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

interface Voice {
    id: string;
    name: string;
    accent: string;
    gender: string;
    language?: string;
    description?: string;
}

interface LandingStory {
    id: string;
    title: string;
    summary?: string;
    short_summary?: string;
    narrative?: string;
    truth_score?: number;
    category?: string;
    source?: string;
    region?: string;
    published?: string;
    read_time?: string;
    [key: string]: unknown;
}

interface LandingMetrics {
    total_sources?: number;
    total_stories?: number;
    stories_processed?: number;
    broadcast_hours?: number;
    verification_apis?: number;
    total_listeners?: string;
    active_listeners?: number;
    broadcast_ready?: boolean;
    last_sync?: string;
    [key: string]: unknown;
}

const getPublicUrl = () =>
    import.meta.env.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const getLogStamp = () =>
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const LandingPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { data: news = [], error: newsError, isLoading: newsLoading } = useSWR<LandingStory[]>('api/news?limit=4', landingFetcher);
    const { data: breaking = [] } = useSWR<LandingStory[]>('api/news/breaking', landingFetcher);
    const { data: metrics = null } = useSWR<LandingMetrics | null>('api/metrics', landingFetcher);
    const [breakingDismissed, setBreakingDismissed] = useState(false);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    const [voices, setVoices] = useState<Voice[]>([]);
    const [previewLoading, setPreviewLoading] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const previewCacheRef = useRef<Record<string, string>>({});

    const { playTrack, stopTrack } = useAudio();

    const [regionalCity, setRegionalCity] = useState<'lagos' | 'abuja'>('lagos');
    const [regionalLabel, setRegionalLabel] = useState<string>('LAGOS, NIGERIA');
    const [pushEnabled, setPushEnabled] = useState(
        () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
    );
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [alertsError, setAlertsError] = useState<string | null>(null);

    useEffect(() => {
        api.get(`api/telemetry/regional-env?city=${regionalCity}`)
            .then((res) => res.ok ? res.json() : null)
            .then((data: { label?: string } | null) => data?.label && setRegionalLabel(data.label))
            .catch((err) => {
                logger.debug('[LandingPage] Failed to load regional environment', err);
            });
    }, [regionalCity]);

    useEffect(() => {
        if (isVoiceModalOpen && voices.length === 0) {
            api.get('api/voices')
                .then((r) => r.ok ? r.json() : [])
                .then((list: Voice[]) => setVoices(Array.isArray(list) ? list : []))
                .catch(() => setVoices([]));
        }
    }, [isVoiceModalOpen, voices.length]);

    const VOICE_PREVIEW_CACHE_PREFIX = 'voice_preview:';
    const isBroadcastReady = metrics?.broadcast_ready === true;

    const handleEnableAlerts = async () => {
        if (alertsLoading || pushEnabled) return;
        setAlertsError(null);
        setAlertsLoading(true);
        try {
            const subscription = await subscribeToPush();
            if (subscription) {
                setPushEnabled(true);
                setAlertsError(null);
            } else {
                setAlertsError('Allow notifications in your browser to enable 5AM alerts.');
            }
        } catch (err) {
            logger.debug('[LandingPage] Failed to enable alerts', err);
            setAlertsError('Could not enable alerts. Try again.');
        } finally {
            setAlertsLoading(false);
        }
    };

    const handleVoicePreview = async (voice: Voice) => {
        const voiceId = voice.id;
        const lang = voice.language?.toLowerCase().split('-')[0] || 'en';
        const sampleText = getTtsPreviewSample(lang);
        const cacheKey = `${voiceId}:${lang}`;
        const idbKey = `${VOICE_PREVIEW_CACHE_PREFIX}${cacheKey}`;

        setPreviewLoading(voiceId);
        setPreviewError(null);
        stopTrack();

        try {
            const memCached = previewCacheRef.current[cacheKey];
            if (memCached) {
                await playTrack(
                    { id: idbKey, title: `Narvo Voice: ${voice.name}`, url: memCached, source: 'VOICE_PREVIEW' },
                    true
                );
                setPreviewLoading(null);
                return;
            }

            const localCached = await getCachedAudio(idbKey);
            if (localCached?.audio_url) {
                previewCacheRef.current[cacheKey] = localCached.audio_url;
                await playTrack(
                    { id: idbKey, title: `Narvo Voice: ${voice.name}`, url: localCached.audio_url, source: 'VOICE_PREVIEW' },
                    true
                );
                setPreviewLoading(null);
                return;
            }

            const res = await api.post('api/tts/generate', {
                text: sampleText,
                voice_id: voiceId,
                language: lang,
                skip_translation: true,
            });
            if (!res.ok) throw new Error('TTS failed');
            const data = (await res.json()) as { audio_url?: string };
            if (!data.audio_url) {
                setPreviewLoading(null);
                setPreviewError(voiceId);
                return;
            }
            previewCacheRef.current[cacheKey] = data.audio_url;
            await cacheAudio(idbKey, data.audio_url, {
                title: `Narvo Voice: ${voice.name}`,
                source: 'VOICE_PREVIEW',
            });
            await playTrack(
                { id: idbKey, title: `Narvo Voice: ${voice.name}`, url: data.audio_url, source: 'VOICE_PREVIEW' },
                true
            );
            setPreviewLoading(null);
            return;
        } catch (error) {
            console.error('[VoiceMatrix] Error:', error);
            setPreviewLoading(null);
            setPreviewError(voiceId);
            return;
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col border-x border-forest max-w-[1440px] mx-auto relative bg-background-dark overflow-x-hidden"
            data-testid="landing-page"
        >
            <Helmet>
                <title>Narvo | The Local Pulse, Refined</title>
                <link rel="canonical" href={`${getPublicUrl()}/`} />
                <meta property="og:url" content={`${getPublicUrl()}/`} />
                <meta property="og:title" content="Narvo | The Local Pulse, Refined" />
                <meta property="og:description" content="Broadcast-grade, audio-first news platform. Native translation, regional voices, truth protocol." />
                <meta property="og:image" content={`${getPublicUrl()}/screenshot-wide.png`} />
                <meta property="og:image:alt" content="Narvo — Broadcast-grade, audio-first news platform for Africa" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Narvo | The Local Pulse, Refined" />
                <meta name="twitter:description" content="Broadcast-grade, audio-first news platform for Africa." />
                <meta name="twitter:image" content={`${getPublicUrl()}/screenshot-wide.png`} />
                <meta name="twitter:image:alt" content="Narvo — Broadcast-grade, audio-first news platform for Africa" />
            </Helmet>
            <header className="flex flex-col border-b border-forest">
                <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 px-4 sm:px-6 py-4 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
                        <NarvoLogo alt="Narvo" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tighter text-content">NARVO</h1>
                        <div className="hidden md:flex items-center gap-4 border-l border-forest pl-6 h-10 shrink-0">
                            <span className="mono-ui text-[12px] text-forest">SYSTEM_STATUS:</span>
                            <span className="mono-ui text-[12px] text-primary">100% // SOURCES: {metrics?.total_sources ?? 7}</span>
                        </div>
                    </div>
                    <nav className="hidden lg:flex items-center gap-8 shrink-0">
                        <a className="mono-ui text-[13px] hover:text-primary transition-colors text-slate-400" href="#about">ABOUT</a>
                        <a className="mono-ui text-[13px] hover:text-primary transition-colors text-slate-400" href="#why">WHY NARVO?</a>
                        <a className="mono-ui text-[13px] hover:text-primary transition-colors text-slate-400" href="#tech">TECHNOLOGY</a>
                    </nav>
                    <div className="flex items-center min-w-0 shrink overflow-hidden">
                        <div className="mono-ui text-[10px] sm:text-[13px] bg-forest/20 px-2 sm:px-3 py-1 border border-forest text-forest flex items-center gap-x-1.5 sm:gap-x-2 min-w-0">
                            {/* <span className="shrink-0">LOCAL:</span> */}
                            <button
                                type="button"
                                onClick={() => setRegionalCity((c) => (c === 'lagos' ? 'abuja' : 'lagos'))}
                                className="hover:text-primary transition-colors underline decoration-dotted text-left shrink min-w-0 truncate max-w-[100px] sm:max-w-none sm:overflow-visible sm:whitespace-normal"
                                title="Toggle Lagos / Abuja"
                            >
                                {regionalLabel}
                            </button>
                            <span className="opacity-80 shrink-0">{'//'}</span>
                            <Clock />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-forest/50 bg-background-dark/30 min-w-0 overflow-hidden" data-testid="command-center-bar">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
                    <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${isBroadcastReady ? 'bg-primary shadow-[0_0_8px_var(--color-primary)] animate-pulse' : 'bg-red-500'}`} aria-hidden />
                    <div className="min-w-0 overflow-hidden">
                        <span className="mono-ui text-[9px] sm:text-[10px] text-forest block truncate">SYSTEM_STATUS</span>
                        <span className="font-display text-[11px] sm:text-xs font-bold text-content truncate block">
                            {isBroadcastReady ? '5AM_BROADCAST_LIVE' : 'SYNCHRONIZING_FEED...'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 min-w-0 shrink-0">
                    {pushEnabled ? <BellRinging weight="fill" className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" /> : <Bell className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-forest/50 shrink-0" />}
                    <span className="mono-ui text-[9px] sm:text-[10px] text-forest whitespace-nowrap">5AM_ALERTS</span>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEnableAlerts(); }}
                        disabled={pushEnabled || alertsLoading}
                        className={`mono-ui text-[9px] sm:text-[10px] px-2 py-1.5 sm:px-2.5 sm:py-1 border shrink-0 min-h-[32px] sm:min-h-[36px] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${pushEnabled ? 'border-primary text-primary cursor-default' : 'border-forest text-forest hover:bg-forest/10 active:bg-forest/20 cursor-pointer active:scale-95'}`}
                        aria-label={pushEnabled ? '5AM alerts active' : 'Enable 5AM briefing alerts'}
                        data-testid="activate-alerts-btn"
                    >
                        {alertsLoading ? (
                            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
                        ) : pushEnabled ? (
                            '[ ACTIVE ]'
                        ) : (
                            '[ ACTIVATE ]'
                        )}
                    </button>
                </div>
            </div>
            {alertsError && (
                <p className="px-4 sm:px-6 py-1.5 mono-ui text-[10px] text-red-400 bg-red-950/30 border-b border-forest/50" role="alert">
                    {alertsError}
                </p>
            )}

            <section id="about" className="grid grid-cols-1 lg:grid-cols-12 border-b border-forest">
                <div className="lg:col-span-9 flex flex-col justify-center p-4 sm:p-6 lg:p-16 border-r-0 lg:border-r border-forest min-w-0">
                    <div className="mono-ui text-[12px] text-forest mb-4 sm:mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-forest block shrink-0" />
                        {t('landing.tagline')}
                    </div>
                    <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold leading-[0.95] sm:leading-[0.9] tracking-tighter text-content mb-6 sm:mb-8">
                        {t('landing.headline').split('\n').map((line, i) => (
                            <span key={i}>{i > 0 && <br />}{line}</span>
                        ))}
                    </h1>
                    <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-xl mb-8 sm:mb-12">{t('landing.description')}</p>
                    <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
                        <button
                            onClick={() => navigate('/auth')}
                            className="bg-primary text-background-dark font-display font-bold px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg hover:bg-white transition-all min-h-[44px] touch-manipulation"
                            data-testid="start-broadcast-btn"
                        >
                            [{t('landing.start_broadcast')}]
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsVoiceModalOpen(true)}
                            className="border border-primary text-primary font-display font-bold px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base hover:bg-primary hover:text-background-dark transition-all flex items-center gap-2 min-h-[48px] touch-manipulation"
                            title="Open Voice Matrix — listen to Narvo voices"
                            data-testid="hero-voice-preview-btn"
                        >
                            <SpeakerHigh weight="fill" className="w-5 h-5" />
                            Listen to Narvo
                        </button>
                    </div>
                    {!breakingDismissed && breaking.length > 0 && (
                        <div
                            className="mt-6 sm:mt-8 w-full min-w-0 bg-red-950/90 border border-red-500/50 px-3 sm:px-4 py-3 flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2 sm:gap-3 animate-pulse-subtle"
                            data-testid="landing-breaking-banner"
                        >
                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                                <Lightning weight="fill" className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                <span className="mono-ui text-[11px] md:text-[12px] text-red-400 font-bold tracking-widest">
                                    {t('notifications.breaking_news')}
                                </span>
                            </div>
                            <button onClick={() => navigate(`/news/${breaking[0].id}`)} className="flex-1 min-w-0 text-left group order-3 sm:order-2 w-full sm:w-auto">
                                <span className="mono-ui text-[12px] md:text-[13px] text-content font-bold line-clamp-2 group-hover:text-red-300 transition-colors break-words">
                                    {breaking[0].title}
                                </span>
                            </button>
                            <div className="flex items-center gap-2 shrink-0 order-2 sm:order-3 ml-auto sm:ml-0">
                                <button
                                    onClick={() => navigate(`/news/${breaking[0].id}`)}
                                    className="mono-ui text-[10px] text-red-400 font-bold hover:text-content transition-colors hidden sm:flex items-center gap-1"
                                >
                                    {t('notifications.read_now')}
                                    <ArrowRight weight="bold" className="w-3 h-3" />
                                </button>
                                <button onClick={() => setBreakingDismissed(true)} className="p-1.5 hover:bg-red-500/20 transition-colors touch-manipulation" aria-label="Dismiss">
                                    <X weight="bold" className="w-3 h-3 text-red-400" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-3 bg-background-dark flex flex-col min-w-0">
                    <div className="h-12 border-b border-forest flex items-center px-3 sm:px-4 justify-between bg-forest/5 shrink-0">
                        <span className="mono-ui text-[12px] text-forest">{t('landing.incoming')}</span>
                        <svg className="w-5 h-5 text-forest" viewBox="0 0 256 256" fill="currentColor">
                            <path d="M56,96v64a8,8,0,0,1-16,0V96a8,8,0,0,1,16,0ZM88,24a8,8,0,0,0-8,8V224a8,8,0,0,0,16,0V32A8,8,0,0,0,88,24Zm40,32a8,8,0,0,0-8,8V192a8,8,0,0,0,16,0V64A8,8,0,0,0,128,56Zm40,32a8,8,0,0,0-8,8v64a8,8,0,0,0,16,0V96A8,8,0,0,0,168,88Zm40-16a8,8,0,0,0-8,8v96a8,8,0,0,0,16,0V80A8,8,0,0,0,208,72Z" />
                        </svg>
                    </div>
                    <div className="flex flex-col flex-1">
                        {newsLoading ? (
                            <div className="p-6 mono-ui text-[12px] text-forest animate-pulse" data-testid="transmissions-loading">
                                {t('landing.loading_transmissions') || 'Loading transmissions…'}
                            </div>
                        ) : newsError ? (
                            <div className="p-6 mono-ui text-[12px] text-forest" data-testid="transmissions-error">
                                {t('landing.transmissions_error') || 'Unable to load transmissions.'}
                            </div>
                        ) : (
                            news.map((item, idx) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={`p-6 w-full ${idx < news.length - 1 ? 'border-b border-forest' : ''} group cursor-pointer hover:bg-forest/10 transition-all flex-1 flex flex-col justify-center text-left border-0 bg-transparent`}
                                    onClick={() => navigate(`/news/${item.id}`)}
                                    aria-label={`Open ${item.title}`}
                                    title={typeof (item.short_summary ?? item.summary) === 'string' ? (item.short_summary ?? item.summary)?.slice(0, 200) : undefined}
                                    data-testid={`transmission-${idx}`}
                                >
                                    <div className="flex flex-wrap justify-between items-start gap-y-2 gap-x-2 mb-2">
                                        <span className="mono-ui text-[9px] sm:text-[11px] text-primary border border-primary px-1 py-0.5 leading-none shrink-0 inline-flex items-center">
                                            {(item.category ?? 'GENERAL').toUpperCase()}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                                            {(item.narrative || (item.truth_score != null && item.truth_score >= 80)) && (
                                                <span className="mono-ui text-[8px] sm:text-[10px] text-forest border border-forest px-1 py-0.5 leading-none shrink-0 inline-flex items-center" title="Full broadcast narrative available">
                                                    Synthesized
                                                </span>
                                            )}
                                            <span className="mono-ui text-[9px] sm:text-[11px] text-forest truncate leading-none py-0.5">
                                                {item.source ?? 'RSS'}
                                                {' // '}
                                                {item.region ?? 'AFRICA'}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="font-display text-md font-bold leading-snug mb-2 group-hover:text-primary transition-colors text-content line-clamp-2">
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="w-1 h-3 bg-primary animate-pulse" />
                                        <span className="mono-ui text-[10px] text-forest">
                                            {item.published ? new Date(item.published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'LIVE'}
                                        </span>
                                        {item.read_time && <span className="mono-ui text-[10px] text-forest">{item.read_time}</span>}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <section id="why" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-forest" aria-labelledby="landing-legend-why">
                <h2 id="landing-legend-why" className="col-span-full mono-ui text-[10px] text-forest px-4 sm:px-6 pt-4 pb-1 block">Why Narvo</h2>
                {[
                    { num: '01', title: t('landing.pillar_1_title'), desc: t('landing.pillar_1_desc') },
                    { num: '02', title: t('landing.pillar_2_title'), desc: t('landing.pillar_2_desc') },
                    { num: '03', title: t('landing.pillar_3_title'), desc: t('landing.pillar_3_desc') },
                    { num: '04', title: t('landing.pillar_4_title'), desc: t('landing.pillar_4_desc') },
                ].map((pillar, idx) => (
                    <div
                        key={idx}
                        className={`p-4 sm:p-6 lg:p-8 ${idx < 3 ? 'lg:border-r lg:border-forest' : ''} ${idx % 2 === 0 ? 'bg-forest/5' : 'bg-background-dark'} min-h-[180px] sm:h-64 flex flex-col justify-between group hover:bg-forest/10 transition-all`}
                    >
                        <span className="mono-ui text-[12px] text-forest">
                            {pillar.num}. {pillar.title}
                        </span>
                        <h4 className="font-display text-xl text-content">{pillar.desc}</h4>
                        <div className="flex justify-end">
                            <div className="w-12 h-12 text-forest opacity-30 group-hover:opacity-60 transition-opacity" />
                        </div>
                    </div>
                ))}
            </section>

            <section id="tech" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-forest" aria-labelledby="landing-legend-tech">
                <h2 id="landing-legend-tech" className="col-span-full mono-ui text-[10px] text-forest px-4 sm:px-6 pt-4 pb-1 block">Technology and metrics</h2>
                {[
                    {
                        id: '0x01',
                        title: t('landing.console_title'),
                        desc: t('landing.console_desc'),
                        metric: metrics?.stories_processed != null ? `${metrics.stories_processed}+` : (metrics?.total_stories ? `${metrics.total_stories}+` : '99.9%'),
                        label: 'STORIES_INDEXED',
                    },
                    {
                        id: '0x02',
                        title: t('landing.voices_title'),
                        desc: t('landing.voices_desc'),
                        metric: metrics?.broadcast_hours != null ? `${metrics.broadcast_hours} hrs` : '—',
                        label: 'HOURS_SYNTHESIZED',
                    },
                    {
                        id: '0x03',
                        title: t('landing.truth_title'),
                        desc: t('landing.truth_desc'),
                        metric: metrics?.verification_apis != null ? `${metrics.verification_apis} online` : '0.8s',
                        label: 'VERIFICATION_APIS',
                    },
                    {
                        id: '0x04',
                        title: 'Listeners',
                        desc: t('landing.voices_desc'),
                        metric: metrics?.total_listeners ?? (metrics?.active_listeners != null ? metrics.active_listeners.toLocaleString() : '1,420'),
                        label: 'ACTIVE_LISTENERS',
                    },
                ].map((mod, idx) => (
                    <div key={idx} className={`p-6 sm:p-8 border-b border-forest last:border-b-0 lg:border-b-0 ${idx < 3 ? 'lg:border-r lg:border-forest' : ''}`}>
                        <div className="flex justify-between items-start mb-4">
                            <p className="mono-ui text-[12px] text-forest">MOD_ID: {mod.id}</p>
                        </div>
                        <h3 className="font-display text-2xl font-bold mb-4 uppercase text-content">{mod.title}</h3>
                        <p className="text-slate-400 text-sm mb-6">{mod.desc}</p>
                        <div className="border-t border-forest pt-4 flex justify-between items-center">
                            <span className="mono-ui text-[12px] text-forest">{mod.label}</span>
                            <span className="mono-ui text-[15px] text-primary">{mod.metric}</span>
                        </div>
                    </div>
                ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 border-b border-forest" aria-labelledby="landing-legend-core">
                <h2 id="landing-legend-core" className="col-span-full mono-ui text-[10px] text-forest px-4 sm:px-6 lg:px-16 pt-4 pb-1 block">System core and broadcast control</h2>
                <div className="p-4 sm:p-6 lg:p-16 border-r-0 lg:border-r border-forest bg-forest/5 flex flex-col justify-center min-w-0">
                    <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 text-content">{t('landing.system_core')}</h2>
                    <div className="space-y-4">
                        {[
                            { num: '01', title: 'RSS_SUMMARIZATION', desc: 'Multi-source ingestion filtered per user subscription.' },
                            { num: '02', title: 'NATIVE_TRANSLATION', desc: 'Real-time localized translation into regional dialects.' },
                            { num: '03', title: 'AUDIO_SYNTHESIS', desc: 'High-fidelity voice delivery powered by AI.' },
                        ].map((step, idx) => (
                            <div key={idx} className="flex gap-4 p-4 border border-forest bg-background-dark">
                                <div className="w-10 h-10 flex items-center justify-center border border-forest text-primary font-mono text-xs shrink-0">
                                    {step.num}
                                </div>
                                <div>
                                    <h4 className="mono-ui text-sm text-content mb-1">{step.title}</h4>
                                    <p className="text-[12px] text-slate-400 font-mono">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="p-4 sm:p-6 lg:p-8 flex-1 border-b border-forest flex flex-col justify-center">
                        <div className="flex items-center gap-3 sm:gap-4 mb-4">
                            <svg className="w-6 h-6 text-forest shrink-0" viewBox="0 0 256 256" fill="currentColor">
                                <path d="M152,96H104a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V104A8,8,0,0,0,152,96Zm-8,48H112V112h32Z" />
                            </svg>
                            <h4 className="mono-ui text-lg text-content">Broadcast_Control_Unit</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 min-w-0">
                            <div className="border border-forest bg-background-dark px-3 py-2">
                                <span className="mono-ui text-[10px] text-forest block">SIGNAL_STRENGTH</span>
                                <span className="mono-ui text-[13px] text-primary font-bold">
                                    {metrics?.total_sources ? Math.min(100, Math.round((metrics.total_sources / 10) * 100)) : 100}%
                                </span>
                            </div>
                            <div className="border border-forest bg-background-dark px-3 py-2">
                                <span className="mono-ui text-[10px] text-forest block">LATENCY</span>
                                <span className="mono-ui text-[13px] text-primary font-bold">&lt;500ms</span>
                            </div>
                            <div className="border border-forest bg-background-dark px-3 py-2">
                                <span className="mono-ui text-[10px] text-forest block">SOURCES</span>
                                <span className="mono-ui text-[13px] text-primary font-bold">{metrics?.total_sources ?? 7}</span>
                            </div>
                        </div>
                        <div
                            className={`aspect-video w-full min-w-0 border relative overflow-hidden flex items-end p-4 sm:p-6 lg:p-8 gap-1 transition-colors ${!breakingDismissed && breaking.length > 0 ? 'bg-red-950/20 border-red-500/50 animate-pulse' : 'bg-forest/10 border-forest'}`}
                            data-testid="bcu-waveform"
                        >
                            {(() => {
                                const base = [25, 50, 75, 66, 100, 33, 50];
                                const stories =
                                    metrics?.total_stories != null ? Math.min(100, Math.round((metrics.total_stories % 100) / 1.5)) : null;
                                const sources =
                                    metrics?.total_sources != null ? Math.min(100, metrics.total_sources * 12) : null;
                                const isBreaking = !breakingDismissed && breaking.length > 0;
                                const heights = base.map((b, i) => {
                                    if (i === 2 && stories != null) return Math.max(20, Math.min(100, b + stories));
                                    if (i === 4 && sources != null) return Math.max(20, Math.min(100, sources));
                                    return b;
                                });
                                return heights.map((h, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 min-w-0 ${i % 2 === 1 ? (isBreaking ? 'bg-red-500' : 'bg-primary') : (isBreaking ? 'bg-red-500/50' : 'bg-forest/40')} ${i === 3 ? 'animate-pulse' : ''}`}
                                        style={{ height: `${h}%` }}
                                    />
                                ));
                            })()}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="mono-ui text-primary text-[12px] bg-background-dark px-4 py-2 border border-forest">
                                    SIGNAL_OPTIMIZED
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 lg:p-8 bg-primary/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div>
                            <h5 className="mono-ui text-xs text-forest mb-1">INITIATE CONNECTION</h5>
                            <p className="font-display font-bold text-xl text-primary uppercase">{t('landing.join_broadcast')}</p>
                        </div>
                        <button
                            onClick={() => setIsVoiceModalOpen(true)}
                            className="bg-primary text-background-dark font-display font-bold px-6 sm:px-8 py-4 min-h-[48px] hover:bg-white transition-all flex items-center gap-2"
                            data-testid="start-listening-btn"
                        >
                            <SpeakerHigh weight="fill" className="w-5 h-5" />
                            [{t('landing.start_listening')}]
                        </button>
                    </div>
                </div>
            </section>

            <footer className="mt-auto grid grid-cols-1 md:grid-cols-4 border-t border-forest bg-background-dark min-w-0">
                <div className="p-4 sm:p-6 border-b border-forest md:border-b-0 md:border-r md:border-forest flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-8 text-content">
                        <NarvoLogo alt="Narvo" className="w-6 h-6" />
                        <span className="font-display font-bold text-content tracking-tighter">NARVO</span>
                    </div>
                    <p className="mono-ui text-[11px] text-forest">
                        STABLE_BUILD<br />NARVO
                    </p>
                </div>
                <div className="p-4 sm:p-6 border-b border-forest md:border-b-0 md:border-r md:border-forest">
                    <h6 className="mono-ui text-[12px] text-forest mb-4">SYSTEM_LINKS</h6>
                    <ul className="space-y-2">
                        <li>
                            <button
                                type="button"
                                onClick={() => setIsVoiceModalOpen(true)}
                                className="mono-ui text-[13px] text-slate-400 hover:text-primary transition-colors text-left"
                            >
                                VOICE_MATRIX
                            </button>
                        </li>
                        <li>
                            <a className="mono-ui text-[13px] text-slate-400 hover:text-primary transition-colors" href="#tech">CORE_RAG_PROTOCOLS</a>
                        </li>
                        <li>
                            <a className="mono-ui text-[13px] text-slate-400 hover:text-primary transition-colors" href="/tools">TOOLS_AND_STACK</a>
                        </li>
                        <li>
                            <a className="mono-ui text-[13px] text-slate-400 hover:text-primary transition-colors" href="https://narvo.statuspage.io/" target="_blank" rel="noopener noreferrer">SYSTEM_STATUS</a>
                        </li>
                    </ul>
                </div>
                <div className="p-4 sm:p-6 border-b border-forest md:border-b-0 md:border-r md:border-forest">
                    <h6 className="mono-ui text-[12px] text-forest mb-4">PROTOCOL_STATUS</h6>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-forest" />
                        <span className="mono-ui text-[12px] text-slate-400">TRANSLATION: STABLE</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-primary animate-pulse" />
                        <span className="mono-ui text-[12px] text-slate-400">ENCRYPTION: AES_X</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-forest" />
                        <span className="mono-ui text-[12px] text-slate-400">SYNTHESIS: OPTIMIZED</span>
                    </div>
                </div>
                <div className="p-4 sm:p-6 border-b-0 flex flex-col justify-between">
                    <h6 className="mono-ui text-[12px] text-forest mb-4">CONNECT_SYSTEM</h6>
                    <p className="mono-ui text-[11px] text-forest mt-4">LOG_STAMP: {getLogStamp()}</p>
                </div>
            </footer>

            {isVoiceModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="voice-matrix-title"
                >
                    <div className="bg-background-dark border border-forest w-full max-w-lg max-h-[85vh] flex flex-col shadow-lg">
                        <div className="flex items-center justify-between p-4 border-b border-forest shrink-0">
                            <h2 id="voice-matrix-title" className="mono-ui text-base font-bold text-content">
                                VOICE_MATRIX
                            </h2>
                            <button
                                type="button"
                                onClick={() => { setPreviewError(null); setIsVoiceModalOpen(false); }}
                                className="p-2 border border-forest text-forest hover:bg-forest/20 hover:text-primary transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                                aria-label="Close"
                            >
                                <X weight="bold" className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="mono-ui text-[11px] text-forest px-4 pt-2">
                            Select a voice to hear a short Narvo sample.
                        </p>
                        <div className="overflow-y-auto flex-1 p-4 space-y-2">
                            {voices.length === 0 ? (
                                <p className="mono-ui text-[12px] text-forest">Loading voices…</p>
                            ) : (
                                voices.map((voice) => (
                                    <div
                                        key={voice.id}
                                        className="flex items-center justify-between gap-4 p-4 border border-forest bg-forest/5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-display font-bold text-content truncate">{voice.name}</p>
                                            <p className="mono-ui text-[11px] text-forest">
                                                {voice.accent} · {voice.gender}
                                            </p>
                                            {previewError === voice.id && (
                                                <p className="mono-ui text-[11px] text-red-400 mt-1">Preview failed. Try again.</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleVoicePreview(voice)}
                                            disabled={previewLoading === voice.id}
                                            className="shrink-0 border border-primary text-primary font-display font-bold px-4 py-2 text-sm hover:bg-primary hover:text-background-dark transition-all disabled:opacity-70 min-h-[48px] min-w-[48px] flex items-center justify-center gap-2"
                                            aria-label={`Play preview for ${voice.name}`}
                                        >
                                            {previewLoading === voice.id ? (
                                                <span className="mono-ui text-xs">Generating…</span>
                                            ) : (
                                                <Play weight="fill" className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
