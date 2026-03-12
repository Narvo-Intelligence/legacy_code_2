import React, { useEffect, useState } from 'react';
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

const SLIDES = [
  { id: 'slide-0', Component: TitleSlide },
  { id: 'slide-1', Component: VisionSlide },
  { id: 'slide-2', Component: ProblemSlide },
  { id: 'slide-3', Component: SolutionSlide },
  { id: 'slide-4', Component: ProductSlide },
  { id: 'slide-5', Component: MarketSlide },
  { id: 'slide-6', Component: BusinessModelSlide },
  { id: 'slide-7', Component: TractionSlide },
  { id: 'slide-8', Component: ExecutionSlide },
  { id: 'slide-9', Component: CompetitiveSlide },
  { id: 'slide-10', Component: AskSlide },
];

export default function PitchDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideIds = SLIDES.map((s) => s.id);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) return;
      e.preventDefault();
      let newIndex = currentSlide;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        newIndex = Math.min(currentSlide + 1, SLIDES.length - 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        newIndex = Math.max(currentSlide - 1, 0);
      }
      if (newIndex !== currentSlide) {
        document.getElementById(SLIDES[newIndex].id)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  // Handle intersection observer for animations and current slide dot
  useEffect(() => {
    const slideObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.id.split('-')[1] ?? '0', 10);
            setCurrentSlide(index);
          }
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll('.slide').forEach((el) => slideObserver.observe(el));

    const animationObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.slide-fade-up').forEach((el) => animationObserver.observe(el));

    return () => {
      slideObserver.disconnect();
      animationObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    logger.debug('[investor] slide', currentSlide);
  }, [currentSlide]);

  return (
    <main className="w-full h-full bg-narvo-bg text-narvo-text font-body selection:bg-narvo-primary selection:text-narvo-bg">
      <Navigation currentSlide={currentSlide} totalSlides={SLIDES.length} slideIds={slideIds} />
      {SLIDES.map(({ id, Component }) => (
        <Component key={id} id={id} />
      ))}
    </main>
  );
}
