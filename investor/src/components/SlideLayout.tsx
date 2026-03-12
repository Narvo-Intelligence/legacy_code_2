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
    <section 
      id={id} 
      className={`slide bg-narvo-bg relative flex flex-col items-center justify-center overflow-hidden ${className}`}
    >
      {/* Swiss Grid Decorative Lines - Optimized for Mobile First */}
      <div className="absolute top-0 bottom-0 left-[10%] md:left-[15%] w-px bg-narvo-structural opacity-10 md:opacity-20 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-[10%] md:right-[15%] w-px bg-narvo-structural opacity-10 md:opacity-20 pointer-events-none" />
      <div className="absolute left-0 right-0 top-[15%] md:top-[20%] h-px bg-narvo-structural opacity-10 md:opacity-20 pointer-events-none" />
      <div className="absolute left-0 right-0 bottom-[15%] md:bottom-[20%] h-px bg-narvo-structural opacity-10 md:opacity-20 pointer-events-none" />

      {/* Slide Number - Large background indicator */}
      {slideNumber && (
        <div
          className="absolute top-4 left-4 md:top-12 md:left-12 font-header text-narvo-primary opacity-[0.05] md:opacity-10 pointer-events-none select-none z-0"
          style={{
            fontSize: 'clamp(4rem, 25vw, 15rem)',
            lineHeight: 0.7
          }}
          aria-hidden="true"
        >
          {slideNumber}
        </div>
      )}

      {/* Main Content Area */}
      <div className="w-full h-full relative z-10 flex flex-col overflow-hidden">
        <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 md:px-12 md:py-16 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </section>
  );
}