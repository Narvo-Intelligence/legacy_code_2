import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Code, Database, CloudArrowUp, Broadcast, Waveform, Globe, ShieldCheck, Lightning, Newspaper, ChartLine } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

interface ToolItem {
  name: string;
  desc: string;
  url: string;
  tag: string;
}

interface ToolCategory {
  title: string;
  tools: ToolItem[];
  icon: Icon;
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    title: 'CORE_STACK',
    tools: [
      { name: 'React', desc: 'UI library with hooks and concurrent features', url: 'https://react.dev', tag: 'FRONTEND' },
      { name: 'FastAPI', desc: 'Async Python web framework', url: 'https://fastapi.tiangolo.com', tag: 'BACKEND' },
      { name: 'Supabase', desc: 'PostgreSQL, auth, and realtime', url: 'https://supabase.com', tag: 'DATABASE' },
      { name: 'Tailwind CSS', desc: 'Utility-first CSS framework', url: 'https://tailwindcss.com', tag: 'STYLING' },
      { name: 'Shadcn/UI', desc: 'Accessible React component primitives', url: 'https://ui.shadcn.com', tag: 'COMPONENTS' },
    ],
    icon: Code,
  },
  {
    title: 'AI_AND_VOICE',
    tools: [
      { name: 'Google Gemini', desc: 'LLM for narrative generation and translation', url: 'https://deepmind.google/technologies/gemini/', tag: 'LLM' },
      { name: 'YarnGPT', desc: 'TTS API with Nigerian-accented voices', url: 'https://yarngpt.ai', tag: 'TTS' },
      { name: 'OpenAI TTS', desc: 'Text-to-speech API (fallback)', url: 'https://platform.openai.com/docs/guides/text-to-speech', tag: 'AUDIO' },
      { name: 'Google Fact Check API', desc: 'Claim verification and fact-check tools', url: 'https://developers.google.com/fact-check/tools/api', tag: 'VERIFY' },
    ],
    icon: Lightning,
  },
  {
    title: 'NEWS_AGGREGATION',
    tools: [
      { name: 'Mediastack', desc: 'Real-time news API', url: 'https://mediastack.com', tag: 'AGGREGATOR' },
      { name: 'NewsData.io', desc: 'Global news API', url: 'https://newsdata.io', tag: 'AGGREGATOR' },
      { name: 'feedparser', desc: 'RSS/Atom feed parser for Python', url: 'https://feedparser.readthedocs.io', tag: 'PARSER' },
    ],
    icon: Newspaper,
  },
  {
    title: 'HOSTING_AND_DOMAINS',
    tools: [
      { name: 'Vercel', desc: 'Frontend hosting and edge', url: 'https://vercel.com', tag: 'HOST' },
      { name: 'Render', desc: 'Backend hosting for FastAPI', url: 'https://render.com', tag: 'HOST' },
      { name: 'Supabase Edge', desc: 'Deno-based edge functions (e.g. news proxy)', url: 'https://supabase.com/docs/guides/functions', tag: 'EDGE' },
      { name: 'Unstoppable Domains', desc: 'Domain registration', url: 'https://unstoppabledomains.com', tag: 'REGISTRAR' },
    ],
    icon: Globe,
  },
  {
    title: 'AUDIO_AND_MEDIA',
    tools: [
      { name: 'Tone.js', desc: 'Web Audio synthesis and scheduling', url: 'https://tonejs.github.io', tag: 'SFX' },
      { name: 'Howler.js', desc: 'Web audio playback library', url: 'https://howlerjs.com', tag: 'PLAYBACK' },
      { name: 'Media Session API', desc: 'OS lock-screen and notification playback controls', url: 'https://developer.mozilla.org/docs/Web/API/Media_Session_API', tag: 'NATIVE' },
    ],
    icon: Waveform,
  },
  {
    title: 'STORAGE_AND_PWA',
    tools: [
      { name: 'Supabase Auth', desc: 'User authentication and sessions', url: 'https://supabase.com/docs/guides/auth', tag: 'AUTH' },
      { name: 'IndexedDB', desc: 'Browser storage for offline and cached audio', url: 'https://developer.mozilla.org/docs/Web/API/IndexedDB_API', tag: 'CACHE' },
      { name: 'Service Worker API', desc: 'Offline caching and background sync', url: 'https://developer.mozilla.org/docs/Web/API/Service_Worker_API', tag: 'PWA' },
      { name: 'Supabase Realtime', desc: 'Channels and broadcast for live updates', url: 'https://supabase.com/docs/guides/realtime', tag: 'REALTIME' },
    ],
    icon: ShieldCheck,
  },
  {
    title: 'SERVERLESS_DATA',
    tools: [
      { name: 'Upstash Redis', desc: 'HTTP Redis for serverless caching', url: 'https://upstash.com/docs/redis', tag: 'CACHE' },
      { name: 'Upstash Ratelimit', desc: 'Distributed rate limiting SDK', url: 'https://upstash.com/docs/ratelimit', tag: 'LIMIT' },
      { name: 'Upstash QStash', desc: 'Scheduled and message queue for jobs', url: 'https://upstash.com/docs/qstash', tag: 'QUEUE' },
      { name: 'Upstash Vector', desc: 'Vector index for semantic search', url: 'https://upstash.com/docs/vector', tag: 'VECTOR' },
    ],
    icon: Database,
  },
  {
    title: 'OBSERVABILITY',
    tools: [
      { name: 'Sentry', desc: 'Error and performance monitoring', url: 'https://sentry.io', tag: 'MONITOR' },
      { name: 'Narvo Status', desc: 'Public status page for API and app', url: 'https://narvo.statuspage.io/', tag: 'UPTIME' },
    ],
    icon: ChartLine,
  },
  {
    title: 'LIBRARIES_AND_RUNTIME',
    tools: [
      { name: 'uvicorn', desc: 'ASGI server', url: 'https://www.uvicorn.org', tag: 'SERVER' },
      { name: 'httpx', desc: 'Async HTTP client for Python', url: 'https://www.python-httpx.org', tag: 'HTTP' },
      { name: 'Framer Motion', desc: 'Animation library for React', url: 'https://www.framer.com/motion/', tag: 'UI' },
      { name: 'Phosphor Icons', desc: 'Icon set', url: 'https://phosphoricons.com', tag: 'ICONS' },
      { name: 'i18next', desc: 'Internationalization (i18n)', url: 'https://www.i18next.com', tag: 'I18N' },
    ],
    icon: CloudArrowUp,
  },
];

const ToolsPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background-dark" data-testid="tools-page">
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

      <div className="p-4 md:p-10 pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {TOOL_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.title} className="narvo-border bg-surface/5 overflow-hidden">
                <div className="p-4 md:p-5 narvo-border-b bg-surface/20 flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 narvo-border bg-background-dark flex items-center justify-center shrink-0">
                    <Icon weight="bold" className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <span className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.15em]">{cat.title}</span>
                </div>
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
