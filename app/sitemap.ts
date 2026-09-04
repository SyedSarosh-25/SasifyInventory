import type { MetadataRoute } from 'next';
import { sitemapEntries } from './seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries();
}
