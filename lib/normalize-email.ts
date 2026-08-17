/**
 * One spelling of an address, everywhere.
 *
 * Sign-up stored the email exactly as typed and looked it up the same way,
 * `authorize` looked it up the same way, and only forgot-password lowercased.
 * The three disagreed, so:
 *
 *   - Someone who signed up as `Carlos@X.com` could never reset their password:
 *     forgot-password searched for `carlos@x.com` and found nothing, and the
 *     endpoint returns a generic message either way to avoid leaking whether an
 *     account exists — so the failure was completely silent.
 *   - `Carlos@X.com` and `carlos@x.com` were two rows. The `@unique` constraint
 *     on `User.email` compares bytes, not identities.
 *   - `allowDangerousEmailAccountLinking` on Google did nothing for those
 *     accounts. Linking is by email equality inside @auth/core, which asks the
 *     adapter for `getUserByEmail(profile.email)`. Google sends the address
 *     lowercased, so it never matched a mixed-case row and a second account was
 *     created instead — the exact outcome that flag exists to prevent.
 *
 * The local part of an address is case-sensitive per RFC 5321, so lowercasing
 * it is technically lossy. In practice every mailbox provider treats it
 * case-insensitively, and users do not believe they have two accounts; treating
 * them as one is what people expect and what the OAuth linking already assumes.
 * Nothing here touches plus-addressing or dots — `a+b@x.com` stays distinct
 * from `a@x.com`, because those genuinely can be different mailboxes.
 */

/**
 * The canonical form of an address: trimmed, lowercased.
 *
 * Use it on **both** sides of every User-by-email operation — before writing
 * and before looking up. A normalized write with an un-normalized read is the
 * same bug in a new place.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Same, for the nullable values Prisma and the OAuth profile hand back. */
export function normalizeEmailOrNull(email: string | null | undefined): string | null {
  if (typeof email !== "string") return null;
  const normalized = normalizeEmail(email);
  return normalized.length > 0 ? normalized : null;
}
