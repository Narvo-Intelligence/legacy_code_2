import { ListRowSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-[50vh] w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4 max-w-3xl mx-auto">
      <ListRowSkeleton count={8} />
    </div>
  );
}
