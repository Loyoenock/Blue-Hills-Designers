import { MetadataRoute } from 'next';
import { getAllProductsForSitemap } from '../lib/getAllProducts';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rawUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bluehillsdesigners.com';
  const baseUrl = rawUrl.replace(/\/$/, '');

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const products = await getAllProductsForSitemap();

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/product/${product.id}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
