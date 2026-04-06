import { BriefingCardSkeleton, ListRowSkeleton, StoryCardSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-[50vh] w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-[1400px] mx-auto">
      <StoryCardSkeleton />
      <BriefingCardSkeleton />
      <ListRowSkeleton count={4} />
    </div>
  );
}
