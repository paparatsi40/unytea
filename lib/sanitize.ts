import sanitizeHtml from "sanitize-html";

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
 * Per-tag attribute allowlist. sanitize-html requires attributes scoped
 * per tag (unlike DOMPurify's flat list). javascript:/vbscript:/data: URIs
 * are blocked automatically via sanitize-html's allowedSchemes default
 * (['http', 'https', 'ftp', 'mailto']).
 */
const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title"],
};

/**
 * Sanitizes user-provided HTML for safe rendering via dangerouslySetInnerHTML.
 *
 * Replaces isomorphic-dompurify (jsdom-based) with sanitize-html (pure JS
 * parser, no DOM environment needed). Eliminates the jsdom dependency tree
 * which was causing ERR_REQUIRE_ESM crashes in production SSR.
 *
 * Removes script tags (and their contents), event handlers (onclick, etc.),
 * javascript:/vbscript:/data: URIs, iframe/object/embed tags, and any tag
 * or attribute not in the allowlists above.
 *
 * The transformTags hook on <a> forces rel="noopener noreferrer" when
 * the target attribute is present (prevents tab-nabbing via window.opener).
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

  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // sanitize-html defaults already block javascript:, vbscript:, data:
    // and other dangerous schemes via allowedSchemes / allowedSchemesAppliedToAttributes.
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target) {
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
    },
  });
}
