import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://weshot.app';
  return ['', '/terms', '/privacy'].map((p) => ({ url: `${site}${p}`, changeFrequency: 'monthly', priority: p === '' ? 1 : 0.3 }));
}
