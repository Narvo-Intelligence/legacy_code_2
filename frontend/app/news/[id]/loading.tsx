import { SkeletonLine } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen px-4 sm:px-6 pt-8 pb-32 max-w-3xl mx-auto space-y-6">
      <SkeletonLine width="120px" height="14px" />
      <SkeletonLine width="100%" height="36px" />
      <SkeletonLine width="92%" height="36px" />
      <SkeletonLine width="100%" height="200px" className="rounded-3xl!" />
      <SkeletonLine width="100%" height="88px" className="rounded-3xl!" />
    </div>
  );
}
