import type { Metadata } from 'next';
import { NewsDetailClient } from './NewsDetailClient';
import { fetchNewsDetailMetadata, getAppMetadataBase } from '@/lib/narvo-api-server';

const SITE_TAGLINE = "The day's biggest stories, turned into a briefing.";

function absoluteOgImage(publicBase: string, imageUrl: unknown): string {
  if (imageUrl == null || String(imageUrl).trim() === '') return `${publicBase}/og-default.png`;
  const s = String(imageUrl).trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return `${publicBase}${s}`;
  return `${publicBase}/${s}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await fetchNewsDetailMetadata(id);
  const metaBase = getAppMetadataBase();
  const rawBase =
    metaBase?.origin ||
    (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') ||
    'https://narvo.news';
  const publicBase = rawBase.replace(/\/$/, '');

  const title = detail?.title?.trim() || 'Story';
  const description = String(
    detail?.short_summary || detail?.summary || SITE_TAGLINE
  ).slice(0, 200);
  const canonicalPath = `/news/${encodeURIComponent(id)}`;
  const canonical = `${publicBase}${canonicalPath}`;
  const ogImage = absoluteOgImage(publicBase, detail?.image_url);

  return {
    title: `${title} — Narvo`,
    description,
    metadataBase: metaBase,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonical,
      siteName: 'Narvo',
      locale: 'en_US',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      site: '@narvo',
    },
  };
}

export default function NewsDetailPage() {
  return <NewsDetailClient />;
}
