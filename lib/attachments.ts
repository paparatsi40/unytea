import { z } from "zod";

/**
 * Attachment URLs, validated once, in one place.
 *
 * `createPost` took `JSON.parse(formData.get("attachments"))` and wrote it to
 * the database cast to `never` — no schema at all. `PremiumPostCard` renders
 * each one as `<a href={attachment.url}>`, and React does not sanitize `href`:
 * it warns about a `javascript:` URL in development and renders it anyway. So a
 * member could store `{"url":"javascript:…"}` and any reader who clicked the
 * attachment executed script on our origin, with their session. The identical
 * shape existed in direct messages, where `MessageBubble` renders the same
 * `<a href>` from a list of strings bounded only by length.
 *
 * This is the same class as SEC-10, the stored XSS through JSON-LD, and it is
 * closed the same way: one validator every write path goes through, plus a
 * belt-and-braces check at render, because the database already contains rows
 * written before this existed.
 *
 * Only absolute http/https URLs pass. Everything else is rejected —
 * `javascript:`, `data:`, `vbscript:`, `file:`, and protocol-relative `//host`
 * forms, which `new URL()` cannot parse without a base and which would inherit
 * the page's scheme.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * True only for an absolute URL on http or https.
 *
 * Used by the Zod refinements below and directly by renderers, which must not
 * trust rows written before validation existed.
 */
export function isSafeAttachmentUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  // `new URL` rejects the protocol-relative "//evil.test/x" form outright, and
  // normalises the whitespace tricks the same way a browser's href parser does
  // — leading spaces and embedded newlines in "  java\nscript:alert(1)" are
  // stripped before the scheme is read, so the protocol check below sees the
  // same scheme the browser would act on rather than a string that merely
  // looks different.
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  return ALLOWED_PROTOCOLS.has(parsed.protocol);
}

/** A single attachment URL. */
export const attachmentUrlSchema = z
  .string()
  .min(1)
  .max(2000)
  .refine(isSafeAttachmentUrl, { message: "Attachment URL must be http or https" });

/** The `{ url, name, type }` shape posts store as a JSON array. */
export const postAttachmentSchema = z.object({
  url: attachmentUrlSchema,
  name: z.string().max(300).optional(),
  type: z.enum(["image", "document", "media"]).optional(),
});

export const postAttachmentsSchema = z.array(postAttachmentSchema).max(20);

/** The bare list of URLs direct messages and channels store. */
export const attachmentUrlListSchema = z.array(attachmentUrlSchema).max(20);

export type PostAttachment = z.infer<typeof postAttachmentSchema>;
