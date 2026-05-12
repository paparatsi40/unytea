import DOMPurify from "isomorphic-dompurify";

/**
 * Hook: force rel="noopener noreferrer" on <a target="_blank"> (and any other
 * target) links.
 *
 * Prevents tab-nabbing where a malicious external page uses window.opener to
 * redirect the parent tab. Without this hook, Tiptap editors that opt into
 * target="_blank" links would create that vulnerability.
 *
 * Registered at module load (DOMPurify hooks are idempotent across imports).
 */
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.nodeName === "A" && node.hasAttribute("target")) {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/**
 * Allowlist of HTML tags safe to render via dangerouslySetInnerHTML.
 *
 * Aligned with Tiptap's default output (the WYSIWYG editor used in the
 * community-builder UI). When extending the editor (e.g., adding tables,
 * mentions, embeds), this allowlist must be updated to match.
 */
const ALLOWED_TAGS = [
  // Structure
  "p", "br", "hr",
  // Inline formatting
  "strong", "em", "u", "s", "code",
  // Headings
  "h1", "h2", "h3", "h4", "h5", "h6",
  // Lists
  "ul", "ol", "li",
  // Block quotes / code blocks
  "blockquote", "pre",
  // Links and images
  "a", "img",
];

/**
 * Allowlist of HTML attributes. DOMPurify's default URI scheme regexp
 * blocks javascript:, vbscript:, and similar dangerous schemes — we
 * trust that default rather than overriding (the default is well-vetted).
 */
const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "target", "rel",
];

/**
 * Sanitizes user-provided HTML for safe rendering via dangerouslySetInnerHTML.
 *
 * Removes script tags, event handlers (onclick, onload, etc.), javascript:
 * and vbscript: URIs, iframe/object/embed tags, and any tag or attribute
 * not in the allowlists above.
 *
 * Designed for HTML produced by the Tiptap WYSIWYG editor. If used on HTML
 * from other sources (e.g., user paste with custom formatting), the output
 * may strip more than expected — that is the intended conservative behavior.
 *
 * @param dirty - Untrusted HTML string from user input
 * @returns Sanitized HTML safe to render via dangerouslySetInnerHTML
 *
 * @example
 *   sanitizeHTML("<p>Hello <script>alert(1)</script></p>")
 *   // => "<p>Hello </p>"
 *
 *   sanitizeHTML('<a href="javascript:alert(1)">click</a>')
 *   // => '<a>click</a>'
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return "";

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
