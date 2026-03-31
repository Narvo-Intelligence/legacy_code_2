export interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

const Skeleton = ({ className = '', variant = 'rect' }: SkeletonProps) => {
  const base = 'animate-pulse bg-forest/10';
  if (variant === 'circle') return <div className={`${base} rounded-full ${className}`} />;
  if (variant === 'text') return <div className={`${base} h-4 ${className}`} />;
  return <div className={`${base} ${className}`} />;
};

export const FeaturedSkeleton = () => (
  <div className="narvo-border bg-surface/30 flex flex-col md:flex-row min-h-[320px]">
    <div className="md:w-1/2 bg-forest/5 min-h-[200px]" />
    <div className="flex-1 p-8 flex flex-col justify-between gap-4">
      <div className="space-y-4">
        <Skeleton variant="text" className="w-40 h-3" />
        <Skeleton variant="text" className="w-full h-8" />
        <Skeleton variant="text" className="w-3/4 h-8" />
        <Skeleton variant="text" className="w-full h-4 mt-4" />
        <Skeleton variant="text" className="w-2/3 h-4" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="flex-1 h-12" />
        <Skeleton className="w-12 h-12" />
        <Skeleton className="w-12 h-12" />
      </div>
    </div>
  </div>
);

export const StreamCardSkeleton = () => (
  <div className="p-6 narvo-border-b">
    <div className="flex justify-between mb-3">
      <div className="flex gap-3">
        <Skeleton variant="text" className="w-24 h-4" />
        <Skeleton variant="text" className="w-14 h-4" />
      </div>
      <Skeleton variant="text" className="w-20 h-4" />
    </div>
    <Skeleton variant="text" className="w-full h-6 mb-2" />
    <Skeleton variant="text" className="w-3/4 h-6 mb-3" />
    <Skeleton variant="text" className="w-full h-4" />
    <Skeleton variant="text" className="w-2/3 h-4 mt-1" />
  </div>
);

export const ArticleSkeleton = () => (
  <div className="space-y-6">
    <div className="flex gap-2">
      <Skeleton className="w-20 h-6" />
      <Skeleton className="w-20 h-6" />
    </div>
    <Skeleton variant="text" className="w-full h-12" />
    <Skeleton variant="text" className="w-4/5 h-12" />
    <div className="border-l-2 border-forest/20 pl-6 space-y-2">
      <Skeleton variant="text" className="w-full h-5" />
      <Skeleton variant="text" className="w-3/4 h-5" />
    </div>
    <Skeleton className="w-full h-[400px]" />
    <Skeleton className="w-full h-16" />
    <div className="space-y-3">
      <Skeleton variant="text" className="w-full h-4" />
      <Skeleton variant="text" className="w-full h-4" />
      <Skeleton variant="text" className="w-2/3 h-4" />
    </div>
  </div>
);

export const ListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="narvo-border bg-surface/20 divide-y divide-forest/10">
    {Array.from({ length: count }).map((_, i) => (
      <StreamCardSkeleton key={i} />
    ))}
  </div>
);

export default Skeleton;
