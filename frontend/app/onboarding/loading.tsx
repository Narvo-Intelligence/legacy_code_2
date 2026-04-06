import { SkeletonLine } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col justify-center gap-6 px-6 max-w-md mx-auto py-12">
      <SkeletonLine width="70%" height="28px" />
      <SkeletonLine width="100%" height="120px" className="rounded-3xl!" />
      <SkeletonLine width="100%" height="48px" className="rounded-full!" />
    </div>
  );
}
