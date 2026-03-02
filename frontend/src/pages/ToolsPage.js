import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Code, Database, CloudArrowUp, Broadcast, Waveform, Globe, ShieldCheck, Lightning, Newspaper, ChartLine } from '@phosphor-icons/react';

const TOOL_CATEGORIES = [
  {
    title: 'CORE_STACK',
    tools: [
      { name: 'React', desc: 'Frontend UI library', url: 'https://react.dev', tag: 'FRONTEND' },
      { name: 'FastAPI', desc: 'High-performance Python backend', url: 'https://fastapi.tiangolo.com', tag: 'BACKEND' },
      { name: 'Supabase', desc: 'PostgreSQL database & auth', url: 'https://supabase.com', tag: 'DATABASE' },
      { name: 'Tailwind CSS', desc: 'Utility-first CSS framework', url: 'https://tailwindcss.com', tag: 'STYLING' },
      { name: 'Shadcn/UI', desc: 'Accessible component library', url: 'https://ui.shadcn.com', tag: 'COMPONENTS' },
    ],
    icon: Code,
  },
  {
    title: 'AI_SERVICES',
    tools: [
      { name: 'Google Gemini 2.0', desc: 'AI narrative generation & translation', url: 'https://deepmind.google/technologies/gemini/', tag: 'LLM' },
      { name: 'YarnGPT', desc: 'Primary TTS — Nigerian-accented voices', url: 'https://yarngpt.ai', tag: 'TTS' },
      { name: 'OpenAI TTS', desc: 'Fallback text-to-speech engine', url: 'https://platform.openai.com/docs/guides/text-to-speech', tag: 'AUDIO' },
      { name: 'Google Fact Check', desc: 'Claim verification API', url: 'https://developers.google.com/fact-check/tools/api', tag: 'VERIFY' },
    ],
    icon: Lightning,
  },
  {
    title: 'NEWS_AGGREGATION',
    tools: [
      { name: 'Mediastack', desc: 'Real-time news data API', url: 'https://mediastack.com', tag: 'AGGREGATOR' },
      { name: 'NewsData.io', desc: 'Global news API', url: 'https://newsdata.io', tag: 'AGGREGATOR' },
      { name: 'RSS Feeds', desc: '39+ curated African news sources', url: '#', tag: 'FEEDS' },
      { name: 'feedparser', desc: 'Universal RSS/Atom feed parser', url: 'https://feedparser.readthedocs.io', tag: 'PARSER' },
    ],
    icon: Newspaper,
  },
  {
    title: 'DOMAINS_AND_HOSTING',
    tools: [
      { name: 'narvo.news', desc: 'Main site — homepage, product, signup', url: 'https://narvo.news', tag: 'MAIN' },
      { name: 'narvo.live', desc: 'Live broadcast hub & stream', url: 'https://narvo.live', tag: 'LIVE' },
      { name: 'api.narvo.news', desc: 'FastAPI backend API', url: 'https://api.narvo.news', tag: 'API' },
      { name: 'Vercel', desc: 'Frontend deployment & hosting', url: 'https://vercel.com', tag: 'HOST' },
      { name: 'Render', desc: 'Backend (FastAPI) hosting', url: 'https://render.com', tag: 'HOST' },
      { name: 'Unstoppable Domains', desc: 'Domain registration (narvo.news, narvo.live)', url: 'https://unstoppabledomains.com', tag: 'REGISTRAR' },
    ],
    icon: Globe,
  },
  {
    title: 'AUDIO_ENGINE',
    tools: [
      { name: 'Tone.js', desc: 'Broadcast-grade audio synthesis', url: 'https://tonejs.github.io', tag: 'SFX' },
      { name: 'Howler.js', desc: 'Web audio library', url: 'https://howlerjs.com', tag: 'PLAYBACK' },
      { name: 'Media Session API', desc: 'OS-level playback controls', url: 'https://developer.mozilla.org/docs/Web/API/Media_Session_API', tag: 'NATIVE' },
    ],
    icon: Waveform,
  },
  {
    title: 'AUTH_AND_STORAGE',
    tools: [
      { name: 'Supabase', desc: 'Authentication & user management', url: 'https://supabase.com', tag: 'AUTH' },
      { name: 'IndexedDB', desc: 'Offline content caching', url: 'https://developer.mozilla.org/docs/Web/API/IndexedDB_API', tag: 'CACHE' },
      { name: 'Service Worker', desc: 'PWA offline & background sync', url: 'https://developer.mozilla.org/docs/Web/API/Service_Worker_API', tag: 'PWA' },
    ],
    icon: ShieldCheck,
  },
  {
    title: 'OBSERVABILITY',
    tools: [
      { name: 'Narvo Status', desc: 'Uptime & incident status (Backend API, Web App)', url: 'https://narvo.statuspage.io/', tag: 'UPTIME' },
      { name: 'Sentry', desc: 'Error tracking & performance (backend + frontend)', url: 'https://sentry.io', tag: 'MONITOR' },
    ],
    icon: ChartLine,
  },
  {
    title: 'INFRASTRUCTURE',
    tools: [
      { name: 'uvicorn', desc: 'ASGI server for FastAPI backend', url: 'https://www.uvicorn.org', tag: 'SERVER' },
      { name: 'httpx', desc: 'Async HTTP client for backend services', url: 'https://www.python-httpx.org', tag: 'HTTP' },
      { name: 'Framer Motion', desc: 'Animation library', url: 'https://www.framer.com/motion/', tag: 'UI' },
      { name: 'Phosphor Icons', desc: 'Icon system', url: 'https://phosphoricons.com', tag: 'ICONS' },
      { name: 'i18next', desc: 'Internationalization framework', url: 'https://www.i18next.com', tag: 'I18N' },
    ],
    icon: CloudArrowUp,
  },
];

const ToolsPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background-dark" data-testid="tools-page">
      {/* Header */}
      <section className="py-8 md:py-16 px-4 md:px-10 narvo-border-b bg-surface/10 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#628141 1px, transparent 1px), linear-gradient(90deg, #628141 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="max-w-5xl mx-auto relative z-10">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 mono-ui text-[12px] text-forest hover:text-primary transition-colors mb-6" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4" /> BACK
          </button>
          <div className="flex items-center gap-3 mb-3">
            <Broadcast weight="fill" className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <span className="mono-ui text-[11px] md:text-[12px] text-primary font-bold tracking-[0.2em]">NARVO_ENGINEERING</span>
          </div>
          <h1 className="font-display text-2xl md:text-5xl font-bold uppercase tracking-tight text-content leading-none mb-3">
            Tools & <span className="text-primary">Stack.</span>
          </h1>
          <p className="mono-ui text-[11px] md:text-[12px] text-forest max-w-2xl leading-relaxed">
            THE TECHNOLOGIES POWERING NARVO'S PRECISION-ENGINEERED BROADCAST INFRASTRUCTURE. EVERY COMPONENT CHOSEN FOR PERFORMANCE, RELIABILITY, AND SCALE.
          </p>
        </div>
      </section>

      {/* Tool Categories */}
      <div className="p-4 md:p-10 pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {TOOL_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.title} className="narvo-border bg-surface/5 overflow-hidden">
                {/* Category Header */}
                <div className="p-4 md:p-5 narvo-border-b bg-surface/20 flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 narvo-border bg-background-dark flex items-center justify-center shrink-0">
                    <Icon weight="bold" className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <span className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.15em]">{cat.title}</span>
                </div>
                {/* Tools */}
                <div className="divide-y divide-forest/10">
                  {cat.tools.map((tool) => (
                    <a
                      key={tool.name}
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 md:p-4 flex items-center gap-3 hover:bg-surface/30 transition-colors group"
                      data-testid={`tool-${tool.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-display text-sm md:text-base font-bold text-content uppercase group-hover:text-primary transition-colors">{tool.name}</span>
                          <span className="mono-ui text-[9px] md:text-[10px] text-primary border border-primary/30 px-1 py-0.5 bg-primary/10 font-bold shrink-0">{tool.tag}</span>
                        </div>
                        <p className="mono-ui text-[10px] md:text-[11px] text-forest/60">{tool.desc}</p>
                      </div>
                      <Database className="w-3.5 h-3.5 text-forest/30 group-hover:text-primary transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default ToolsPage;
