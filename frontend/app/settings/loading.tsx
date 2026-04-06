import { SkeletonLine } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-[50vh] max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <SkeletonLine width="100%" height="18px" />
      <div className="flex flex-wrap gap-2">
        <SkeletonLine width="88px" height="40px" className="rounded-full!" />
        <SkeletonLine width="120px" height="40px" className="rounded-full!" />
        <SkeletonLine width="72px" height="40px" className="rounded-full!" />
      </div>
      <SkeletonLine width="100%" height="160px" className="rounded-3xl!" />
    </div>
  );
}
