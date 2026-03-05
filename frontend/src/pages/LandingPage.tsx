import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Lightning, ArrowRight, X } from '@phosphor-icons/react';
import { openTourGuide } from '../components/TourGuideModal';
import Clock from '../components/Clock';
import NarvoLogo from '../components/NarvoLogo';
import * as api from '../lib/api';

interface LandingStory {
    id: string;
    title: string;
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
    active_listeners?: number;
    [key: string]: unknown;
}

const getPublicUrl = () =>
    import.meta.env.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const getLogStamp = () =>
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const LandingPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [news, setNews] = useState<LandingStory[]>([]);
    const [breaking, setBreaking] = useState<LandingStory[]>([]);
    const [metrics, setMetrics] = useState<LandingMetrics | null>(null);
    const [breakingDismissed, setBreakingDismissed] = useState(false);
    const [newsLoading, setNewsLoading] = useState(true);
    const [newsError, setNewsError] = useState(false);

    useEffect(() => {
        setNewsLoading(true);
        setNewsError(false);

        // Helper function to safely parse JSON only if the response is OK
        const safeJson = async (res: Response) => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        };

        Promise.all([
            api.get('api/news?limit=4').then(safeJson),
            api.get('api/news/breaking').then(safeJson).catch(() => []),
            api.get('api/metrics').then(safeJson).catch(() => null),
        ])
            .then(([newsData, breakingData, metricsData]: [unknown, unknown, unknown]) => {
                setNews(Array.isArray(newsData) ? newsData : []);
                setBreaking(Array.isArray(breakingData) ? breakingData : []);
                setMetrics(metricsData as LandingMetrics | null);
                setNewsError(false);
            })
            .catch((err) => {
                console.error('[LandingPage] Fetch error:', err);
                setNewsError(true);
            })
            .finally(() => setNewsLoading(false));
    }, []);

    return (
        <div
            className="min-h-screen flex flex-col border-x border-forest max-w-[1440px] mx-auto relative bg-background-dark"
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
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <NarvoLogo alt="Narvo" className="w-8 h-8" />
                            <h1 className="font-display text-2xl font-bold tracking-tighter text-content">NARVO</h1>
                        </div>
                        <div className="hidden md:flex items-center gap-4 border-l border-forest pl-6 h-10">
                            <span className="mono-ui text-[12px] text-forest">SYSTEM_STATUS:</span>
                            <span className="mono-ui text-[12px] text-primary">100% // SOURCES: {metrics?.total_sources ?? 7}</span>
                        </div>
                    </div>
                    <nav className="hidden lg:flex items-center gap-8">
                        <a className="mono-ui text-[13px] hover:text-primary transition-colors text-slate-400" href="#about">ABOUT</a>
                        <a className="mono-ui text-[13px] hover:text-primary transition-colors text-slate-400" href="#why">WHY NARVO?</a>
                        <a className="mono-ui text-[13px] hover:text-primary transition-colors text-slate-400" href="#tech">TECHNOLOGY</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <div className="mono-ui text-[13px] bg-forest/20 px-3 py-1 border border-forest text-forest">
                            LOCAL: <Clock />
                        </div>
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-12 border-b border-forest">
                <div className="lg:col-span-9 flex flex-col justify-center p-8 lg:p-16 border-r border-forest">
                    <div className="mono-ui text-[12px] text-forest mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-forest block" />
                        {t('landing.tagline')}
                    </div>
                    <h1 className="font-display text-5xl lg:text-7xl font-bold leading-[0.9] tracking-tighter text-content mb-8">
                        {t('landing.headline').split('\n').map((line, i) => (
                            <span key={i}>{i > 0 && <br />}{line}</span>
                        ))}
                    </h1>
                    <p className="text-lg lg:text-xl text-slate-400 max-w-xl mb-12">{t('landing.description')}</p>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => navigate('/auth')}
                            className="bg-primary text-background-dark font-display font-bold px-8 py-4 text-lg hover:bg-white transition-all"
                            data-testid="start-broadcast-btn"
                        >
                            [{t('landing.start_broadcast')}]
                        </button>
                        <button
                            onClick={() => {
                                localStorage.setItem('narvo_guest', 'true');
                                navigate('/dashboard');
                                setTimeout(openTourGuide, 2500);
                            }}
                            className="border border-forest text-forest font-display font-bold px-8 py-4 text-lg hover:bg-forest hover:text-content transition-all"
                            data-testid="demo-btn"
                        >
                            [{t('landing.guest_play')}]
                        </button>
                    </div>
                    {!breakingDismissed && breaking.length > 0 && (
                        <div
                            className="mt-8 w-full bg-red-950/90 border border-red-500/50 px-4 py-3 flex items-center gap-3 animate-pulse-subtle"
                            data-testid="landing-breaking-banner"
                        >
                            <div className="flex items-center gap-2 shrink-0">
                                <Lightning weight="fill" className="w-3.5 h-3.5 text-red-400" />
                                <span className="mono-ui text-[11px] md:text-[12px] text-red-400 font-bold tracking-widest">
                                    {t('notifications.breaking_news')}
                                </span>
                            </div>
                            <button onClick={() => navigate(`/news/${breaking[0].id}`)} className="flex-1 min-w-0 text-left group">
                                <span className="mono-ui text-[12px] md:text-[13px] text-content font-bold truncate block group-hover:text-red-300 transition-colors">
                                    {breaking[0].title}
                                </span>
                            </button>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => navigate(`/news/${breaking[0].id}`)}
                                    className="mono-ui text-[10px] text-red-400 font-bold hover:text-content transition-colors hidden sm:flex items-center gap-1"
                                >
                                    {t('notifications.read_now')}
                                    <ArrowRight weight="bold" className="w-3 h-3" />
                                </button>
                                <button onClick={() => setBreakingDismissed(true)} className="p-1 hover:bg-red-500/20 transition-colors">
                                    <X weight="bold" className="w-3 h-3 text-red-400" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-3 bg-background-dark flex flex-col">
                    <div className="h-12 border-b border-forest flex items-center px-4 justify-between bg-forest/5 shrink-0">
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
                                    data-testid={`transmission-${idx}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="mono-ui text-[11px] text-primary border border-primary px-1">
                                            {(item.category ?? 'GENERAL').toUpperCase()}
                                        </span>
                                        <span className="mono-ui text-[11px] text-forest">
                                            {item.source ?? 'RSS'}
                                            {' // '}
                                            {item.region ?? 'AFRICA'}
                                        </span>
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

            <section id="why" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-forest">
                {[
                    { num: '01', title: t('landing.pillar_1_title'), desc: t('landing.pillar_1_desc') },
                    { num: '02', title: t('landing.pillar_2_title'), desc: t('landing.pillar_2_desc') },
                    { num: '03', title: t('landing.pillar_3_title'), desc: t('landing.pillar_3_desc') },
                    { num: '04', title: t('landing.pillar_4_title'), desc: t('landing.pillar_4_desc') },
                ].map((pillar, idx) => (
                    <div
                        key={idx}
                        className={`p-8 ${idx < 3 ? 'border-r border-forest' : ''} ${idx % 2 === 0 ? 'bg-forest/5' : 'bg-background-dark'} h-64 flex flex-col justify-between group hover:bg-forest/10 transition-all`}
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

            <section id="tech" className="grid grid-cols-1 md:grid-cols-3 border-b border-forest">
                {[
                    {
                        id: '0x01',
                        title: t('landing.console_title'),
                        desc: t('landing.console_desc'),
                        metric: metrics?.total_stories ? `${metrics.total_stories}+` : '99.9%',
                        label: 'STORIES_INDEXED',
                    },
                    {
                        id: '0x02',
                        title: t('landing.voices_title'),
                        desc: t('landing.voices_desc'),
                        metric: metrics?.active_listeners ? metrics.active_listeners.toLocaleString() : '1,420',
                        label: 'ACTIVE_LISTENERS',
                    },
                    { id: '0x03', title: t('landing.truth_title'), desc: t('landing.truth_desc'), metric: '0.8s', label: 'FACT_LATENCY' },
                ].map((mod, idx) => (
                    <div key={idx} className={`p-8 ${idx < 2 ? 'border-r border-forest' : ''}`}>
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

            <section className="grid grid-cols-1 lg:grid-cols-2 border-b border-forest">
                <div className="p-8 lg:p-16 border-r border-forest bg-forest/5 flex flex-col justify-center">
                    <h2 className="font-display text-4xl font-bold mb-8 text-content">{t('landing.system_core')}</h2>
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
                <div className="flex flex-col">
                    <div className="p-8 flex-1 border-b border-forest flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-4">
                            <svg className="w-6 h-6 text-forest shrink-0" viewBox="0 0 256 256" fill="currentColor">
                                <path d="M152,96H104a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V104A8,8,0,0,0,152,96Zm-8,48H112V112h32Z" />
                            </svg>
                            <h4 className="mono-ui text-lg text-content">Broadcast_Control_Unit</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-4">
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
                            className="aspect-video w-full bg-forest/10 border border-forest relative overflow-hidden flex items-end p-8 gap-1"
                            data-testid="bcu-waveform"
                        >
                            {(() => {
                                const base = [25, 50, 75, 66, 100, 33, 50];
                                const stories =
                                    metrics?.total_stories != null ? Math.min(100, Math.round((metrics.total_stories % 100) / 1.5)) : null;
                                const sources =
                                    metrics?.total_sources != null ? Math.min(100, metrics.total_sources * 12) : null;
                                const heights = base.map((b, i) => {
                                    if (i === 2 && stories != null) return Math.max(20, Math.min(100, b + stories));
                                    if (i === 4 && sources != null) return Math.max(20, Math.min(100, sources));
                                    return b;
                                });
                                return heights.map((h, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 min-w-0 ${i % 2 === 1 ? 'bg-primary' : 'bg-forest/40'} ${i === 3 ? 'animate-pulse' : ''}`}
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
                    <div className="p-8 bg-primary/10 flex items-center justify-between">
                        <div>
                            <h5 className="mono-ui text-xs text-forest mb-1">INITIATE CONNECTION</h5>
                            <p className="font-display font-bold text-xl text-primary uppercase">{t('landing.join_broadcast')}</p>
                        </div>
                        <button
                            onClick={() => navigate('/auth')}
                            className="bg-primary text-background-dark font-display font-bold px-8 py-4 hover:bg-white transition-all"
                            data-testid="start-listening-btn"
                        >
                            [{t('landing.start_listening')}]
                        </button>
                    </div>
                </div>
            </section>

            <footer className="mt-auto grid grid-cols-1 md:grid-cols-4 border-t border-forest bg-background-dark">
                <div className="p-6 border-r border-forest flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-8 text-content">
                        <NarvoLogo alt="Narvo" className="w-6 h-6" />
                        <span className="font-display font-bold text-content tracking-tighter">NARVO</span>
                    </div>
                    <p className="mono-ui text-[11px] text-forest">
                        STABLE_BUILD<br />NARVO
                    </p>
                </div>
                <div className="p-6 border-r border-forest">
                    <h6 className="mono-ui text-[12px] text-forest mb-4">SYSTEM_LINKS</h6>
                    <ul className="space-y-2">
                        <li>
                            <a className="mono-ui text-[13px] text-slate-400 hover:text-primary transition-colors" href="#why">VOICE_MATRIX</a>
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
                <div className="p-6 border-r border-forest">
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
                <div className="p-6 flex flex-col justify-between">
                    <h6 className="mono-ui text-[12px] text-forest mb-4">CONNECT_SYSTEM</h6>
                    <p className="mono-ui text-[11px] text-forest mt-4">LOG_STAMP: {getLogStamp()}</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
