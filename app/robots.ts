import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const rawUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bluehillsdesigners.com';
  const baseUrl = rawUrl.replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/checkout', '/cart', '/api', '/reset-password', '/verify-email'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
