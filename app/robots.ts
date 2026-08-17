import { MetadataRoute } from "next";

import { SITE_URL as BASE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/onboarding/", "/auth/", "/_next/", "/*?*"],
      },
      {
        // Bloquear scrapers de IA conocidos por defecto.
        // Si en el futuro quieres aparecer en Perplexity / ChatGPT search,
        // mueve los que correspondan al primer bloque.
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "Claude-Web"],
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
