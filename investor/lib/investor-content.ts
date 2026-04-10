import type { InvestorContentBundle } from '@/lib/investor-types';

export const siteLinks = [
  { href: '/', label: 'Overview' },
  { href: '/pitch', label: 'Pitch' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/roadmap', label: 'Roadmap' },
] as const;

export const investorContentSeed = {
  overviewStats: [
    {
      value: '39+',
      label: 'source feeds already mapped into the Narvo pipeline',
      detail: 'Local Nigerian, pan-African, business, tech, and global coverage.',
    },
    {
      value: '5',
      label: 'launch languages for the first multilingual audio rollout',
      detail: 'English, Nigerian Pidgin, Yoruba, Hausa, and Igbo.',
    },
    {
      value: '05:00',
      label: 'the daily Morning Briefing ritual Narvo is built to own',
      detail: 'Pre-generated overnight so playback feels immediate at first open.',
    },
    {
      value: 'B2C + B2B',
      label: 'one intelligence layer powering both Narvo and Narvo NaaS',
      detail: 'Consumer proof first, platform leverage next.',
    },
  ],
  operatingModel: [
    {
      name: 'Narvo Intelligence',
      audience: 'Parent company',
      summary:
        'Owns the AI pipeline, the brand IP, investor relations, and the operating structure that sits above product execution.',
    },
    {
      name: 'Narvo',
      audience: 'Consumer audio product',
      summary:
        'The daily listening product for commuters, diaspora users, students, and lower-literacy audiences that need the gist fast and in a familiar voice.',
    },
    {
      name: 'Narvo NaaS',
      audience: 'Business and platform layer',
      summary:
        'The same narrative, translation, TTS, and trust engine exposed as programmable infrastructure for publishers, stations, and public institutions.',
    },
  ],
  whyNowSignals: [
    {
      title: 'Audio incumbents validated demand, then left the field',
      body:
        'Curio, Audm, and Artifact proved the appetite for audio news, but their operating models broke before anyone built a Nigeria-first version.',
    },
    {
      title: 'AI synthesis cost has collapsed into a viable consumer margin',
      body:
        'Gemini, Groq, YarnGPT, and the current Narvo pipeline move story generation from human-narration economics into repeatable software economics.',
    },
    {
      title: 'African digital payments and micro-pricing are finally normal',
      body:
        'Nation Africa, Paystack, and mobile payment behavior show that paid digital media is now believable when value is clear and local.',
    },
  ],
  convictionPoints: [
    'Trust first: every serious story should show how it was sourced, synthesized, and verified.',
    'Language as access: local-language audio is a distribution advantage, not a post-launch nice-to-have.',
    'Audio before article chrome: Narvo is built for eyes-busy moments, not desktop reading rituals.',
    'Africa-first by design: the product should feel born in-market, not localized after the fact.',
  ],
  pitchChapters: [
    {
      id: 'problem',
      kicker: 'Problem',
      title: 'African news is fragmented, text-heavy, and trust-poor.',
      summary:
        'People receive the same story across dozens of outlets, in languages that exclude them, with no consistent trust layer and no product designed for listening-first consumption.',
      bullets: [
        'The current market still assumes literate, data-rich, article-reading behavior.',
        'Information overload and low trust compound each other.',
        'No single product synthesizes, translates, voices, and verifies the news in one loop.',
      ],
      stat: '80M+',
      statLabel: 'Nigerian adults estimated to have limited reading ability',
    },
    {
      id: 'window',
      kicker: 'Why now',
      title: 'The timing is unusually favorable for a new category winner.',
      summary:
        'Narvo launches into a moment where audio-news demand is already validated, AI generation cost has dropped, and African digital payments are strong enough for consumer subscription experiments.',
      bullets: [
        'Audio-first competitors validated the habit but not the regional product fit.',
        'AI narration and synthesis now support broadcast-grade output without human newsroom cost structures.',
        'Micro-pricing in African media is no longer speculative.',
      ],
      stat: '7.5M',
      statLabel: 'weekly BBC Pidgin audience proving demand for familiar-language news',
    },
    {
      id: 'product',
      kicker: 'Product',
      title: 'Narvo turns the day into a spoken briefing, not a reading chore.',
      summary:
        'The consumer product centers on Morning Briefing, on-demand playback, trust-tagged story detail, offline access, and a language-aware listening flow built for commuting and multitasking.',
      bullets: [
        'Morning Briefing is the repeatable habit surface.',
        'Truth Tag makes verification visible without making the UI feel forensic.',
        'Offline caching matters because connectivity gaps are a daily reality, not an edge case.',
      ],
      stat: '5',
      statLabel: 'Nigerian launch languages already planned in the pipeline',
    },
    {
      id: 'distribution',
      kicker: 'Distribution',
      title: 'Pidgin and WhatsApp create a wedge incumbents are not serving.',
      summary:
        'The highest-leverage early loop is a Pidgin audio brief plus shareable WhatsApp clips. It aligns with how people already pass information around.',
      bullets: [
        'Pidgin audio is culturally native and still largely uncontested.',
        'WhatsApp behavior favors short audio artifacts that can move through social graphs quickly.',
        'Diaspora users and commuters both benefit from the same format shift.',
      ],
      stat: '75M',
      statLabel: 'Pidgin speakers across Nigeria and nearby markets',
    },
    {
      id: 'defensibility',
      kicker: 'Defensibility',
      title: 'The moat is the pipeline, not the skin of the app.',
      summary:
        'Narvo compounds value through clustered multi-source synthesis, language-specific TTS, truth metadata, and the data flywheel that emerges from daily usage and source reliability scoring.',
      bullets: [
        'Truth Tag can mature into a B2B reliability dataset.',
        'The same backend can power white-label, broadcast, and partner use cases.',
        'Offline, translation, and narration infrastructure are harder to copy than a landing page.',
      ],
      stat: '2',
      statLabel: 'product lines already supported by the same core intelligence layer',
    },
    {
      id: 'business',
      kicker: 'Business model',
      title: 'Consumer proof comes first, platform revenue compounds later.',
      summary:
        'Narvo begins as a premium audio news companion with micro-pricing and then extends the proven backend into APIs, white-label products, and enterprise briefings.',
      bullets: [
        'B2C revenue starts with weekly, monthly, and diaspora subscription pricing.',
        'B2B upside comes from NaaS, trust infrastructure, and broadcast tooling.',
        'The consumer app is both demand proof and product R&D for the platform layer.',
      ],
      stat: '£80K',
      statLabel: 'target pre-seed ask called out in the parent-company plan',
    },
    {
      id: 'ask',
      kicker: 'Ask',
      title: 'Use the next round to prove retention, trust, and repeatable distribution.',
      summary:
        'The immediate use of capital is disciplined: finish the v2 product surfaces, harden the expensive routes, instrument the funnel, ship Pidgin audio, and create a clean path into the first institutional conversations.',
      bullets: [
        'Complete the v2 consumer launch surfaces and onboarding loop.',
        'Add investor-grade analytics, stronger operational telemetry, and cost controls.',
        'Turn the product story into a measurable retention and conversion narrative.',
      ],
      stat: 'Q3 2026',
      statLabel: 'target product launch window in the parent roadmap',
    },
  ],
  roadmapPhases: [
    {
      id: 'foundation',
      window: 'Q2 2026',
      title: 'Foundation and investor clarity',
      summary:
        'Tighten the company story, launch the investor-facing surface, harden the riskiest backend paths, and set up clean instrumentation before broader outreach.',
      casual: [
        'The story becomes understandable in one session instead of one long document chain.',
        'Investors can move from overview to pitch to roadmap without losing context.',
        'The product looks like a company preparing to ship, not a prototype waiting for a narrative.',
      ],
      technical: [
        'Complete the Next.js investor migration and route cleanup.',
        'Add first-party tracking for pages, chapter views, roadmap interest, and CTA intent.',
        'Prioritize auth-sensitive routes, rate limits, and expensive endpoint controls.',
      ],
      commercial: [
        'Prepare grant submissions and early investor outreach with a cleaner proof surface.',
        'Align parent-company materials with one operating thesis.',
      ],
    },
    {
      id: 'launch',
      window: 'Q3 2026',
      title: 'Consumer launch and repeatable user loop',
      summary:
        'Ship the focused Narvo v2 loop: clearer landing, onboarding, audio-first dashboard, Morning Briefing, trust cues, offline replay, and practical sharing.',
      casual: [
        'A new user can understand Narvo in seconds and hear the gist quickly.',
        'Morning Briefing becomes the signature habit, especially for commuting contexts.',
        'WhatsApp sharing and offline replay make the product feel native to real Nigerian usage.',
      ],
      technical: [
        'Finish the dashboard, briefing, story detail, truth-tag, and offline surfaces.',
        'Keep the synthesis pipeline reliable with scheduled generation and source-health monitoring.',
        'Use analytics to validate the landing-to-playback path before expanding scope.',
      ],
      commercial: [
        'The company can fundraise from a product that actually demonstrates behavior, not just ambition.',
        'The consumer launch becomes the strongest lead-in to Narvo NaaS.',
      ],
    },
    {
      id: 'fundraise',
      window: 'Q3 to Q4 2026',
      title: 'Fundraise and first-team formation',
      summary:
        'Translate launch evidence into a pre-seed process, trademark protection, first hires, and a sharper split between daily execution and founder-only load.',
      casual: [
        'The narrative shifts from “solo build” to “repeatable operating model.”',
        'Investors see what is already working, what needs funding, and what hires unblock next-stage velocity.',
      ],
      technical: [
        'Turn telemetry into retention, activation, and engagement reporting.',
        'Create cleaner ownership boundaries across frontend, backend, and design-system execution.',
        'Use performance budgets and deployment discipline to keep the product credible as usage grows.',
      ],
      commercial: [
        'Raise the pre-seed, hire selectively, and protect the brand at the legal layer.',
        'Produce a stronger one-pager, financial model, and investor follow-up package.',
      ],
    },
    {
      id: 'scale',
      window: '2027+',
      title: 'Scale the product into infrastructure',
      summary:
        'Expand Narvo beyond a strong consumer product into a broader African media-intelligence company with paid subscriptions, recommendations, and NaaS capabilities.',
      casual: [
        'The consumer experience becomes smarter, more personalized, and more region-aware.',
        'The company story evolves from “audio-first app” to “media infrastructure with a consumer wedge.”',
      ],
      technical: [
        'Add monetization, recommendation systems, richer analytics, and mature monitoring.',
        'Expose the underlying narrative, translation, TTS, and briefing services as partner-ready APIs.',
        'Prepare for regional expansion into Ghana, East Africa, and enterprise clients.',
      ],
      commercial: [
        'Move from micro-subscriptions into B2B contracts, platform pricing, and larger fundraising narratives.',
        'Support the first serious Narvo NaaS conversations with production evidence.',
      ],
    },
  ],
  roadmapTracks: [
    {
      title: 'User loop',
      now: 'Landing clarity, onboarding, Morning Briefing, and truth-led story detail.',
      next: 'Offline surfacing, WhatsApp clip sharing, and stronger resume-listening behavior.',
      later: 'Personalization, premium voices, and native mobile packaging.',
    },
    {
      title: 'Trust and operations',
      now: 'Security hardening, expensive route controls, and reliable briefing generation.',
      next: 'Better source-health visibility, stronger telemetry, and operational dashboards.',
      later: 'Deeper trust scoring and broader verification infrastructure.',
    },
    {
      title: 'Growth and analytics',
      now: 'Page, CTA, chapter, and roadmap tracking to understand investor and product narratives.',
      next: 'Funnel reporting, retention cuts, and event forwarding into Mixpanel or a similar stack.',
      later: 'Cohort analytics, revenue tracking, and channel attribution.',
    },
    {
      title: 'Platform leverage',
      now: 'Narrative, translation, TTS, and trust systems remain internal but aligned.',
      next: 'Package the strongest services into controlled partner proofs.',
      later: 'Launch Narvo NaaS with API, white-label, and enterprise narrative tooling.',
    },
  ],
  telemetryCatalog: [
    {
      name: 'page_view',
      description: 'Captures route-level interest across overview, pitch, analytics, and roadmap.',
    },
    {
      name: 'cta_click',
      description: 'Measures movement between core investor actions such as opening the pitch or roadmap.',
    },
    {
      name: 'section_view',
      description: 'Records which overview sections people actually consume, not just which page they opened.',
    },
    {
      name: 'pitch_chapter_view',
      description: 'Shows where investor attention concentrates inside the narrative deck.',
    },
    {
      name: 'roadmap_phase_view',
      description: 'Highlights whether visitors care more about launch execution, fundraising, or platform scale.',
    },
    {
      name: 'metrics_refresh',
      description: 'Tracks deliberate investor interest in live operating signals.',
    },
  ],
} satisfies InvestorContentBundle;
