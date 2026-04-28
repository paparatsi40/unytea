import { MetadataRoute } from "next";
import { getAllPosts } from "@/app/[locale]/blog/posts";
import { getPublicSessionsForSEO } from "@/app/actions/public-sessions";

const BASE_URL = "https://www.unytea.com";
const LOCALES = ["en", "es", "fr"] as const;
const DEFAULT_LOCALE = "en";

// Rutas estáticas indexables que existen bajo /[locale]
const STATIC_PATHS: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "", changeFrequency: "daily", priority: 1.0 },
  { path: "/explore", changeFrequency: "daily", priority: 0.9 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.5 },
  { path: "/documentation", changeFrequency: "weekly", priority: 0.6 },
  { path: "/library", changeFrequency: "weekly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
];

/**
 * Construye la entrada de sitemap incluyendo hreflang `alternates.languages`,
 * con la versión EN como canónica (locale por defecto).
 */
function buildLocalizedEntry(
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    LOCALES.map((l) => [l, `${BASE_URL}/${l}${path}`])
  );

  return LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}${path}`,
    lastModified,
    changeFrequency,
    priority: locale === DEFAULT_LOCALE ? priority : Math.max(0.1, priority - 0.1),
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1. Rutas estáticas en cada locale
  const staticEntries = STATIC_PATHS.flatMap(({ path, changeFrequency, priority }) =>
    buildLocalizedEntry(path, now, changeFrequency, priority)
  );

  // 2. Posts del blog (estáticos en `app/[locale]/blog/posts.ts`)
  const blogPosts = getAllPosts();
  const blogEntries = blogPosts.flatMap((post) => {
    const lastMod = new Date(post.date || now);
    return buildLocalizedEntry(`/blog/${post.slug}`, lastMod, "monthly", 0.7);
  });

  // 3. Sesiones públicas (de la base de datos). Falla suave en build/SSG.
  let sessionEntries: MetadataRoute.Sitemap = [];
  try {
    const sessions = await getPublicSessionsForSEO(200);
    sessionEntries = sessions.flatMap((s) =>
      buildLocalizedEntry(`/s/${s.slug}`, s.updatedAt ?? now, "weekly", 0.6)
    );
  } catch (error) {
    // Durante `next build` puede no haber DB disponible; devolvemos sitemap parcial.
    // Vercel re-genera el sitemap on-demand, así que no afecta a producción.
    console.warn("[sitemap] No se pudieron cargar sesiones públicas:", error);
  }

  return [...staticEntries, ...blogEntries, ...sessionEntries];
}
