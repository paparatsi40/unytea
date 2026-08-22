import { SITE_URL } from "@/lib/site-url";

/**
 * Where to send someone after they sign in.
 *
 * `callbackUrl` arrives in the query string, which means it arrives from
 * whoever wrote the link — including whoever sent the email. Handing it
 * straight to `router.push` makes the login page an open redirect: a link to
 * `/auth/signin?callbackUrl=https://evil.example/login` sends the visitor
 * somewhere else the instant their password is accepted, with the trust of
 * having just authenticated on our domain.
 *
 * So the destination is narrowed to somewhere on this site. Same-origin
 * absolute URLs are accepted and reduced to their path, because that is what
 * they mean; everything else falls back.
 */
export const DEFAULT_CALLBACK_URL = "/dashboard";

export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback: string = DEFAULT_CALLBACK_URL
): string {
  const value = raw?.trim();
  if (!value) return fallback;

  /**
   * `//evil.example` is protocol-relative: the browser reads it as a host, not
   * as a path, and it is the shape that gets missed by a check for a leading
   * slash. `/\evil.example` is the same trick with the other slash, which some
   * parsers normalise.
   */
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;

  if (value.startsWith("/")) return value;

  try {
    const target = new URL(value);
    if (target.origin !== SITE_URL) return fallback;
    return `${target.pathname}${target.search}${target.hash}` || fallback;
  } catch {
    // Not a path and not a URL — a bare word, or something malformed.
    return fallback;
  }
}
