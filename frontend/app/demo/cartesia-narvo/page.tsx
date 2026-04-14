import type { Metadata } from 'next';
import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Globe2,
  Headphones,
  Play,
  Radio,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { NarvoLogoMark } from '@/components/NarvoLogo';

export const metadata: Metadata = {
  title: 'Narvo Cartesia Concept',
  description:
    "A Narvo landing-page demo that applies the extracted Cartesia Sonic design system to Narvo's approved brand, copy, and product story.",
};

type FeaturePillar = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type ProofStat = {
  value: string;
  label: string;
  detail: string;
};

type FlowStep = {
  number: string;
  title: string;
  description: string;
};

type BriefingItem = {
  tag: string;
  title: string;
  meta: string;
};

const languages = ['English', 'Pidgin', 'Yoruba', 'Hausa', 'Igbo'] as const;

const briefingQueue: BriefingItem[] = [
  {
    tag: 'Top Story',
    title: 'Markets, power, and transport in one calm briefing',
    meta: '02:14 min summary',
  },
  {
    tag: 'Verification',
    title: 'Cross-checked with reporting that still holds up',
    meta: '3 sources compared',
  },
  {
    tag: 'Playback',
    title: 'Switch language or voice without losing the thread',
    meta: '5 voice routes live',
  },
];

const featurePillars: FeaturePillar[] = [
  {
    title: 'Audio-First',
    description: 'Clear voices, built for your commute, your kitchen, and your morning.',
    icon: Headphones,
  },
  {
    title: 'Your Language',
    description: 'Yoruba, Hausa, Igbo, Pidgin, English. Hear the story the way it fits your world.',
    icon: Globe2,
  },
  {
    title: 'Cross-Checked',
    description: 'See the sources, confidence, and context behind every story.',
    icon: ShieldCheck,
  },
  {
    title: 'Morning Briefing',
    description: 'Wake up to the stories that matter, already sorted for you.',
    icon: Radio,
  },
];

const proofStats: ProofStat[] = [
  {
    value: '7 min',
    label: 'Daily rhythm',
    detail: 'A quick morning pass, not another endless feed.',
  },
  {
    value: '5 voices',
    label: 'Language routes',
    detail: 'Built for English, Pidgin, Yoruba, Hausa, and Igbo.',
  },
  {
    value: '3+ checks',
    label: 'Trust layer',
    detail: 'Sources, confidence, and context sit beside the audio.',
  },
];

const flowSteps: FlowStep[] = [
  {
    number: '[01]',
    title: 'Scan what matters',
    description:
      "Narvo turns the day's biggest stories into one calm sequence, so the signal arrives before the noise does.",
  },
  {
    number: '[02]',
    title: 'Hear it your way',
    description:
      'The same story can move between voices and languages without breaking the briefing structure.',
  },
  {
    number: '[03]',
    title: 'Check what holds up',
    description:
      'Every important story keeps its evidence nearby, so trust stays inside the product instead of outside it.',
  },
];

