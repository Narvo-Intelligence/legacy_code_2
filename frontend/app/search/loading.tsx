import { ListRowSkeleton, SkeletonLine } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-[50vh] w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-3xl mx-auto">
      <SkeletonLine width="100%" height="48px" className="rounded-2xl!" />
      <ListRowSkeleton count={6} />
    </div>
  );
}
