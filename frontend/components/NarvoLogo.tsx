import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Narvo wordmark asset (`public/narvo_logo.svg`) — butter shelf mark on brand teal/dark shells.
 * Use inside rounded containers; decorative when paired with visible “Narvo” text (parent sets aria-label).
 */
const MARK_SIZES = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-9 w-9 sm:h-10 sm:w-10',
  header: 'h-10 w-10',
  xl: 'h-11 w-11',
  hero: 'h-16 w-16 sm:h-20 sm:w-20',
} as const;

export type NarvoLogoMarkProps = {
  size?: keyof typeof MARK_SIZES;
  className?: string;
  /** Inner padding as % of box — tight for small header chips */
  inset?: 'none' | 'tight' | 'normal';
};

const INSET: Record<NonNullable<NarvoLogoMarkProps['inset']>, string> = {
  none: 'p-0',
  tight: 'p-[8%]',
  normal: 'p-[14%]',
};

export function NarvoLogoMark({ size = 'md', className, inset = 'normal' }: NarvoLogoMarkProps) {
  return (
    <span className={cn('relative inline-block shrink-0', MARK_SIZES[size], className)} aria-hidden>
      <Image
        src="/narvo_logo.svg"
        alt=""
        fill
        className={cn('object-contain', INSET[inset])}
        unoptimized
        sizes="80px"
      />
    </span>
  );
}
