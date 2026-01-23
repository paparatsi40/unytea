// app/sitemap.ts
import { MetadataRoute } from 'next';
import { locales } from '@/i18n';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Páginas estáticas públicas
  const publicPages = [
    '', // home
    '/pricing',
    '/contact',
    '/privacy',
    '/terms',
  ];

  // Generar URLs para cada idioma
  const urls: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    publicPages.forEach((page) => {
      urls.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : 0.8,
      });
    });
  });

  // TODO: Agregar páginas dinámicas de comunidades públicas
  // Si tienes comunidades públicas, puedes agregar:
  // const communities = await prisma.community.findMany({ where: { isPublic: true } });
  // communities.forEach((community) => {
  //   urls.push({
  //     url: `${baseUrl}/c/${community.slug}`,
  //     lastModified: community.updatedAt,
  //     changeFrequency: 'daily',
  //     priority: 0.7,
  //   });
  // });

  return urls;
}
