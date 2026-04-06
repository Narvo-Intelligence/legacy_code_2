import { SkeletonLine } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
      <SkeletonLine width="200px" height="24px" />
      <SkeletonLine width="280px" height="48px" className="rounded-2xl!" />
      <SkeletonLine width="160px" height="14px" />
    </div>
  );
}