function Shell({
  children,
  className = '',
  ...props
}: {
  children: ReactNode;
  className?: string;
} & ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={`rounded-[30px] border border-white/10 bg-white/[0.03] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-white/58">
      <span className="font-mono text-white/72">{index}</span>
      <span className="h-px flex-1 bg-white/10" />
      <span className="font-sans">{label}</span>
    </div>
  );
}

export default function CartesiaNarvoDemoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071017] text-narvo-cloud">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-[-8rem] top-[-4rem] h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(127,221,202,0.18) 0%, rgba(127,221,202,0) 72%)' }}
        />
        <div
          className="absolute right-[-12rem] top-[10rem] h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(15,95,115,0.28) 0%, rgba(15,95,115,0) 72%)' }}
        />
        <div
          className="absolute bottom-[-10rem] left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(240,75,36,0.14) 0%, rgba(240,75,36,0) 70%)' }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div
          className="noise-overlay overflow-hidden rounded-[24px] border border-[#3a514f] px-4 py-3 text-sm text-[#d7efe9] sm:px-6"
          style={{
            background:
              'linear-gradient(90deg, rgba(127,221,202,0.2) 0%, rgba(15,95,115,0.88) 52%, rgba(10,73,89,0.92) 100%)',
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-sans text-[13px] leading-5 tracking-[0.02em] text-[#ecfaf6]">
              The day&apos;s biggest stories, turned into a briefing.
            </p>
            <p className="font-sans text-[12px] uppercase tracking-[0.28em] text-[#ddfff7]/80">
              Now shaped for {languages.join(' • ')}
            </p>
          </div>
        </div>

        <header className="rounded-[28px] border border-white/10 bg-black/20 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-2">
                <span className="rounded-full bg-[#f2d66b]">
                  <NarvoLogoMark size="sm" inset="tight" className="h-8 w-8" />
                </span>
                <div className="pr-2">
                  <div className="font-sans text-sm font-semibold tracking-[0.14em] text-white">NARVO</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/46">
                    Audio news system
                  </div>
                </div>
              </div>
              <div className="hidden rounded-full border border-[#346c62] bg-[#14362e]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b7f0dc] md:inline-flex">
                Cartesia concept, Narvo voice
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-sm text-white/68">
              <a href="#pillars" className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white">
                Pillars
              </a>
              <a href="#flow" className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white">
                Flow
              </a>
              <a href="#trust" className="rounded-full px-3 py-2 transition hover:bg-white/5 hover:text-white">
                Trust
              </a>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-white transition hover:bg-white/[0.09]"
              >
                Start listening
                <ArrowRight className="h-4 w-4" />
              </Link>
            </nav>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <Shell className="relative overflow-hidden px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, rgba(127,221,202,0) 0%, rgba(127,221,202,0.85) 52%, rgba(127,221,202,0) 100%)' }}
            />
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.34em] text-white/56">
              [ Africa&apos;s news, spoken clearly ]
            </p>
            <h1 className="max-w-4xl font-serif text-[3.2rem] leading-[0.94] font-semibold tracking-[-0.05em] text-[#f6f8fb] sm:text-[4.5rem] lg:text-[5.6rem]">
              Less scrolling.
              <br />
              More understanding.
            </h1>
            <p className="mt-6 max-w-2xl font-sans text-base leading-7 text-white/70 sm:text-lg">
              News that speaks your language. Summarised, cross-checked, and read aloud so you can
              stay informed without looking at a screen.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-narvo-vermilion px-5 py-3 font-sans text-sm font-semibold text-white transition hover:bg-narvo-vermilion-hover"
              >
                Oya, Start Listening
                <Play className="h-4 w-4 fill-current" />
              </Link>
              <Link
                href="/listen"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 font-sans text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Try it first
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {proofStats.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-black/15 p-4">
                  <div className="font-serif text-[1.8rem] leading-none tracking-[-0.05em] text-white">
                    {item.value}
                  </div>
                  <div className="mt-2 font-sans text-sm font-semibold text-white/90">{item.label}</div>
                  <p className="mt-2 text-sm leading-6 text-white/58">{item.detail}</p>
                </div>
              ))}
            </div>
          </Shell>

          <Shell className="overflow-hidden p-4 sm:p-5">
            <div
              className="rounded-[26px] border border-white/10 p-4 sm:p-5"
              style={{
                background:
                  'linear-gradient(180deg, rgba(15,95,115,0.3) 0%, rgba(10,73,89,0.16) 36%, rgba(7,16,23,0.9) 100%)',
              }}
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">
                    Morning briefing
                  </p>
                  <h2 className="mt-2 font-serif text-3xl leading-tight tracking-[-0.04em] text-white">
                    The day&apos;s biggest stories, turned into a briefing.
                  </h2>
                </div>
                <div className="hidden rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-white/58 sm:block">
                  07:00 ready
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {languages.map((language) => (
                  <span
                    key={language}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-white/68"
                  >
                    {language}
                  </span>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {briefingQueue.map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
                      <Waves className="h-4 w-4 text-[#7fddca]" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/46">
                        {item.tag}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-6 text-white">{item.title}</div>
                      <div className="mt-1 text-sm text-white/52">{item.meta}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="mt-5 rounded-[24px] border px-4 py-4"
                style={{
                  borderColor: 'rgba(127,221,202,0.28)',
                  background:
                    'linear-gradient(135deg, rgba(127,221,202,0.12) 0%, rgba(15,95,115,0.1) 55%, rgba(240,75,36,0.1) 100%)',
                }}
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-[#7fddca]" />
                  <div>
                    <div className="font-sans text-sm font-semibold text-white">
                      See the sources, confidence, and context behind every story.
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/66">
                      Narvo keeps the trust layer inside the listening experience instead of making
                      you leave to verify the gist elsewhere.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Shell>
        </section>

        <section id="pillars" className="grid gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <Shell className="px-5 py-7 sm:px-7 sm:py-8">
            <SectionLabel index="[01]" label="Narvo pillars" />
            <h2 className="max-w-xl font-serif text-[2.5rem] leading-[0.98] tracking-[-0.05em] text-white sm:text-[3.4rem]">
              The Cartesia structure, translated into a calmer African news ritual.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/68">
              The page keeps the same dark modular rhythm, strong type hierarchy, bordered shells,
              and high-signal CTA moments. What changes is the product story: audio news, language
              access, and visible trust.
            </p>
          </Shell>

          <div className="grid gap-5 md:grid-cols-2">
            {featurePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Shell key={pillar.title} className="px-5 py-6 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                      <Icon className="h-5 w-5 text-[#f2d66b]" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                      Signal
                    </span>
                  </div>
                  <h3 className="mt-5 font-serif text-[1.9rem] leading-tight tracking-[-0.04em] text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/62">{pillar.description}</p>
                </Shell>
              );
            })}
          </div>
        </section>

        <section id="flow" className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Shell className="px-5 py-7 sm:px-7 sm:py-8">
            <SectionLabel index="[02]" label="System flow" />
            <h2 className="max-w-2xl font-serif text-[2.5rem] leading-[0.98] tracking-[-0.05em] text-white sm:text-[3.3rem]">
              One product rhythm: understand first, then decide how deep to go.
            </h2>
            <div className="mt-8 space-y-4">
              {flowSteps.map((step) => (
                <div
                  key={step.number}
                  className="grid gap-3 rounded-[24px] border border-white/10 bg-black/15 p-4 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-start sm:p-5"
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#7fddca]">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-serif text-[1.65rem] leading-tight tracking-[-0.04em] text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/62">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Shell>

          <Shell id="trust" className="overflow-hidden px-5 py-7 sm:px-7 sm:py-8">
            <SectionLabel index="[03]" label="Trust layer" />
            <div className="flex flex-col gap-5">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/46">
                  What Narvo could verify
                </div>
                <h3 className="mt-3 font-serif text-[2rem] leading-tight tracking-[-0.04em] text-white">
                  Here&apos;s why we trust this story.
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/64">
                  Narvo compared the reporting, checked the sources, and scored this story based on
                  what holds up right now.
                </p>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                    <div className="text-sm font-semibold text-white">Cross-checked with 3 sources</div>
                    <div className="mt-1 text-sm text-white/54">
                      Reuters, local reporting, and agency follow-up aligned on the core facts.
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                    <div className="text-sm font-semibold text-white">Confidence: 91%</div>
                    <div className="mt-1 text-sm text-white/54">
                      Context is stable enough to summarise without flattening the nuance.
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <CheckCircle2 className="h-4 w-4 text-[#7fddca]" />
                      See the sources behind this story
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#3f534f] bg-[#0f1d21] p-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#9ee8d7]">
                  Audio-first habits
                </div>
                <p className="mt-3 text-base leading-7 text-[#e9f7f3]">
                  Clear voices, built for your commute, your kitchen, and your morning.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Commute', 'Kitchen', 'Walk', 'Early shift'].map((moment) => (
                    <span
                      key={moment}
                      className="rounded-full border border-[#45665f] bg-[#143129] px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-[#c5f3e7]"
                    >
                      {moment}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Shell>
        </section>

        <section className="pb-6">
          <Shell className="relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background:
                  'linear-gradient(135deg, rgba(15,95,115,0.18) 0%, rgba(15,95,115,0.04) 42%, rgba(240,75,36,0.12) 100%)',
              }}
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <SectionLabel index="[04]" label="Call to action" />
                <h2 className="font-serif text-[2.5rem] leading-[0.98] tracking-[-0.05em] text-white sm:text-[3.4rem]">
                  Africa&apos;s news, spoken clearly.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/68">
                  This concept keeps Cartesia&apos;s premium dark system, but recasts it around Narvo&apos;s
                  real promise: less scrolling, more understanding.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f6f8fb] px-5 py-3 text-sm font-semibold text-[#071017] transition hover:bg-white"
                >
                  Oya, Start Listening
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
                >
                  Explore the product
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Shell>
        </section>
      </div>
    </main>
  );
}
