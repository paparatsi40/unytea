/**
 * The canonical origin of the site.
 *
 * One host, one place. The site answers on both `unytea.com` and
 * `www.unytea.com`, and auth cookies carry the `__Host-` / `__Secure-` prefixes,
 * which pin a cookie to the exact host that set it — no `Domain` attribute is
 * permitted on `__Host-`. So a CSRF or session cookie written on one host is
 * simply absent on the other. That is not a theoretical hazard: it is how
 * logout broke in production, and it can break login or CSRF the same way, at
 * random, depending on which host the visitor happened to land on.
 *
 * The fix is to have exactly one host. `unytea.com` is it; `www` redirects to
 * it at the edge (see `proxy.ts`). Everything the code emits — canonicals,
 * hreflang, Open Graph, sitemap, robots, share links, Stripe return URLs — has
 * to agree, or the redirect just moves the inconsistency somewhere quieter.
 *
 * `NEXT_PUBLIC_APP_URL` still wins when set, because previews and local
 * development legitimately run on other origins. The literal below is only the
 * production fallback.
 */
const CANONICAL_ORIGIN = "https://unytea.com";

/** Origin with no trailing slash, e.g. `https://unytea.com`. */
export const SITE_URL: string = normalizeOrigin(
  process.env.NEXT_PUBLIC_APP_URL || CANONICAL_ORIGIN
);

/** The canonical host, without scheme — e.g. `unytea.com`. */
export const CANONICAL_HOST = "unytea.com";

/** The host being retired. Kept named so the redirect and its test agree. */
export const LEGACY_WWW_HOST = "www.unytea.com";

/**
 * Absolute URL for a path on the canonical origin.
 *
 * Takes a path with or without a leading slash and never emits a double slash
 * or a trailing one — a canonical that differs from the served URL by a slash
 * is not self-referential, which is a bug we have already paid for once.
 */
export function siteUrl(path = ""): string {
  const trimmed = path.replace(/\/+$/, "");
  if (trimmed === "" || trimmed === "/") return SITE_URL;
  return `${SITE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function normalizeOrigin(value: string): string {
  const withoutTrailing = value.trim().replace(/\/+$/, "");
  try {
    return new URL(withoutTrailing).origin;
  } catch {
    return CANONICAL_ORIGIN;
  }
}
