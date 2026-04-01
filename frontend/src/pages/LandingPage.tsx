import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import {
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  GlobeHemisphereEast,
  Play,
  ShieldCheck,
  Sparkle,
  Waveform,
} from '@phosphor-icons/react';
import NarvoLogo from '../components/NarvoLogo';
import { ButtonPrimary, ButtonSecondary } from '../components/primitives/Buttons';
import { StatusPill, TruthPill } from '../components/primitives/Pills';
import { StoryCardCompact } from '../components/StoryCardCompact';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../lib/api';
import logger from '../lib/logger';
import { asArray, isStory } from '../lib/validators';
import type { Story } from '../types/story';

interface BriefingSummary {
  id?: string;
  title?: string;
  duration_estimate?: string;
  stories?: { id?: string; title?: string }[];
}

const easing: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fetchStories = async (): Promise<Story[]> => {
  try {
    const res = await api.get('api/news?limit=4');
    if (!res.ok) return [];
    return asArray<Story>(await res.json(), isStory);
  } catch (error) {
    logger.debug('[LandingPage] Failed to fetch landing stories', error);
    return [];
  }
};

const fetchBriefing = async (): Promise<BriefingSummary | null> => {
  try {
    const res = await api.get('api/briefing/latest');
    if (!res.ok) return null;
    return (await res.json()) as BriefingSummary;
  } catch (error) {
    logger.debug('[LandingPage] Failed to fetch briefing summary', error);
    return null;
  }
};

const toTruthStatus = (score: unknown): 'verified' | 'mixed' | 'checking' => {
  const certainty = typeof score === 'number' ? score : 0;
  if (certainty >= 75) return 'verified';
  if (certainty >= 45) return 'mixed';
  return 'checking';
};

