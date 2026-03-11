import { useNavigate } from 'react-router-dom';
import type { Icon } from '@phosphor-icons/react/lib';
import { ArrowLeft }      from '@phosphor-icons/react/ArrowLeft';
import { ArrowSquareOut } from '@phosphor-icons/react/ArrowSquareOut';
import { Broadcast }      from '@phosphor-icons/react/Broadcast';
import { ChartLine }      from '@phosphor-icons/react/ChartLine';
import { Code }           from '@phosphor-icons/react/Code';
import { Database }       from '@phosphor-icons/react/Database';
import { DeviceMobile }   from '@phosphor-icons/react/DeviceMobile';
import { Globe }          from '@phosphor-icons/react/Globe';
import { Lightning }      from '@phosphor-icons/react/Lightning';
import { Newspaper }      from '@phosphor-icons/react/Newspaper';
import { Package }        from '@phosphor-icons/react/Package';
import { Robot }          from '@phosphor-icons/react/Robot';
import { ShieldCheck }    from '@phosphor-icons/react/ShieldCheck';
import { Waveform }       from '@phosphor-icons/react/Waveform';

interface ToolItem {
  name: string;
  desc: string;
  url: string;
  tag: string;
}

interface ToolCategory {
  title: string;
  subtitle: string;
  icon: Icon;
  tools: ToolItem[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    title: 'CORE_STACK',
    subtitle: 'Frontend and backend foundations',
    icon: Code,
    tools: [
      { name: 'React 18',     desc: 'UI library — concurrent rendering, hooks, Suspense',                   url: 'https://react.dev',                    tag: 'FRONTEND'  },
      { name: 'TypeScript',   desc: 'Typed superset of JavaScript across the full codebase',                url: 'https://www.typescriptlang.org',        tag: 'LANGUAGE'  },
      { name: 'Vite',         desc: 'Build tool and dev server with HMR',                                   url: 'https://vitejs.dev',                   tag: 'BUILD'     },
      { name: 'FastAPI',      desc: 'Async Python web framework powering the backend API',                  url: 'https://fastapi.tiangolo.com',          tag: 'BACKEND'   },
      { name: 'Pydantic v2',  desc: 'Runtime data validation and settings management',                      url: 'https://docs.pydantic.dev',            tag: 'VALIDATION'},
      { name: 'Tailwind CSS', desc: 'Utility-first CSS framework',                                          url: 'https://tailwindcss.com',              tag: 'STYLING'   },
      { name: 'Supabase',     desc: 'PostgreSQL, auth, realtime channels, and edge functions',              url: 'https://supabase.com',                 tag: 'DATABASE'  },
    ],
  },
  {
    title: 'AI_AND_INTELLIGENCE',
    subtitle: 'LLM, TTS, translation, and semantic search',
    icon: Robot,
    tools: [
      { name: 'Google Gemini',        desc: 'LLM for narrative synthesis, translation, and recommendations',       url: 'https://deepmind.google/technologies/gemini/',                             tag: 'LLM'    },
      { name: 'YarnGPT',              desc: 'Primary TTS — authentic Nigerian voices (Yoruba, Hausa, Igbo, Pidgin, English)', url: 'https://yarngpt.ai',                                          tag: 'TTS'    },
      { name: 'OpenAI TTS',           desc: 'Text-to-speech fallback when YarnGPT is unavailable',                 url: 'https://platform.openai.com/docs/guides/text-to-speech',                  tag: 'TTS'    },
      { name: 'ElevenLabs',           desc: 'Additional TTS provider integration',                                 url: 'https://elevenlabs.io',                                                   tag: 'TTS'    },
      { name: 'Google Fact Check API',desc: 'Claim verification for source credibility scoring',                   url: 'https://developers.google.com/fact-check/tools/api',                      tag: 'VERIFY' },
      { name: 'Upstash Vector',       desc: 'Vector index for semantic story recommendations',                     url: 'https://upstash.com/docs/vector',                                         tag: 'VECTOR' },
    ],
  },
  {
    title: 'CONTENT_PIPELINE',
    subtitle: 'News ingestion, scraping cascade, and story synthesis',
    icon: Newspaper,
    tools: [
      { name: 'feedparser',        desc: 'RSS/Atom feed parser — primary ingestion across 40+ feeds',                          url: 'https://feedparser.readthedocs.io',                  tag: 'FEEDS'  },
      { name: 'Mediastack',        desc: 'Real-time news aggregation API',                                                      url: 'https://mediastack.com',                            tag: 'API'    },
      { name: 'NewsData.io',       desc: 'Global news API — second aggregator source',                                          url: 'https://newsdata.io',                               tag: 'API'    },
      { name: 'trafilatura',       desc: 'Primary scraper — purpose-built for news article extraction',                         url: 'https://trafilatura.readthedocs.io',                tag: 'SCRAPER'},
      { name: 'newspaper4k',       desc: 'Secondary scraper — maintained fork of newspaper3k',                                  url: 'https://newspaper4k.readthedocs.io',                tag: 'SCRAPER'},
      { name: 'readability-lxml',  desc: 'Tertiary scraper — Mozilla Readability ported to Python',                             url: 'https://github.com/buriy/python-readability',       tag: 'SCRAPER'},
      { name: 'goose3',            desc: 'Quaternary scraper — robust on JS-rendered news sites',                               url: 'https://goose3.readthedocs.io',                     tag: 'SCRAPER'},
      { name: 'BeautifulSoup4',    desc: 'Final fallback in the extraction cascade',                                            url: 'https://www.crummy.com/software/BeautifulSoup',     tag: 'SCRAPER'},
    ],
  },
  {
    title: 'AUDIO_AND_MEDIA',
    subtitle: 'Playback, synthesis, and live broadcast',
    icon: Waveform,
    tools: [
      { name: 'Tone.js',           desc: 'Web Audio synthesis for cinematic broadcast cues in Morning Briefing',       url: 'https://tonejs.github.io',                                                          tag: 'SYNTHESIS'},
      { name: 'Media Session API', desc: 'OS lock-screen controls, Now Playing metadata, hardware media keys',         url: 'https://developer.mozilla.org/docs/Web/API/Media_Session_API',                     tag: 'NATIVE'   },
      { name: 'Web Audio API',     desc: 'Low-level audio processing, waveform visualisation, fade transitions',      url: 'https://developer.mozilla.org/docs/Web/API/Web_Audio_API',                         tag: 'NATIVE'   },
      { name: 'Radio Browser API', desc: 'Community index of 30 000+ live radio stations worldwide',                   url: 'https://api.radio-browser.info',                                                    tag: 'RADIO'    },
    ],
  },
  {
    title: 'DATA_AND_CACHING',
    subtitle: 'Database, serverless state, and offline storage',
    icon: Database,
    tools: [
      { name: 'Upstash Redis',     desc: 'HTTP Redis for serverless news feed and API response caching',               url: 'https://upstash.com/docs/redis',                  tag: 'CACHE'   },
      { name: 'Upstash Ratelimit', desc: 'Distributed rate limiting across API endpoints',                             url: 'https://upstash.com/docs/ratelimit',              tag: 'LIMIT'   },
      { name: 'Upstash QStash',    desc: 'Scheduled cron jobs — /api/news/refresh every 15 min, briefing at 05:00',   url: 'https://upstash.com/docs/qstash',                 tag: 'QUEUE'   },
      { name: 'Supabase Realtime', desc: 'Channels and broadcast for live feed updates',                               url: 'https://supabase.com/docs/guides/realtime',       tag: 'REALTIME'},
      { name: 'IndexedDB',         desc: 'Browser-side blob cache for offline and instant audio replay',               url: 'https://developer.mozilla.org/docs/Web/API/IndexedDB_API', tag: 'CACHE'},
      { name: 'SWR',               desc: 'React data-fetching with stale-while-revalidate — bookmarks, insights, feed', url: 'https://swr.vercel.app',                        tag: 'FETCHING'},
    ],
  },
  {
    title: 'PWA_AND_PUSH',
    subtitle: 'Offline-first, installability, and notifications',
    icon: DeviceMobile,
    tools: [
      { name: 'Service Worker API',  desc: 'Offline shell caching, background sync, stale-while-revalidate for news', url: 'https://developer.mozilla.org/docs/Web/API/Service_Worker_API',              tag: 'PWA'  },
      { name: 'Web Push API',        desc: 'Server-sent push notifications for briefing-ready and breaking alerts',    url: 'https://developer.mozilla.org/docs/Web/API/Push_API',                        tag: 'PUSH' },
      { name: 'pywebpush',           desc: 'Backend VAPID-signed push notification sender',                            url: 'https://github.com/web-push-libs/pywebpush',                                 tag: 'PUSH' },
      { name: 'Background Sync API', desc: 'Replays bookmarks and listening history when connectivity returns',        url: 'https://developer.mozilla.org/docs/Web/API/Background_Synchronization_API', tag: 'SYNC' },
      { name: 'Web App Manifest',    desc: 'PWA installability — icons, shortcuts, display mode, orientation',        url: 'https://developer.mozilla.org/docs/Web/Manifest',                            tag: 'PWA'  },
    ],
  },
  {
    title: 'HOSTING_AND_DELIVERY',
    subtitle: 'Infrastructure, CI/CD, and analytics',
    icon: Globe,
    tools: [
      { name: 'Vercel',              desc: 'Frontend hosting with edge network, automatic HTTPS, and preview deploys', url: 'https://vercel.com',                    tag: 'HOST'     },
      { name: 'Vercel Analytics',    desc: 'Privacy-friendly page-view and Web Vitals analytics',                      url: 'https://vercel.com/analytics',           tag: 'ANALYTICS'},
      { name: 'Google Cloud Run',    desc: 'Containerised FastAPI backend on managed serverless infrastructure',        url: 'https://cloud.google.com/run',           tag: 'HOST'     },
      { name: 'Google Cloud Build',  desc: 'CI/CD pipeline — Docker build → push → Cloud Run deploy on commit',        url: 'https://cloud.google.com/build',         tag: 'CI/CD'    },
      { name: 'uvicorn',             desc: 'ASGI server that runs FastAPI inside the container',                        url: 'https://www.uvicorn.org',               tag: 'SERVER'   },
    ],
  },
  {
    title: 'SECURITY_AND_AUTH',
    subtitle: 'Identity, request integrity, and secrets',
    icon: ShieldCheck,
    tools: [
      { name: 'Supabase Auth',             desc: 'JWT-based user authentication and session management',          url: 'https://supabase.com/docs/guides/auth',                       tag: 'AUTH'   },
      { name: 'python-jose',               desc: 'JWT signing and verification for backend auth middleware',       url: 'https://python-jose.readthedocs.io',                          tag: 'JWT'    },
      { name: 'passlib + bcrypt',          desc: 'Password hashing',                                               url: 'https://passlib.readthedocs.io',                              tag: 'CRYPTO' },
      { name: 'QStash Signature Verify',   desc: 'HMAC-SHA256 request signing enforced on all cron endpoints',    url: 'https://upstash.com/docs/qstash/howto/signature',             tag: 'VERIFY' },
    ],
  },
  {
    title: 'OBSERVABILITY',
    subtitle: 'Errors, performance, and uptime monitoring',
    icon: ChartLine,
    tools: [
      { name: 'Sentry',        desc: 'Error tracking and performance monitoring — frontend and FastAPI backend', url: 'https://sentry.io',               tag: 'MONITOR'},
      { name: 'Narvo Status',  desc: 'Public status page for API and app uptime',                               url: 'https://narvo.statuspage.io/',    tag: 'UPTIME' },
    ],
  },
  {
    title: 'UI_AND_RUNTIME',
    subtitle: 'React libraries, animation, icons, and i18n',
    icon: Package,
    tools: [
      { name: 'Framer Motion',          desc: 'Physics-based animations — page transitions, player expand, sheet slides', url: 'https://www.framer.com/motion/',                                         tag: 'ANIMATION'},
      { name: 'Phosphor Icons',          desc: 'Consistent icon set used throughout the interface',                        url: 'https://phosphoricons.com',                                               tag: 'ICONS'    },
      { name: 'i18next',                 desc: 'Internationalisation framework — 5 languages supported',                   url: 'https://www.i18next.com',                                                 tag: 'I18N'     },
      { name: 'react-helmet-async',      desc: 'Per-page Open Graph and Twitter Card meta tags for SEO',                  url: 'https://github.com/staylor/react-helmet-async',                           tag: 'SEO'      },
      { name: 'react-intersection-observer', desc: 'IntersectionObserver hook for infinite scroll and audio prefetch',   url: 'https://github.com/thebuilder/react-intersection-observer',               tag: 'HOOKS'    },
      { name: 'httpx',                   desc: 'Async HTTP client for Python — feed fetching and external API calls',     url: 'https://www.python-httpx.org',                                            tag: 'HTTP'     },
      { name: 'aiohttp',                 desc: 'Async HTTP client for radio metadata and aggregator polling',              url: 'https://docs.aiohttp.org',                                                tag: 'HTTP'     },
      { name: 'Vitest',                  desc: 'Unit and component test runner',                                           url: 'https://vitest.dev',                                                      tag: 'TESTING'  },
    ],
  },
  {
    title: 'BROADCAST_LANGUAGES',
    subtitle: 'Audio and UI languages supported across the platform',
    icon: Broadcast,
    tools: [
      { name: 'English',          desc: 'Primary — voice: emma (YarnGPT) / onyx (OpenAI)',                url: 'https://yarngpt.ai', tag: 'LANG'},
      { name: 'Yoruba',           desc: 'Southwest Nigeria — voice: idera (YarnGPT) / nova (OpenAI)',     url: 'https://yarngpt.ai', tag: 'LANG'},
      { name: 'Hausa',            desc: 'Northern Nigeria and West Africa — voice: zainab (YarnGPT)',      url: 'https://yarngpt.ai', tag: 'LANG'},
      { name: 'Igbo',             desc: 'Southeast Nigeria — voice: osagie (YarnGPT)',                    url: 'https://yarngpt.ai', tag: 'LANG'},
      { name: 'Nigerian Pidgin',  desc: 'Pan-Nigerian creole — voice: wura (YarnGPT)',                    url: 'https://yarngpt.ai', tag: 'LANG'},
    ],
  },
  {
    title: 'BACKEND_SERVICES',
    subtitle: 'Specialised service modules in the Python backend',
    icon: Lightning,
    tools: [
      { name: 'narrative_service',      desc: 'Synthesises multi-source composite stories via Gemini (800–1200 words)',   url: 'https://github.com/ajibolagenius/narvo_news', tag: 'SERVICE'},
      { name: 'yarngpt_service',        desc: 'Sentence-boundary TTS chunking — handles long-form narration',             url: 'https://github.com/ajibolagenius/narvo_news', tag: 'SERVICE'},
      { name: 'story_content_service',  desc: 'Manages pre-translation and pre-audio pipeline across all 5 languages',    url: 'https://github.com/ajibolagenius/narvo_news', tag: 'SERVICE'},
      { name: 'article_scraper_service',desc: '5-library cascade scraper — falls through to next extractor on failure',   url: 'https://github.com/ajibolagenius/narvo_news', tag: 'SERVICE'},
      { name: 'recommendation_service', desc: 'Collaborative filtering + Gemini topic expansion + Upstash Vector boost',  url: 'https://github.com/ajibolagenius/narvo_news', tag: 'SERVICE'},
      { name: 'briefing_service',       desc: 'Morning Briefing — AI curated daily audio digest with cinematic cues',     url: 'https://github.com/ajibolagenius/narvo_news', tag: 'SERVICE'},
      { name: 'push_sender',            desc: 'VAPID-signed push delivery via pywebpush',                                 url: 'https://github.com/ajibolagenius/narvo_news', tag: 'SERVICE'},
      { name: 'factcheck_service',      desc: 'Wraps Google Fact Check API with source reputation scoring',               url: 'https://github.com/ajibolagenius/narvo_news', tag: 'SERVICE'},
    ],
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

const ToolsPage = () => {
  const navigate = useNavigate();
  const totalTools = TOOL_CATEGORIES.reduce((acc, cat) => acc + cat.tools.length, 0);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background-dark" data-testid="tools-page">
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scroll">
      {/* ── Hero ── */}
      <section className="py-8 md:py-14 px-4 md:px-10 narvo-border-b bg-surface/10 relative overflow-hidden shrink-0">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#628141 1px, transparent 1px), linear-gradient(90deg, #628141 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="max-w-5xl mx-auto relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mono-ui text-[12px] text-forest hover:text-primary transition-colors mb-6"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" /> BACK
          </button>

          <div className="flex items-center gap-3 mb-3">
            <Broadcast weight="fill" className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <span className="mono-ui text-[11px] md:text-[12px] text-primary font-bold tracking-[0.2em]">
              NARVO_ENGINEERING
            </span>
          </div>

          <h1 className="font-display text-2xl md:text-5xl font-bold uppercase tracking-tight text-content leading-none mb-3">
            Tools &amp; <span className="text-primary">Stack.</span>
          </h1>

          <p className="mono-ui text-[11px] md:text-[12px] text-forest max-w-2xl leading-relaxed mb-6">
            THE TECHNOLOGIES POWERING NARVO'S PRECISION-ENGINEERED BROADCAST
            INFRASTRUCTURE. EVERY COMPONENT CHOSEN FOR PERFORMANCE, RELIABILITY, AND SCALE.
          </p>

          {/* Stats strip */}
          <div className="flex items-center gap-6 md:gap-10 flex-wrap">
            {[
              { label: 'CATEGORIES', value: String(TOOL_CATEGORIES.length) },
              { label: 'COMPONENTS', value: String(totalTools) },
              { label: 'LANGUAGES',  value: '5' },
              { label: 'TTS_VOICES', value: '9' },
              { label: 'RSS_FEEDS',  value: '40+' },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="font-display text-xl md:text-3xl font-bold text-primary leading-none">
                  {value}
                </span>
                <span className="mono-ui text-[9px] text-forest tracking-[0.15em] mt-0.5">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category grid ── */}
      <div className="p-4 md:p-10 pb-32 md:pb-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {TOOL_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.title} className="narvo-border bg-surface/5 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 md:p-5 narvo-border-b bg-surface/20 flex items-center gap-3 shrink-0">
                  <div className="w-8 h-8 md:w-9 md:h-9 narvo-border bg-background-dark flex items-center justify-center shrink-0">
                    <Icon weight="bold" className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="mono-ui text-[12px] md:text-[13px] text-forest font-bold tracking-[0.15em] block leading-tight">
                      {cat.title}
                    </span>
                    <span className="mono-ui text-[9px] text-forest/50 tracking-wider block mt-0.5 truncate">
                      {cat.subtitle.toUpperCase()}
                    </span>
                  </div>
                  <span className="mono-ui text-[10px] text-primary/50 shrink-0 tabular-nums">
                    [{cat.tools.length}]
                  </span>
                </div>

                {/* Tool rows */}
                <div className="divide-y divide-forest/10 flex-1">
                  {cat.tools.map((tool) => (
                    <a
                      key={tool.name}
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 md:p-4 flex items-center gap-3 hover:bg-surface/30 transition-colors group"
                      data-testid={`tool-${tool.name.toLowerCase().replace(/[\s/().+]+/g, '-')}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-display text-sm font-bold text-content uppercase group-hover:text-primary transition-colors leading-snug">
                            {tool.name}
                          </span>
                          <span className="mono-ui text-[9px] text-primary border border-primary/30 px-1.5 py-0.5 bg-primary/10 font-bold shrink-0 leading-tight">
                            {tool.tag}
                          </span>
                        </div>
                        <p className="mono-ui text-[10px] md:text-[11px] text-forest/60 leading-snug">
                          {tool.desc}
                        </p>
                      </div>
                      <ArrowSquareOut
                        weight="bold"
                        className="w-3.5 h-3.5 text-forest/30 group-hover:text-primary transition-colors shrink-0"
                      />
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </main>
    </div>
  );
};

export default ToolsPage;
