import { SlideLayout } from '../SlideLayout';
import {
  BookOpenIcon,
  MicIcon,
  Coffee,
  CloudOff
} from 'lucide-react';

export function ProductSlide({ id }: { id: string }) {
  const features = [
    {
      icon: <Coffee className="w-8 h-8 text-narvo-primary mb-4" />,
      title: 'Morning Briefing',
      desc: 'Broadcast-style curation. Single long-form script + audio generated daily at 05:00 WAT.'
    },
    {
      icon: <CloudOff className="w-8 h-8 text-narvo-primary mb-4" />,
      title: 'Offline-First Audio',
      desc: 'IndexedDB blob cache (DB v3) for true offline playback of high-fidelity narratives.'
    },
    {
      icon: <MicIcon className="w-8 h-8 text-narvo-primary mb-4" />,
      title: 'YarnGPT Engine',
      desc: 'Authentic Nigerian-accented TTS (Yoruba, Hausa, Igbo, Pidgin) with OpenAI fallback.'
    },
    {
      icon: <BookOpenIcon className="w-8 h-8 text-narvo-primary mb-4" />,
      title: 'Composite Synthesis',
      desc: 'Multi-source composite story synthesis via Gemini — cross-source narrative arcs.'
    }
  ];

  return (
    <SlideLayout id={id} slideNumber="04">
      <div className="container flex flex-col justify-center h-full max-w-6xl mx-auto">
        <h2
          className="font-header text-narvo-text mb-10 slide-fade-up delay-1 uppercase tracking-tight"
          style={{
            fontSize: 'var(--h2-size)'
          }}
        >
          The Technical Instrument
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`bg-narvo-surface/40 border border-narvo-structural p-6 md:p-8 slide-fade-up delay-${index + 2} hover:border-narvo-primary transition-colors group`}
            >
              <div className="group-hover:scale-110 transition-transform duration-300 w-fit">
                {feature.icon}
              </div>
              <h3
                className="font-header text-narvo-text mb-3 uppercase tracking-wider"
                style={{
                  fontSize: 'var(--h3-size)'
                }}
              >
                {feature.title}
              </h3>
              <p
                className="font-body text-narvo-dimAccessible leading-relaxed"
                style={{
                  fontSize: 'var(--body-size)'
                }}
              >
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}