// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/en/',
          '/es/',
          '/pricing',
          '/contact',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/dashboard/*',
          '/onboarding/*',
          '/auth/*',
          '/api/*',
          '/csp-test',
          '/_next/*',
          '/socket.io/*',
        ],
      },
      {
        userAgent: 'GPTBot', // OpenAI crawler
        disallow: ['/'], // Opcional: bloquear AI crawlers
      },
      {
        userAgent: 'CCBot', // Common Crawl
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
