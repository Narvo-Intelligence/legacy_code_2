/**
 * Category-specific images for news cards.
 * Maps news categories/tags to themed stock photos from Unsplash/Pexels.
 */

const CATEGORY_IMAGES: Record<string, string[]> = {
  politics: [
    'https://images.unsplash.com/photo-1755756383827-95a69fbee439?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1735886161697-b868f22f7dcd?w=600&h=400&fit=crop',
  ],
  tech: [
    'https://images.unsplash.com/photo-1528901166007-3784c7dd3653?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1684337399050-0412ebed8005?w=600&h=400&fit=crop',
  ],
  sports: [
    'https://images.unsplash.com/photo-1694124087597-e27496da7e98?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1706345832298-6d2be382a378?w=600&h=400&fit=crop',
  ],
  finance: [
    'https://images.unsplash.com/photo-1646924095921-ee83d7d69974?w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  ],
  business: [
    'https://images.unsplash.com/photo-1646924095921-ee83d7d69974?w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/7876445/pexels-photo-7876445.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  ],
  culture: [
    'https://images.unsplash.com/photo-1764670085286-55cd79507a72?w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/18198595/pexels-photo-18198595.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  ],
  afrobeats: [
    'https://images.unsplash.com/photo-1764670085286-55cd79507a72?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1676156787191-c055f62e9771?w=600&h=400&fit=crop',
  ],
  health: [
    'https://images.pexels.com/photos/34185205/pexels-photo-34185205.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/5593681/pexels-photo-5593681.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  ],
  environment: [
    'https://images.unsplash.com/photo-1647891684895-15c5b831fde1?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1759252973882-d33c8a3b3b2e?w=600&h=400&fit=crop',
  ],
  education: [
    'https://images.unsplash.com/photo-1528901166007-3784c7dd3653?w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/9432947/pexels-photo-9432947.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  ],
  general: [
    'https://images.unsplash.com/photo-1647891684895-15c5b831fde1?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1646924095921-ee83d7d69974?w=600&h=400&fit=crop',
  ],
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCategoryImage(category: string | undefined | null, articleId = ''): string {
  const normalizedCategory = (category ?? 'general').toLowerCase().replace(/[#\s]/g, '');
  const matchedKey =
    Object.keys(CATEGORY_IMAGES).find((key) => normalizedCategory.includes(key)) ?? 'general';
  const images = CATEGORY_IMAGES[matchedKey];
  const index = hashCode(articleId || normalizedCategory) % images.length;
  return images[index];
}

const CATEGORY_COLORS: Record<string, string> = {
  politics: 'from-red-900/60 to-red-950/80',
  tech: 'from-cyan-900/60 to-cyan-950/80',
  sports: 'from-green-900/60 to-green-950/80',
  finance: 'from-amber-900/60 to-amber-950/80',
  business: 'from-amber-900/60 to-amber-950/80',
  culture: 'from-purple-900/60 to-purple-950/80',
  afrobeats: 'from-pink-900/60 to-pink-950/80',
  health: 'from-teal-900/60 to-teal-950/80',
  environment: 'from-emerald-900/60 to-emerald-950/80',
  education: 'from-blue-900/60 to-blue-950/80',
  general: 'from-forest/60 to-background-dark/80',
};

export function getCategoryColor(category: string | undefined | null): string {
  const normalizedCategory = (category ?? 'general').toLowerCase().replace(/[#\s]/g, '');
  const matchedKey =
    Object.keys(CATEGORY_COLORS).find((key) => normalizedCategory.includes(key)) ?? 'general';
  return CATEGORY_COLORS[matchedKey];
}