const formatPublished = (story: Story) => {
  const value = story.published || story.published_at || story.created_at;
  if (!value) return 'Today';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

const metricCards = [
  { label: 'Morning ritual', value: '5 AM ready', body: 'Open the app, press play, and start with the signal.' },
  { label: 'Trust layer', value: 'Truth visible', body: 'Verification stays compact, readable, and present on every important surface.' },
  { label: 'Built for listening', value: 'Large controls', body: 'The player cluster is central, obvious, and calmer than noisy media apps.' },
];

const featureCards = [
  {
    icon: ShieldCheck,
    title: 'Trust cues that feel human',
    body: 'Truth pills, certainty, and source context stay visible without turning the product into a forensic dashboard.',
  },
  {
    icon: Waveform,
    title: 'Audio-first by default',
    body: 'Briefing and playback are treated as first-class surfaces, not side features bolted onto a feed.',
  },
  {
    icon: GlobeHemisphereEast,
    title: 'Made for Nigerian context',
    body: 'Language, signal, and browsing surfaces are shaped around how Narvo is actually used every morning.',
  },
  {
    icon: DownloadSimple,
    title: 'Designed for weak networks',
    body: 'Offline and low-bandwidth moments are part of the product posture, not an afterthought.',
  },
];

const productSteps = [
  'Start with Morning Briefing',
  'Scan the cards, not a wall of links',
  'Play the story that matters',
  'Check trust and source context only when needed',
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stories = [] } = useSWR('landing-stories', fetchStories, {
    revalidateOnFocus: false,
    dedupingInterval: 120000,
  });
  const { data: briefing } = useSWR('landing-briefing', fetchBriefing, {
    revalidateOnFocus: false,
    dedupingInterval: 120000,
  });

  const primaryPath = user ? '/dashboard' : '/auth';
  const primaryLabel = user ? 'Open dashboard' : 'Start with Narvo';
  const leadStory = stories[0];
  const secondaryStories = useMemo(() => stories.slice(1, 4), [stories]);

  return (
    <>
      <Helmet>
        <title>Narvo — Hear the gist</title>
        <meta
          name="description"
          content="Narvo is a trust-first, audio-first news product built for calmer mornings, clearer listening, and faster understanding."
        />
      </Helmet>

      <main className="pb-24">
        <section className="page-container pt-6 md:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easing }}
            className="shell-panel overflow-hidden p-5 md:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary text-white shadow-[var(--shadow-2)]">
                  <NarvoLogo className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="meta-eyebrow">Narvo Intelligence</div>
                  <div className="mt-1 text-[15px] font-semibold tracking-tight text-content">Audio-first news. Trust-first interface.</div>
                </div>
              </div>

              <div className="hidden items-center gap-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-content-secondary md:flex">
                <button type="button" onClick={() => navigate('/listen')}>Listen</button>
                <button type="button" onClick={() => navigate('/discover')}>Discover</button>
                <button type="button" onClick={() => navigate('/settings')}>Profile</button>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <div
                className="relative overflow-hidden rounded-[32px] p-6 md:p-8 text-white"
                style={{
                  background:
                    'radial-gradient(circle at 78% 76%, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, var(--color-primary) 0%, #0a4859 100%)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="meta-eyebrow !text-white/58">LandingHeroFrame</div>
                  <StatusPill status="live" className="!bg-white/14 !text-white !border-white/12">Live signal</StatusPill>
                </div>

                <h1 className="mt-8 max-w-[760px] font-display text-[64px] font-bold leading-[0.85] tracking-[-0.06em] md:text-[110px]">
                  HEAR THE GIST.
                </h1>
                <p className="mt-5 max-w-[540px] text-base leading-7 text-white/82 md:text-lg">
                  A modern Nigerian news product designed for listening, trust, and a calmer daily ritual.
                  Big hero, clear action, and a product system that gets quieter when reading starts.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <ButtonPrimary
                    size="landing"
                    icon={<Play size={16} weight="fill" />}
                    onClick={() => navigate(primaryPath)}
                  >
                    {primaryLabel}
                  </ButtonPrimary>
                  <ButtonSecondary
                    size="lg"
                    icon={<ArrowRight size={16} weight="bold" />}
                    onClick={() => navigate('/discover')}
                  >
                    Explore product
                  </ButtonSecondary>
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-3">
                  {metricCards.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-[22px] border border-white/12 bg-white/10 p-4"
                    >
                      <div className="meta-eyebrow !text-white/52">{metric.label}</div>
                      <div className="mt-2 text-[18px] font-semibold text-white">{metric.value}</div>
                      <p className="mt-2 text-sm leading-6 text-white/72">{metric.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="shell-card-soft p-5 md:p-6">
                  <div className="meta-eyebrow">Morning briefing</div>
                  <h2 className="section-heading mt-3 text-[38px] text-content md:text-[48px]">
                    One premium ritual. One strong next action.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-content-secondary md:text-base">
                    Large controls, clear labels, and a player posture that feels like a daily tool,
                    not a noisy media carousel.
                  </p>

                  <div className="mt-5 rounded-[24px] border border-border bg-white p-4 shadow-[var(--shadow-1)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="meta-eyebrow">Today’s briefing</div>
                        <div className="mt-2 text-[24px] font-semibold leading-tight text-content">
                          {briefing?.title || 'Markets, policy, and culture. One clear briefing.'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/briefing')}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-alert text-white shadow-[0_0_0_1px_rgba(240,75,36,0.16),0_0_22px_rgba(240,75,36,0.16)]"
                        aria-label="Play briefing"
                      >
                        <Play size={20} weight="fill" />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusPill status="queued">{briefing?.duration_estimate || '8 min'}</StatusPill>
                      <TruthPill status="verified">Trust-first summary</TruthPill>
                    </div>
                    {briefing?.stories?.length ? (
                      <div className="mt-4 space-y-2">
                        {briefing.stories.slice(0, 3).map((story, index) => (
                          <div key={story.id || `${story.title}-${index}`} className="flex items-center gap-3">
                            <span className="meta-eyebrow min-w-[18px]">{String(index + 1).padStart(2, '0')}</span>
                            <span className="text-sm text-content-secondary">{story.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {featureCards.slice(0, 2).map((feature) => (
                    <div key={feature.title} className="shell-card p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                        <feature.icon size={18} weight="fill" />
                      </div>
                      <h3 className="section-heading mt-4 text-[30px] text-content">{feature.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-content-secondary">{feature.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="page-container mt-8 md:mt-10">
          <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="shell-card-soft p-5 md:p-6">
              <div className="meta-eyebrow">Why the system feels different</div>
              <h2 className="section-heading mt-3 text-[42px] text-content md:text-[56px]">
                Big surfaces where habit matters. Calm surfaces where trust matters.
              </h2>
              <div className="mt-6 space-y-3">
                {productSteps.map((step) => (
                  <div key={step} className="flex items-center gap-3 rounded-[20px] bg-white/86 px-4 py-3">
                    <CheckCircle size={18} weight="fill" className="text-primary" />
                    <span className="text-sm font-medium text-content-secondary">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {featureCards.slice(2).map((feature) => (
                <div key={feature.title} className="shell-card p-5 md:p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                    <feature.icon size={18} weight="fill" />
                  </div>
                  <h3 className="section-heading mt-4 text-[30px] text-content">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-content-secondary">{feature.body}</p>
                </div>
              ))}
              <div className="shell-card p-5 md:p-6 md:col-span-2">
                <div className="meta-eyebrow">The metadata layer</div>
                <h3 className="section-heading mt-3 text-[34px] text-content">Pills stay semantic, not decorative.</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill status="breaking">Breaking</StatusPill>
                  <StatusPill status="saved">Saved</StatusPill>
                  <TruthPill status="verified">Verified</TruthPill>
                  <TruthPill status="mixed">Mixed</TruthPill>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-container mt-8 md:mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="meta-eyebrow">Live product snapshot</div>
              <h2 className="section-heading mt-3 text-[42px] text-content md:text-[58px]">
                The product below the hero should feel cleaner, calmer, and more modular.
              </h2>
            </div>
            <ButtonSecondary
              size="lg"
              icon={<ArrowRight size={16} weight="bold" />}
              onClick={() => navigate('/dashboard')}
            >
              See dashboard
            </ButtonSecondary>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col gap-4">
              {leadStory ? (
                <StoryCardCompact
                  id={leadStory.id}
                  category={leadStory.category || 'Top Story'}
                  headline={leadStory.title || 'Today’s most important story'}
                  summary={leadStory.short_summary || leadStory.summary || 'Listen to the clearest summary first.'}
                  source={leadStory.source || 'Narvo'}
                  timestamp={formatPublished(leadStory)}
                  truthStatus={toTruthStatus(leadStory.certainty_score)}
                  imageUrl={leadStory.image_url || undefined}
                  onPlay={() => navigate(`/news/${leadStory.id}`)}
                />
              ) : (
                <div className="shell-card p-6">
                  <div className="meta-eyebrow">Waiting for signal</div>
                  <h3 className="section-heading mt-3 text-[34px] text-content">The live feed will plug into the same large-card system.</h3>
                  <p className="mt-3 text-sm leading-7 text-content-secondary">
                    This section is wired to live news data. If the endpoint is quiet, the shell still holds its structure.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {secondaryStories.length > 0 ? (
                secondaryStories.map((story) => (
                  <StoryCardCompact
                    key={story.id}
                    id={story.id}
                    category={story.category || 'Signal'}
                    headline={story.title || 'Story'}
                    summary={story.short_summary || story.summary || 'Compact cards still breathe.'}
                    source={story.source || 'Narvo'}
                    timestamp={formatPublished(story)}
                    truthStatus={toTruthStatus(story.certainty_score)}
                    imageUrl={story.image_url || undefined}
                    onPlay={() => navigate(`/news/${story.id}`)}
                  />
                ))
              ) : (
                <div className="shell-card md:col-span-2 p-6">
                  <div className="meta-eyebrow">Feed cards</div>
                  <h3 className="section-heading mt-3 text-[34px] text-content">Compact story cards will populate here from the live feed.</h3>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="page-container mt-8 md:mt-10">
          <div
            className="overflow-hidden rounded-[32px] p-6 md:p-8 text-white shadow-[var(--shadow-4)]"
            style={{ background: 'linear-gradient(135deg, var(--color-primary-deep) 0%, #0f2b3a 100%)' }}
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="meta-eyebrow !text-white/54">Final CTA</div>
                <h2 className="section-heading mt-3 text-[44px] text-white md:text-[68px]">
                  Built for the morning. Designed for the long run.
                </h2>
                <p className="mt-4 max-w-[680px] text-base leading-7 text-white/78">
                  Narvo now has a hero-first public posture, a dock-and-rail app shell, and a calmer reading direction.
                  The next layers of the revamp will extend this system across every authenticated surface.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonPrimary
                  size="landing"
                  icon={<Play size={16} weight="fill" />}
                  onClick={() => navigate(primaryPath)}
                >
                  {primaryLabel}
                </ButtonPrimary>
                <ButtonSecondary
                  size="lg"
                  icon={<Sparkle size={16} weight="fill" />}
                  onClick={() => navigate('/listen')}
                >
                  Hear briefing
                </ButtonSecondary>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default LandingPage;
