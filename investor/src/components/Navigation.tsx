import React from 'react';
interface NavigationProps {
  currentSlide: number;
  totalSlides: number;
  slideIds: string[];
}
export function Navigation({
  currentSlide,
  totalSlides,
  slideIds
}: NavigationProps) {
  const scrollToSlide = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };
  return (
    <div className="nav-dots fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
      {slideIds.map((id, index) =>
      <button
        key={id}
        onClick={() => scrollToSlide(id)}
        aria-label={`Go to slide ${index + 1}`}
        className="relative flex items-center justify-center w-12 h-12 group"
        style={{
          minHeight: 'var(--touch-target-min)',
          minWidth: 'var(--touch-target-min)'
        }}>

          <div
          className={`w-2 h-2 transition-all duration-300 ${currentSlide === index ? 'bg-narvo-primary scale-150' : 'bg-narvo-dim/50 group-hover:bg-narvo-dim'}`} />

        </button>
      )}
    </div>);

}