import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.neoaipro.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/trends', '/legal/offer', '/legal/privacy'];
  return routes.map((path) => ({
    url: `${APP_URL}${path}`,
    changeFrequency: path === '/trends' ? 'hourly' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));
}
