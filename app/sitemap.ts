import { MetadataRoute } from "next";
import { getPublicSessionsForSEO } from "@/app/actions/public-sessions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.unytea.com";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/communities`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  // Dynamic session routes
  const sessions = await getPublicSessionsForSEO(100);
  const sessionRoutes: MetadataRoute.Sitemap = sessions.map((session) => ({
    url: `${baseUrl}/s/${session.slug}`,
    lastModified: session.scheduledAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...sessionRoutes];
}
