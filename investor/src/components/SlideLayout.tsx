import React from 'react';
interface SlideLayoutProps {
  children: React.ReactNode;
  slideNumber?: string;
  id: string;
  className?: string;
}
export function SlideLayout({
  children,
  slideNumber,
  id,
  className = ''
}: SlideLayoutProps) {
  return (
    <section id={id} className={`slide bg-narvo-bg ${className}`}>
      {/* Swiss Grid Decorative Lines */}
      <div className="decorative absolute top-0 bottom-0 left-[15%] w-px bg-narvo-structural opacity-20 pointer-events-none" />
      <div className="decorative absolute top-0 bottom-0 right-[15%] w-px bg-narvo-structural opacity-20 pointer-events-none" />
      <div className="decorative absolute left-0 right-0 top-[20%] h-px bg-narvo-structural opacity-20 pointer-events-none" />
      <div className="decorative absolute left-0 right-0 bottom-[20%] h-px bg-narvo-structural opacity-20 pointer-events-none" />

      {/* Slide Number */}
      {slideNumber &&
      <div
        className="absolute top-8 left-8 md:top-12 md:left-12 font-header text-narvo-dim opacity-20 pointer-events-none select-none z-0"
        style={{
          fontSize: 'clamp(3rem, 10vw, 8rem)',
          lineHeight: 0.8
        }}
        aria-hidden="true">

          {slideNumber}
        </div>
      }

      {/* Content Wrapper */}
      <div className="slide-content">{children}</div>
    </section>);

}