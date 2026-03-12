import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Maximize2, Moon, Sun, Trees, Cloud, ChevronRight, ChevronLeft } from 'lucide-react';
import logger from '../lib/logger';
import { Navigation } from '../components/Navigation';
import { TitleSlide } from '../components/slides/TitleSlide';
import { VisionSlide } from '../components/slides/VisionSlide';
import { ProblemSlide } from '../components/slides/ProblemSlide';
import { SolutionSlide } from '../components/slides/SolutionSlide';
import { ProductSlide } from '../components/slides/ProductSlide';
import { MarketSlide } from '../components/slides/MarketSlide';
import { BusinessModelSlide } from '../components/slides/BusinessModelSlide';
import { TractionSlide } from '../components/slides/TractionSlide';
import { ExecutionSlide } from '../components/slides/ExecutionSlide';
import { CompetitiveSlide } from '../components/slides/CompetitiveSlide';
import { AskSlide } from '../components/slides/AskSlide';
import { ArchitectureSlide } from '../components/slides/ArchitectureSlide';
import { ApiInsightsSlide } from '../components/slides/ApiInsightsSlide';
import { OpsSlide } from '../components/slides/OpsSlide';

const SLIDES = [
  { id: 'slide-0', Component: TitleSlide },
  { id: 'slide-1', Component: VisionSlide },
  { id: 'slide-2', Component: ArchitectureSlide },
  { id: 'slide-3', Component: ProblemSlide },
  { id: 'slide-4', Component: SolutionSlide },
  { id: 'slide-5', Component: ProductSlide },
  { id: 'slide-6', Component: ApiInsightsSlide },
  { id: 'slide-7', Component: MarketSlide },
  { id: 'slide-8', Component: BusinessModelSlide },
  { id: 'slide-9', Component: TractionSlide },
  { id: 'slide-10', Component: ExecutionSlide },
  { id: 'slide-11', Component: CompetitiveSlide },
  { id: 'slide-12', Component: OpsSlide },
  { id: 'slide-13', Component: AskSlide },
];

type LayoutType = 'vertical' | 'horizontal';
type ThemeType = 'nature' | 'sun' | 'moon' | 'dusk';

export default function PitchDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [layout, setLayout] = useState<LayoutType>('vertical');
  const [theme, setTheme] = useState<ThemeType>('nature');
  const containerRef = useRef<HTMLDivElement>(null);
  const slideIds = SLIDES.map((s) => s.id);

  // Apply theme to root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const scrollToSlide = (index: number) => {
    const targetId = SLIDES[index].id;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'start'
      });
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) return;
      
      let newIndex = currentSlide;
      if (layout === 'vertical') {
        if (e.key === 'ArrowDown' || e.key === ' ') newIndex = Math.min(currentSlide + 1, SLIDES.length - 1);
        else if (e.key === 'ArrowUp') newIndex = Math.max(currentSlide - 1, 0);
      } else {
        if (e.key === 'ArrowRight' || e.key === ' ') newIndex = Math.min(currentSlide + 1, SLIDES.length - 1);
        else if (e.key === 'ArrowLeft') newIndex = Math.max(currentSlide - 1, 0);
      }

      if (newIndex !== currentSlide) {
        e.preventDefault();
        scrollToSlide(newIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, layout]);

  // Handle intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.id.split('-')[1] ?? '0', 10);
            setCurrentSlide(index);
            // Trigger animations for children
            entry.target.querySelectorAll('.slide-fade-up').forEach((el) => {
              el.classList.add('visible');
            });
          }
        });
      },
      { threshold: 0.5, root: containerRef.current }
    );

    document.querySelectorAll('.slide').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [layout]);

  return (
    <div className={`w-full h-full bg-narvo-bg text-narvo-text selection:bg-narvo-primary selection:text-narvo-bg transition-colors duration-500`}>
      {/* Settings Panel */}
      <div className="fixed top-6 left-6 right-24 z-50 flex flex-row justify-between items-start pointer-events-none">
        <div className="pointer-events-auto narvo-glass narvo-border-subtle p-2 flex gap-1 shadow-2xl">
          <button 
            onClick={() => setLayout('vertical')}
            className={`p-2 transition-all ${layout === 'vertical' ? 'bg-narvo-primary text-narvo-bg' : 'text-narvo-dim hover:text-narvo-text'}`}
            title="Vertical Layout"
          >
            <Layout className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setLayout('horizontal')}
            className={`p-2 transition-all ${layout === 'horizontal' ? 'bg-narvo-primary text-narvo-bg' : 'text-narvo-dim hover:text-narvo-text'}`}
            title="Horizontal Layout"
          >
            <Maximize2 className="w-4 h-4 rotate-90" />
          </button>
        </div>

        <div className="pointer-events-auto narvo-glass narvo-border-subtle p-2 flex gap-1 shadow-2xl">
          {(['nature', 'sun', 'moon', 'dusk'] as ThemeType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-2 transition-all ${theme === t ? 'bg-narvo-primary text-narvo-bg' : 'text-narvo-dim hover:text-narvo-text'}`}
              title={`${t.charAt(0).toUpperCase() + t.slice(1)} Theme`}
            >
              {t === 'nature' && <Trees className="w-4 h-4" />}
              {t === 'sun' && <Sun className="w-4 h-4" />}
              {t === 'moon' && <Moon className="w-4 h-4" />}
              {t === 'dusk' && <Cloud className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      <Navigation currentSlide={currentSlide} totalSlides={SLIDES.length} slideIds={slideIds} />

      {/* Slide Navigation Arrows (Horizontal) */}
      {layout === 'horizontal' && (
        <>
          {currentSlide > 0 && (
            <button 
              onClick={() => scrollToSlide(currentSlide - 1)}
              className="fixed left-6 top-1/2 -translate-y-1/2 z-40 p-4 narvo-glass narvo-border-subtle text-narvo-primary hover:scale-110 transition-transform"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {currentSlide < SLIDES.length - 1 && (
            <button 
              onClick={() => scrollToSlide(currentSlide + 1)}
              className="fixed right-20 top-1/2 -translate-y-1/2 z-40 p-4 narvo-glass narvo-border-subtle text-narvo-primary hover:scale-110 transition-transform"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </>
      )}

      <main 
        ref={containerRef}
        className={`deck-container custom-scroll ${layout}`}
      >
        {SLIDES.map(({ id, Component }) => (
          <Component key={id} id={id} />
        ))}
      </main>
    </div>
  );
}
