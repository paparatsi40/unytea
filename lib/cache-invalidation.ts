import { revalidatePath } from "next/cache";

const LOCALES = ["en", "es", "fr"] as const;

/**
 * Invalidate a route that lives under the `[locale]` segment, across all
 * supported locales. The app's public routes are mounted at `app/[locale]/...`,
 * so a bare `revalidatePath("/c/foo")` never matches `/en/c/foo` etc.
 *
 * Pass `type: "page"` for route patterns with dynamic segments (e.g.
 * `"/c/[slug]"` invalidates ALL slugs). Without a type, `revalidatePath` treats
 * the string as an exact path, so pass a resolved path (real slug values).
 *
 * @example
 * // Route pattern — invalidates every community landing in all 3 locales.
 * revalidateLocalizedPath("/c/[slug]", "page");
 *
 * @example
 * // Exact path — invalidates just this community in all 3 locales.
 * revalidateLocalizedPath(`/c/${slug}`);
 *
 * To add a locale later, update only the `LOCALES` constant here.
 */
export function revalidateLocalizedPath(path: string, type?: "page" | "layout"): void {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}${path}`, type);
  }
}
